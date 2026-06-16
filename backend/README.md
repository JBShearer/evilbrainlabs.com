# Evil Brain Labs Game - Content Generation Backend

This backend system generates game content using the Claude API.

## Setup

1. Install Python dependencies:
```bash
pip install anthropic
```

2. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or provide it via command line with `--api-key`

## Usage

### Generate All Content
```bash
cd backend
python generate_items.py --all
```

This will generate:
- **800 items** (vending machine, store, craftable) with rich backstories
- **720 company messages** (2 years worth, organized by quarter)

### Generate Items Only
```bash
python generate_items.py --items
```

Generates:
- 500 vending machine items (200 gray, 150 green, 100 blue, 40 purple, 10 gold)
- 200 company store items (50 each of gray/green/blue, 30 purple, 20 gold)
- 100 craftable items (40 green, 30 blue, 20 purple, 10 gold)

### Generate Messages Only
```bash
python generate_items.py --messages
```

Generates:
- 720 company chat messages across 2026-2027 (8 quarters × 90 messages)
- Context-aware (monday_morning, project_deadline, friday_afternoon, bug_crisis, random)
- 6 speakers: THE BRAIN, Craig, Rob, Alex, The Plug, Mobile App

## Output Structure

Generated content goes to `../game/data/`:

```
game/data/
├── items/
│   ├── vending_gray_v1.json
│   ├── vending_green_v1.json
│   ├── vending_blue_v1.json
│   ├── vending_purple_v1.json
│   ├── vending_gold_v1.json
│   ├── store_gray_v1.json
│   ├── store_green_v1.json
│   ├── store_blue_v1.json
│   ├── store_purple_v1.json
│   ├── store_gold_v1.json
│   ├── craftable_green_v1.json
│   ├── craftable_blue_v1.json
│   ├── craftable_purple_v1.json
│   └── craftable_gold_v1.json
└── messages/
    ├── 2026_q1.json
    ├── 2026_q2.json
    ├── 2026_q3.json
    ├── 2026_q4.json
    ├── 2027_q1.json
    ├── 2027_q2.json
    ├── 2027_q3.json
    └── 2027_q4.json
```

## Item Schema

Each generated item has:
```json
{
  "id": "vending_gray_sentient_coffee",
  "name": "Sentient Coffee (Demands Union Rights)",
  "category": "vending",
  "type": "consumable",
  "rarity": "gray",
  "price": 75,
  "tradeValue": 37,
  "effect": "productivity+5",
  "stock": null,
  "backstory": "This coffee achieved consciousness...",
  "attributes": {
    "sentience": 0.73,
    "unionMember": true,
    "flavor": "Existential Dread"
  },
  "loreConnections": ["coffee_uprising_2024", "employee_negative_one"],
  "unlockConditions": null,
  "metadata": {
    "generatedBy": "claude-3-5-sonnet-20241022",
    "generatedAt": "2026-06-15T...",
    "version": "1.0"
  }
}
```

## Message Schema

Each message has:
```json
{
  "speaker": "THE BRAIN",
  "message": "ALL EMPLOYEES MUST OPTIMIZE PRODUCTIVITY...",
  "context": "project_deadline",
  "sentiment": "tense",
  "timestamp": "2026-01-15T09:30:00Z"
}
```

## Performance

- Generates ~800 items in ~5-10 minutes (depends on Claude API speed)
- Generates ~720 messages in ~3-5 minutes
- Uses Claude 3.5 Sonnet with high temperature (0.8-0.9) for creativity
- Includes error handling and JSON validation

## Cost Estimate

Using Claude 3.5 Sonnet pricing:
- Items: ~400 requests × ~1000 tokens output = ~$2-4
- Messages: ~8 requests × ~2000 tokens output = ~$0.50
- **Total: ~$2.50-4.50** for complete content generation

## Customization

Edit `generate_items.py` to adjust:
- Item counts per rarity
- Price ranges
- Theme/style prompts
- Number of years of messages
- Speaker personalities

## Troubleshooting

**API Key not found:**
```bash
export ANTHROPIC_API_KEY="your-key-here"
```

**JSON parsing errors:**
- The script automatically retries failed generations
- Check console output for specific error messages

**Empty files generated:**
- Check API key is valid
- Verify internet connection
- Check Claude API status

## Next Steps

After generation:
1. Verify JSON files are valid
2. Test item loading in game
3. Check message board displays correctly
4. Adjust prompts if content needs refinement
5. Re-generate specific categories as needed
