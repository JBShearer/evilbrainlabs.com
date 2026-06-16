#!/usr/bin/env python3
# Quick test - generate 10 items to verify it works
import sys
sys.path.insert(0, '.')
from generate_items import GameContentGenerator

# Use environment variable or prompt
import os
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("Set ANTHROPIC_API_KEY environment variable")
    sys.exit(1)

print("Testing generation with 10 items...")
gen = GameContentGenerator(api_key, "../game/data")

# Generate 10 gray vending items
items = gen.generate_items_batch("vending", "gray", 10)
gen.save_items(items, "vending", "gray_test")

print(f"\n✓ Generated {len(items)} test items")
print("\nSample item:")
import json
print(json.dumps(items[0], indent=2))
