"""
USDA Pennsylvania Grain Bids Scraper
Fetches real local elevator bids from USDA AMS Reports
Source: https://www.ams.usda.gov/mnreports/ams_3091.pdf
"""

import requests
import re
import pdfplumber
from io import BytesIO
from datetime import datetime
import pandas as pd

class USDAGrainBidScraper:
    """
    Scrapes Pennsylvania grain elevator bids from USDA AMS reports
    """
    
    # USDA Report URL for Pennsylvania Grain Bids
    REPORT_URL = "https://www.ams.usda.gov/mnreports/ams_3091.pdf"
    
    def fetch_latest_report(self):
        """
        Download the latest Pennsylvania Grain Bids PDF from USDA
        """
        try:
            response = requests.get(self.REPORT_URL, timeout=10)
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
    
    def get_local_bids(self, crop, region='central'):
        """
        Get local elevator bids for a specific crop and region
        
        Args:
            crop: 'corn', 'soybeans', or 'wheat'
            region: 'east', 'west', or 'central' Pennsylvania
        
        Returns:
            Dictionary with bid data
        """
        try:
            # Fetch PDF
            pdf_data = self.fetch_latest_report()
            if not pdf_data:
                return None
            
            # Extract text from PDF
            with pdfplumber.open(pdf_data) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text()
            
            # Parse based on crop
            if crop.lower() == 'corn':
                bids = self.parse_corn_bids(text)
            elif crop.lower() in ['soybeans', 'soybean']:
                bids = self.parse_soybean_bids(text)
            elif crop.lower() == 'wheat':
                bids = self.parse_wheat_bids(text)
            else:
                return None
            
            # Return data for requested region
            region = region.lower()
            if region in bids and bids[region]['avg'] is not None:
                return {
                    'crop': crop,
                    'region': region,
                    'low': bids[region]['low'],
                    'high': bids[region]['high'],
                    'average': bids[region]['avg'],
                    'source': 'USDA AMS PA Grain Bids',
                    'date': datetime.now().strftime('%Y-%m-%d')
                }
            
            return None
            
        except Exception as e:
            print(f"Error parsing USDA bids: {e}")
            return None
    
    def get_all_regional_bids(self, crop):
        """Get bids for all PA regions"""
        regions = ['east', 'west', 'central']
        all_bids = []
        
        for region in regions:
            bid = self.get_local_bids(crop, region)
            if bid:
                all_bids.append(bid)
        
        return all_bids
    
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
