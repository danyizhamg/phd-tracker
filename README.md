# PhD Opportunities Tracker

Cathy's personal tracker for fully-funded international PhD opportunities in Data Science, Environmental Science, Economics, and Sustainability.

## Tech
- Pure HTML + CSS + Vanilla JS (no build step)
- Data in `data/opportunities.json`
- Deployed on Vercel via GitHub

## Adding New Opportunities

Edit `data/opportunities.json` and add an entry:

```json
{
  "id": "unique-id",
  "title": "PhD in ...",
  "university": "University Name",
  "country": "Country",
  "region": "Europe",
  "flag": "🇩🇪",
  "field": ["Data Science", "Economics"],
  "funding": "Full",
  "stipend": "€X,XXX/month",
  "deadline": "2026-12-01",
  "deadline_type": "fixed",
  "language_req": "English",
  "other_language_required": false,
  "other_language_note": "",
  "supervisor": "Prof. Name",
  "description": "Description of the position.",
  "url": "https://...",
  "added_date": "2026-06-11",
  "status": "open",
  "tags": ["tag1", "tag2"]
}
```

### Fields
- `deadline_type`: `"fixed"` | `"rolling"` | `"annual"`
- `status`: `"open"` | `"upcoming"` | `"closed"`
- `region`: `"Europe"` | `"North America"` | `"Australia"` | `"Asia"`

## Deploy

Push to GitHub → Vercel auto-deploys.
