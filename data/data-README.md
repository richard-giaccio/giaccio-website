# Editing listing data

The website reads every listing from `properties.json`. Two ways to edit:

- **One listing:** edit `properties.json` directly (see `SCHEMA.md` for fields). Unknown values must be `null`, never guessed.
- **Many listings (Rich):** open `properties.csv` in Excel/Google Sheets, fill cells, save, then run `node scripts/csv-to-json.js` to rebuild `properties.json`. The CSV holds every field, so it round-trips losslessly.

`needs_data: true` means the listing still needs real specs (beds/baths/sqft/price). Set it to `false` (or `FALSE` in the CSV) once filled.

**Status:** 73 listings total. 1 has full specs (3 Oakridge Drive, from the old WordPress site). 72 still need data. Rows with a `flags` value need attention: 8 Meadows/Heritage Hills units have an unknown town, and 1 (Silver Spring Lane) is in Ridgefield **CT**, not Westchester.

`slug` and `source_folder` join each listing to its photos in `assets/properties/<slug>/` — do not change them.

Later, a Decap CMS admin UI can be wired to this repo so Rich edits listings through a web form (no files), writing back to `properties.json`.
