"""
USDA Pennsylvania Grain Bids Scraper
Fetches real local elevator bids from USDA AMS Reports
Source: https://www.ams.usda.gov/mnreports/ams_3091.pdf
"""

import requests
import re
import time
import pdfplumber
from io import BytesIO
from datetime import datetime
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

class USDAGrainBidScraper:
    """
    Scrapes Pennsylvania grain elevator bids from USDA AMS reports
    """

    REPORT_URL = "https://www.ams.usda.gov/mnreports/ams_3091.pdf"

    # Cache parsed bid data for 12 hours (report is published weekly)
    _bid_cache: dict = {}       # crop -> {region -> bid_dict}
    _cache_ts: float = 0.0
    _CACHE_TTL: float = 43200   # 12 hours in seconds

    def _make_session(self):
        """Return a requests Session with retries disabled and a hard 5-second timeout."""
        session = requests.Session()
        adapter = HTTPAdapter(max_retries=Retry(total=0))  # no retries whatsoever
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def fetch_latest_report(self):
        """Download the latest Pennsylvania Grain Bids PDF from USDA."""
        try:
            session = self._make_session()
            response = session.get(self.REPORT_URL, timeout=5)
            response.raise_for_status()
            return BytesIO(response.content)
        except Exception as e:
            print(f"Error fetching USDA report: {e}")
            return None

    def _parse_bids_from_section(self, section_text, price_min, price_max):
        """
        Generic bid parser for any crop section.

        Extracts East/West/Central CURRENT-delivery average prices.

        Handles both:
          - Range format:  "East Bid ... 4.9300-5.7700 ... 5.3380 5.4025 DLVD-T Current"
          - Single format: "Central Bid ... 11.1800 DN ... 11.1800 9.9600 DLVD-T Current"

        Key insight: the two decimal numbers immediately before "DLVD" on a Current
        delivery line are always [avg] [year_ago].  Greedy [^\n]+ backtracks from
        the right to find them reliably regardless of the line's leading basis text.
        """
        bids = {
            'east':    {'low': None, 'high': None, 'avg': None},
            'west':    {'low': None, 'high': None, 'avg': None},
            'central': {'low': None, 'high': None, 'avg': None},
        }

        # Greedy [^\n]+ forces backtracking from line end so groups 2/3 always
        # capture the last two full decimal numbers before DLVD (avg and year_ago).
        # (?<!\d) (negative lookbehind) prevents [^\n]+ from stopping mid-number
        # — e.g., it can't split "11.7300" into "1" + "1.7300".
        # [\d]+\.[\d]+ (requires a decimal point) prevents matching a bare digit.
        # [^\n]*Current ensures we only grab current-delivery lines, not New Crop.
        bid_pattern = (
            r'(East|West|Central)\s+Bid(?:\s+Ordinary)?'
            r'[^\n]+(?<!\d)([\d]+\.[\d]+)\s+([\d]+\.[\d]+)\s+DLVD[^\n]*Current'
        )

        for match in re.finditer(bid_pattern, section_text, re.IGNORECASE):
            region = match.group(1).lower()
            avg = float(match.group(2))

            if not (price_min < avg < price_max):
                continue

            # Try to extract a low-high range from the line (both values must be
            # in the valid price band to exclude basis/change numbers like 50.00K).
            low = high = avg
            for range_m in re.finditer(r'([\d.]+)-([\d.]+)', match.group(0)):
                lo = float(range_m.group(1))
                hi = float(range_m.group(2))
                if price_min < lo < price_max and price_min < hi < price_max and lo <= hi:
                    low, high = lo, hi
                    break

            # Only take the first (Current) match per region; later lines are New Crop
            if bids[region]['avg'] is None:
                bids[region] = {'low': low, 'high': high, 'avg': avg}

        return bids

    def parse_corn_bids(self, text):
        """Parse corn prices from PDF text"""
        section_match = re.search(
            r'US #2 Yellow Corn.*?(?=US #1 Soybeans)',
            text, re.DOTALL | re.IGNORECASE
        )
        section = section_match.group(0) if section_match else text
        return self._parse_bids_from_section(section, 2.0, 10.0)

    def parse_soybean_bids(self, text):
        """Parse soybean prices from PDF text"""
        section_match = re.search(
            r'US #1 Soybeans.*?(?=US #1 Soft Red Winter Wheat)',
            text, re.DOTALL | re.IGNORECASE
        )
        section = section_match.group(0) if section_match else text
        return self._parse_bids_from_section(section, 7.0, 20.0)

    def parse_wheat_bids(self, text):
        """Parse wheat prices from PDF text"""
        section_match = re.search(
            r'US #1 Soft Red Winter Wheat.*?(?=Explanatory Notes|$)',
            text, re.DOTALL | re.IGNORECASE
        )
        section = section_match.group(0) if section_match else text
        return self._parse_bids_from_section(section, 3.0, 12.0)

    def _refresh_cache(self):
        """Fetch + parse the USDA report, update _bid_cache. Returns True on success."""
        pdf_data = self.fetch_latest_report()
        if not pdf_data:
            return False
        try:
            with pdfplumber.open(pdf_data) as pdf:
                text = "".join(page.extract_text() or "" for page in pdf.pages)
            self._bid_cache = {
                'corn':     self.parse_corn_bids(text),
                'soybeans': self.parse_soybean_bids(text),
                'wheat':    self.parse_wheat_bids(text),
            }
            self._cache_ts = time.time()
            print(f"[USDA] Report parsed and cached.")
            print(f"[USDA] Corn bids: {self._bid_cache['corn']}")
            print(f"[USDA] Soybean bids: {self._bid_cache['soybeans']}")
            print(f"[USDA] Wheat bids: {self._bid_cache['wheat']}")
            return True
        except Exception as e:
            print(f"Error parsing USDA report: {e}")
            return False

    def get_local_bids(self, crop, region='central'):
        """
        Get local elevator bids for a specific crop and region.

        Results are cached for 12 hours so every prediction doesn't trigger a
        network round-trip to USDA.  If the cache is stale and a fresh fetch
        fails, the stale data is returned rather than blocking.
        """
        # Refresh cache if empty or older than TTL
        if not self._bid_cache or (time.time() - self._cache_ts) > self._CACHE_TTL:
            self._refresh_cache()
            # If still empty after attempted refresh, give up
            if not self._bid_cache:
                return None

        crop_key = 'soybeans' if crop.lower() in ('soybeans', 'soybean') else crop.lower()
        bids = self._bid_cache.get(crop_key)
        if not bids:
            return None

        region = region.lower()
        if region in bids and bids[region]['avg'] is not None:
            return {
                'crop': crop,
                'region': region,
                'low': bids[region]['low'],
                'high': bids[region]['high'],
                'average': bids[region]['avg'],
                'source': 'USDA AMS PA Grain Bids',
                'date': datetime.now().strftime('%Y-%m-%d'),
            }
        return None

    def get_all_regional_bids(self, crop):
        """Get bids for all PA regions (single cache fetch)."""
        return [b for b in (self.get_local_bids(crop, r) for r in ('east', 'central', 'west')) if b]

    def get_statewide_average(self, crop):
        """Calculate PA statewide average from regional bids"""
        regional_bids = self.get_all_regional_bids(crop)

        if not regional_bids:
            return None

        avg_price = sum(bid['average'] for bid in regional_bids) / len(regional_bids)

        return {
            'crop': crop,
            'statewide_average': round(avg_price, 2),
            'regional_detail': regional_bids,
            'date': datetime.now().strftime('%Y-%m-%d')
        }

# Singleton instance
usda_scraper = USDAGrainBidScraper()
