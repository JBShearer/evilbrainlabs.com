# Deploying Game Updates

## The Browser Caching Problem

Browsers aggressively cache JavaScript and JSON files. When you update the game, users might see old content because their browser hasn't downloaded the new files yet.

## Solution: Cache Busting

We use version parameters (`?v=2`) on all script and data file loads. When you update the game, increment the version number.

### Files That Use Cache Busting

1. **index.html** - All script tags have `?v=2`
2. **gameEngine.js** - Loads `narrative.json?v=2`
3. **contentLoader.js** - Adds `?v=2` to all JSON file loads

### How to Deploy Updates

**Step 1:** Make your changes to game files

**Step 2:** Increment version numbers in three places:

```bash
# 1. Update index.html script tags (change ?v=2 to ?v=3)
sed -i '' 's/?v=2/?v=3/g' game/index.html

# 2. Update gameEngine.js narrative load
sed -i '' 's/narrative.json?v=2/narrative.json?v=3/' game/js/gameEngine.js

# 3. Update contentLoader.js cache bust version
# Edit line: this.cacheBust = '2'; to this.cacheBust = '3';
```

**Step 3:** Deploy to GitHub Pages

```bash
git add .
git commit -m "Update game content (v3)"
git push origin main
```

**Step 4:** Tell users to hard refresh (if needed)

If users still see old content:
- **Windows/Linux:** Ctrl + Shift + R or Ctrl + F5
- **Mac:** Cmd + Shift + R
- **Mobile:** Clear browser cache or use incognito/private mode

## Current Version

**v2** - June 15, 2026
- Fixed "Senior Absurdist" ending
- Integrated narrative expansion v2 (111 nodes)
- Added content loader system
- Added company message board

## Alternative: Meta Tag (Less Effective)

You can also add this to `<head>` in index.html, but version parameters are more reliable:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

## Why Not Just Disable Caching?

Caching is actually good for performance. We want browsers to cache files, we just need to force them to re-download when we update. Version parameters achieve this perfectly.

## Testing Your Updates

1. Open the game in a fresh incognito/private window
2. Check the browser console for version messages
3. Verify new content appears
4. Test on mobile (mobile browsers cache aggressively)

## Troubleshooting

**"I deployed but still see old content":**
- Hard refresh (Ctrl+Shift+R)
- Check if version numbers actually incremented
- Verify GitHub Pages has the new files (can take 1-2 minutes)

**"Console shows 404 errors":**
- Check file paths are correct
- Verify files exist in the repo
- GitHub Pages case-sensitive - check capitalization

**"Mobile never updates":**
- Mobile browsers cache VERY aggressively
- Always test in private/incognito mode first
- Consider incrementing versions more frequently
