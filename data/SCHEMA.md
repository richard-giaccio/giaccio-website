# Property data schema (single source of truth)

The website reads every listing from `data/properties.json`. To change anything
about a listing (e.g. 2 bed -> 1 bed, or add a price), edit that file only. No
code changes. A friendlier `data/properties.csv` mirror exists for bulk editing
in Excel/Google Sheets; `properties.json` is what the site build consumes.

## One entry per property

```json
{
  "slug": "barry-court-7-bedford",
  "source_folder": "Barry Court (#7) - Bedford",
  "address": "Barry Court",
  "town": "Bedford",
  "state": "NY",
  "county": "Westchester",
  "zip": null,
  "price": null,
  "status": "sold",
  "property_type": "house",
  "bedrooms": null,
  "bathrooms": null,
  "size_sqft": null,
  "lot_size": null,
  "year_built": null,
  "heating": null,
  "parking": null,
  "description": null,
  "featured_image": "assets/properties/barry-court-7-bedford/01.jpg",
  "needs_data": true
}
```

## Field rules
- `slug`: lowercase folder name, non-alphanumeric runs -> single hyphen, trimmed. MUST match the photo folder slug so images join.
- `source_folder`: exact original folder name. This is the join key against `photo-manifest.json`.
- `status`: one of `sold`, `rented`, `active`, `for-rent`. Most of this portfolio is past sales/rentals (WP prices say "rented").
- `property_type`: `house`, `condo`, `co-op`, `townhouse`, `land`. Infer from folder name hints ("co-op", "condo") else `house`, flag if unsure.
- Unknown values MUST be `null`, never guessed. `needs_data: true` marks entries missing beds/baths/price so Rich can fill them.
- `featured_image`: first image from the photo manifest for that slug (repo-relative path).

## Non-property folders to exclude (or mark type "collection")
"Homes on Website ", "Meadows - entrance & clubhouse pics", "Oakridge front entrance, pool & courts", "Cedar Woods - Outside", "Castle Hill - listing pics" and similar amenity/marketing folders are NOT individual listings.
