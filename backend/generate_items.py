#!/usr/bin/env python3
"""
Generate game content using Claude API
Pre-generates hundreds of items and company messages with rich backstories
"""

import anthropic
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
import sys


class GameContentGenerator:
    def __init__(self, api_key: str, output_dir: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_items_batch(
        self,
        category: str,
        rarity: str,
        count: int,
        theme: str = "corporate dystopia"
    ) -> List[Dict]:
        """Generate a batch of items with Claude"""

        # Set price ranges by rarity
        price_ranges = {
            "gray": (50, 150),
            "green": (150, 300),
            "blue": (300, 600),
            "purple": (600, 1000),
            "gold": (1000, 2000)
        }

        min_price, max_price = price_ranges[rarity]

        prompt = f"""Generate {count} unique items for an absurdist corporate dystopia game called Evil Brain Labs.

Category: {category} (vending machine, company store, or craftable)
Rarity: {rarity} (gray=common, green=uncommon, blue=rare, purple=epic, gold=legendary)
Theme: {theme}
Price range: {min_price}-{max_price} company scrip

Each item must have:
1. id: string (unique, format: {category}_{rarity}_{{item_name_snake_case}})
2. name: string (creative, funny, on-brand - 2-5 words)
3. backstory: string (2-3 sentences of dark corporate humor about the item's origin/purpose)
4. price: integer (between {min_price} and {max_price})
5. effect: string (for consumables: "productivity+X" or "chaos-X" or "unlock_X", for others: "none")
6. attributes: dict with 3-5 unique properties (be creative - sentience levels, union status, temporal anomalies, etc.)
7. loreConnections: list of 1-3 narrative references (use: "employee_negative_one", "the_brain", "coffee_uprising_2024", "time_loops", "robot_farm")

Style guide:
- Dark corporate humor (Office Space meets Black Mirror meets The Stanley Parable)
- Items should feel like they exist in a sentient office building run by a floating brain
- Some items should be absurd (AI-powered staplers, quantum coffee, sentient printers)
- Include backstories referencing company lore (Employee #-1, time loops, The Brain's demands)
- Higher rarity = weirder and more self-aware

Examples of good item names:
- "Sentient Coffee (Demands Union Rights)"
- "Quantum Stapler (Exists and Doesn't)"
- "AI-Powered Resignation Letter Generator"
- "Blockchain-Verified Despair"

Return a valid JSON array of exactly {count} items. Each item should be a complete object."""

        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                temperature=0.9,  # High creativity
                messages=[{"role": "user", "content": prompt}]
            )

            # Extract JSON from response
            content = message.content[0].text

            # Claude sometimes wraps JSON in markdown, remove that
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            items = json.loads(content.strip())

            # Add metadata and derived fields
            for item in items:
                item["category"] = category
                item["rarity"] = rarity
                item["type"] = self.infer_type(category, item)
                item["tradeValue"] = int(item["price"] * 0.5)

                # Ensure stock is null for infinite items
                if "stock" not in item:
                    item["stock"] = None

                item["metadata"] = {
                    "generatedBy": "claude-3-5-sonnet-20241022",
                    "generatedAt": datetime.utcnow().isoformat() + "Z",
                    "version": "1.0",
                    "theme": theme
                }

                # Set unlock conditions based on rarity
                unlock = self.generate_unlock_conditions(rarity)
                if unlock:
                    item["unlockConditions"] = unlock

            return items

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON for {category}_{rarity}: {e}")
            print(f"Response was: {content[:500]}...")
            return []
        except Exception as e:
            print(f"❌ Error generating {category}_{rarity}: {e}")
            return []

    def infer_type(self, category: str, item: Dict) -> str:
        """Infer item type from effect and category"""
        effect = item.get("effect", "").lower()
        name = item.get("name", "").lower()

        if "productivity" in effect or "chaos" in effect:
            return "consumable"
        elif "unlock" in effect:
            return "access"
        elif category == "vending":
            if "mystery" in name:
                return "mystery"
            else:
                return "consumable"
        elif "keycard" in name or "badge" in name:
            return "access"
        elif "mystery" in name or "box" in name:
            return "mystery"
        else:
            return "junk"

    def generate_unlock_conditions(self, rarity: str) -> Dict:
        """Generate unlock conditions based on rarity"""
        if rarity == "gray" or rarity == "green":
            return None  # Common items have no unlock conditions

        conditions = {}

        if rarity == "blue":
            conditions["minJobLevel"] = 5
        elif rarity == "purple":
            conditions["minJobLevel"] = 10
            conditions["narrativeNode"] = "product_cycle_10"
        elif rarity == "gold":
            conditions["minJobLevel"] = 15
            conditions["narrativeNode"] = "retirement_question"
            conditions["requiredAchievements"] = ["100_products_shipped"]

        return conditions

    def generate_company_messages(
        self,
        quarter: str,  # "2026_q1"
        count: int = 90  # ~90 messages per quarter
    ) -> List[Dict]:
        """Generate company chat messages for a quarter"""

        year, q = quarter.split("_q")

        prompt = f"""Generate exactly {count} corporate office chat messages for Q{q} {year}.

Messages simulate an absurdist corporate Slack/Teams channel at Evil Brain Labs with these speakers:
- THE BRAIN (CEO, all caps, ominous, makes impossible demands)
- Craig (middle manager, enthusiastic, oblivious to dystopia)
- Rob (security camera, surveils everything, privacy violations)
- Alex (AI assistant, helpful but sinister undertones)
- The Plug (unplugs things randomly, chaotic neutral)
- Mobile App (crashes constantly, apologetic)

Each message needs:
1. speaker: string (exact name from list above)
2. message: string (1-2 sentences of on-brand dark humor)
3. context: string (monday_morning, project_deadline, friday_afternoon, bug_crisis, or random)
4. sentiment: string (positive, neutral, tense, or chaotic)
5. timestamp: ISO datetime string in Q{q} {year}

Context guidelines:
- monday_morning: bleary, coffee-dependent, existential dread
- project_deadline: tense, urgent, panic
- friday_afternoon: relaxed, weekend talk, escape fantasy
- bug_crisis: panicked, blame-shifting, fires everywhere
- random: normal office absurdism

Style:
- Dark corporate humor, references to ongoing "synergy initiatives"
- Some messages hint at larger mysteries (Employee #-1, time loops, The Brain's origin)
- Variety in tone - not all jokes, some mundane, some ominous
- THE BRAIN should be demanding and use corporate buzzwords incorrectly
- Craig should be inappropriately cheerful
- Rob should casually mention surveillance violations

Generate {count} messages in chronological order spanning the quarter. Return as JSON array."""

        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                temperature=0.8,
                messages=[{"role": "user", "content": prompt}]
            )

            content = message.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            messages = json.loads(content.strip())

            # Ensure timestamps are distributed across the quarter
            start_date = datetime(int(year), (int(q) - 1) * 3 + 1, 1)
            end_date = start_date + timedelta(days=90)

            for i, msg in enumerate(messages):
                # Distribute timestamps evenly
                timestamp = start_date + timedelta(days=i)
                msg["timestamp"] = timestamp.isoformat() + "Z"

            return messages

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON for messages {quarter}: {e}")
            return []
        except Exception as e:
            print(f"❌ Error generating messages {quarter}: {e}")
            return []

    def save_items(self, items: List[Dict], category: str, rarity: str):
        """Save generated items to JSON file"""
        if not items:
            print(f"⚠️  No items to save for {category}_{rarity}")
            return

        filename = f"{category}_{rarity}_v1.json"
        filepath = self.output_dir / "items" / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, 'w') as f:
            json.dump(items, f, indent=2)

        print(f"✓ Saved {len(items)} items to {filepath.name}")

    def save_messages(self, messages: List[Dict], quarter: str):
        """Save generated messages to JSON file"""
        if not messages:
            print(f"⚠️  No messages to save for {quarter}")
            return

        filename = f"{quarter}.json"
        filepath = self.output_dir / "messages" / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, 'w') as f:
            json.dump(messages, f, indent=2)

        print(f"✓ Saved {len(messages)} messages to {filepath.name}")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate game content with Claude API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate all items and messages
  python generate_items.py --api-key sk-ant-... --all

  # Generate only items
  python generate_items.py --api-key sk-ant-... --items

  # Generate only messages
  python generate_items.py --api-key sk-ant-... --messages

  # Use API key from environment
  export ANTHROPIC_API_KEY=sk-ant-...
  python generate_items.py --items
        """
    )

    parser.add_argument(
        "--api-key",
        help="Anthropic API key (or set ANTHROPIC_API_KEY env var)"
    )
    parser.add_argument(
        "--output-dir",
        default="../game/data",
        help="Output directory (default: ../game/data)"
    )
    parser.add_argument(
        "--items",
        action="store_true",
        help="Generate items"
    )
    parser.add_argument(
        "--messages",
        action="store_true",
        help="Generate company messages"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate both items and messages"
    )

    args = parser.parse_args()

    # Get API key from args or environment
    api_key = args.api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ Error: No API key provided. Use --api-key or set ANTHROPIC_API_KEY")
        sys.exit(1)

    # Default to --all if nothing specified
    if not (args.items or args.messages or args.all):
        args.all = True

    generator = GameContentGenerator(api_key, args.output_dir)

    if args.all or args.items:
        print("=" * 60)
        print("GENERATING ITEMS")
        print("=" * 60)

        # Vending machine items (500 total)
        print("\n📦 Vending Machine Items")
        for rarity, count in [("gray", 200), ("green", 150), ("blue", 100), ("purple", 40), ("gold", 10)]:
            print(f"  Generating {count} {rarity} items...")
            items = generator.generate_items_batch("vending", rarity, count)
            generator.save_items(items, "vending", rarity)

        # Store items (200 total)
        print("\n🏪 Company Store Items")
        for rarity, count in [("gray", 50), ("green", 50), ("blue", 50), ("purple", 30), ("gold", 20)]:
            print(f"  Generating {count} {rarity} items...")
            items = generator.generate_items_batch("store", rarity, count)
            generator.save_items(items, "store", rarity)

        # Craftable items (100 total)
        print("\n🔧 Craftable Items")
        for rarity, count in [("green", 40), ("blue", 30), ("purple", 20), ("gold", 10)]:
            print(f"  Generating {count} {rarity} items...")
            items = generator.generate_items_batch("craftable", rarity, count)
            generator.save_items(items, "craftable", rarity)

        print(f"\n✅ Generated 800 items total!")

    if args.all or args.messages:
        print("\n" + "=" * 60)
        print("GENERATING COMPANY MESSAGES")
        print("=" * 60)

        # Generate 2 years of messages (2026-2027)
        for year in [2026, 2027]:
            for quarter in range(1, 5):
                quarter_id = f"{year}_q{quarter}"
                print(f"  Generating messages for {quarter_id}...")
                messages = generator.generate_company_messages(quarter_id, count=90)
                generator.save_messages(messages, quarter_id)

        print(f"\n✅ Generated 720 messages (2 years)!")

    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)
    print(f"Output directory: {generator.output_dir}")


if __name__ == "__main__":
    main()
