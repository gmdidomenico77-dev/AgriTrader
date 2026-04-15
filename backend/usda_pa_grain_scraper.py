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
    
    def parse_corn_bids(self, text):
        """Parse corn prices from PDF text"""
        bids = {
            'east': {'low': None, 'high': None, 'avg': None},
            'west': {'low': None, 'high': None, 'avg': None},
            'central': {'low': None, 'high': None, 'avg': None}
        }
        
        # Pattern matches: Region Bid ... low-high ... average ... DLVD
        # Example: East Bid 10.00Z to 40.00Z UNCH-UP 5.00 4.2975-4.5975 UP 0.0425-UP 0.0925 4.4475 4.5775 DLVD-T Current
        corn_pattern = r'(East|West|Central)\s+Bid.*?([\d.]+)-([\d.]+).*?([\d.]+)\s+[\d.]+\s+DLVD'
        
        for match in re.finditer(corn_pattern, text, re.IGNORECASE):
            region = match.group(1).lower()
            low = float(match.group(2))
            high = float(match.group(3))
            avg = float(match.group(4))
            
            # Only accept if in reasonable corn price range
            if 2.0 < avg < 10.0:
                bids[region] = {'low': low, 'high': high, 'avg': avg}
        
        return bids
    
    def parse_soybean_bids(self, text):
        """Parse soybean prices from PDF text"""
        bids = {
            'east': {'low': None, 'high': None, 'avg': None},
            'west': {'low': None, 'high': None, 'avg': None},
            'central': {'low': None, 'high': None, 'avg': None}
        }
        
        # Find soybeans section first
        soy_section = re.search(r'US #1 Soybeans.*?Country Elevators - Organic', text, re.DOTALL | re.IGNORECASE)
        
        if soy_section:
            section_text = soy_section.group(0)
            # Pattern: Region Bid ... low-high ... average
            # Example: East Bid -40.00X to -25.00X UNCH-DN 5.00 9.8200-9.9700 UP 0.2025-UP 0.1525 9.8950 DLVD-T Current
            soy_pattern = r'(East|West|Central)\s+Bid.*?([\d.]+)-([\d.]+).*?([\d.]+)\s+DLVD'
            
            for match in re.finditer(soy_pattern, section_text, re.IGNORECASE):
                region = match.group(1).lower()
                low = float(match.group(2))
                high = float(match.group(3))
                avg = float(match.group(4))
                
                # Only accept if in reasonable soybean price range
                if 7.0 < avg < 20.0:
                    bids[region] = {'low': low, 'high': high, 'avg': avg}
        
        return bids
    
    def parse_wheat_bids(self, text):
        """Parse wheat prices from PDF text"""
        bids = {
            'east': {'low': None, 'high': None, 'avg': None},
            'west': {'low': None, 'high': None, 'avg': None},
            'central': {'low': None, 'high': None, 'avg': None}
        }
        
        # Find wheat section
        wheat_section = re.search(r'US #1 Soft Red Winter Wheat.*?Country Elevators - Organic', text, re.DOTALL | re.IGNORECASE)
        
        if wheat_section:
            section_text = wheat_section.group(0)
            # Pattern: Region Bid Ordinary ... low-high ... average
            # Example: East Bid Ordinary -75.00Z to 85.00Z UP 5.00 4.3175-5.9175 UP 0.0375 5.0008 5.7600 DLVD-T Current
            wheat_pattern = r'(East|West|Central)\s+Bid\s+Ordinary.*?([\d.]+)-([\d.]+).*?([\d.]+)\s+[\d.]+\s+DLVD'
            
            for match in re.finditer(wheat_pattern, section_text, re.IGNORECASE):
                region = match.group(1).lower()
                low = float(match.group(2))
                high = float(match.group(3))
                avg = float(match.group(4))
                
                # Only accept if in reasonable wheat price range
                if 3.0 < avg < 12.0:
                    bids[region] = {'low': low, 'high': high, 'avg': avg}
        
        return bids
    
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
        
        # Calculate weighted average (you could weight by region if you have data)
        avg_price = sum(bid['average'] for bid in regional_bids) / len(regional_bids)
        
        return {
            'crop': crop,
            'statewide_average': round(avg_price, 2),
            'regional_detail': regional_bids,
            'date': datetime.now().strftime('%Y-%m-%d')
        }

# Singleton instance
usda_scraper = USDAGrainBidScraper()
