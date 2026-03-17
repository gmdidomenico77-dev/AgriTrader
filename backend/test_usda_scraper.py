"""Test script for USDA scraper"""

from usda_pa_grain_scraper import usda_scraper
import pdfplumber
import json

print("=" * 60)
print("USDA PA Grain Bids Scraper Test")
print("=" * 60)

# Test 1: Fetch PDF
print("\n1. Fetching PDF...")
pdf_data = usda_scraper.fetch_latest_report()
if pdf_data:
    print("   [OK] PDF fetched successfully")
else:
    print("   [ERROR] Failed to fetch PDF")
    exit(1)

# Test 2: Extract text
print("\n2. Extracting text from PDF...")
try:
    with pdfplumber.open(pdf_data) as pdf:
        text = ""
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text()
            text += page_text
            print(f"   Page {i+1}: {len(page_text)} characters")
    
    print(f"   [OK] Total text extracted: {len(text)} characters")
    
    # Save for inspection
    with open('usda_report_text.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("   [OK] Saved to usda_report_text.txt")
    
except Exception as e:
    print(f"   [ERROR] Error extracting text: {e}")
    exit(1)

# Test 3: Parse corn bids
print("\n3. Parsing corn bids...")
corn_bids = usda_scraper.parse_corn_bids(text)
print(f"   East: {corn_bids['east']}")
print(f"   West: {corn_bids['west']}")
print(f"   Central: {corn_bids['central']}")

# Test 4: Get specific bid
print("\n4. Testing get_local_bids()...")
for crop in ['corn', 'soybeans', 'wheat']:
    for region in ['east', 'west', 'central']:
        result = usda_scraper.get_local_bids(crop, region)
        if result:
            print(f"   [OK] {crop.capitalize()} ({region}): ${result['average']}/bu")
        else:
            print(f"   [MISS] {crop.capitalize()} ({region}): No data")

# Test 5: Get statewide average
print("\n5. Testing statewide averages...")
for crop in ['corn', 'soybeans', 'wheat']:
    result = usda_scraper.get_statewide_average(crop)
    if result:
        print(f"   [OK] {crop.capitalize()}: ${result['statewide_average']}/bu")
        print(f"      Regions: {len(result['regional_detail'])}")
    else:
        print(f"   [MISS] {crop.capitalize()}: No data")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
