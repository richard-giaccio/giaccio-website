#!/usr/bin/env bash
# Compress real-estate photo library into web-optimized WebP+JPEG for GitHub Pages.
# Read-only on source. Re-runnable. See CLAUDE task spec.
set -u

SRC="/Users/pavan/Downloads/Website Photos rich"
REPO="/Users/pavan/giaccio-website"
OUT="$REPO/public/assets/properties"
DATA="$REPO/data"
RECORDS="$DATA/records.tsv"
FAILLOG="$DATA/failures.log"

mkdir -p "$OUT" "$DATA"
: > "$RECORDS"
: > "$FAILLOG"

slugify() {
  printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

# Iterate over each immediate subdirectory of SRC
find "$SRC" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z | while IFS= read -r -d '' dir; do
  folder="$(basename "$dir")"
  slug="$(slugify "$folder")"
  destdir="$OUT/$slug"
  mkdir -p "$destdir"

  # Collect image files, sorted by filename (stable)
  seen_md5=""
  seq=0

  # Build a null-delimited, filename-sorted list of image files in this dir only
  while IFS= read -r -d '' f; do
    md5="$(md5 -q "$f" 2>/dev/null)"
    if [ -z "$md5" ]; then
      echo "MD5_FAIL	$f" >> "$FAILLOG"
      continue
    fi
    case " $seen_md5 " in
      *" $md5 "*) continue ;;  # exact duplicate, skip
    esac
    seen_md5="$seen_md5 $md5"

    seq=$((seq+1))
    NN="$(printf '%02d' "$seq")"
    full_webp="$destdir/$NN.webp"
    full_jpg="$destdir/$NN.jpg"
    thumb_webp="$destdir/$NN-thumb.webp"

    ok=1
    # 1. Full WebP: max 1600 long edge, q80, stripped
    if ! magick "$f" -auto-orient -strip -resize '1600x1600>' -quality 80 "$full_webp" 2>>"$FAILLOG"; then
      echo "WEBP_FAIL	$f" >> "$FAILLOG"; ok=0
    fi
    # 2. Full JPEG fallback: 1600, progressive q82, stripped
    if ! magick "$f" -auto-orient -strip -resize '1600x1600>' -interlace Plane -quality 82 "$full_jpg" 2>>"$FAILLOG"; then
      echo "JPG_FAIL	$f" >> "$FAILLOG"; ok=0
    fi
    # 3. Thumb WebP: max 640 long edge, q78, stripped
    if ! magick "$f" -auto-orient -strip -resize '640x640>' -quality 78 "$thumb_webp" 2>>"$FAILLOG"; then
      echo "THUMB_FAIL	$f" >> "$FAILLOG"; ok=0
    fi

    if [ "$ok" -ne 1 ]; then
      # roll back sequence number so numbering stays contiguous, remove partials
      rm -f "$full_webp" "$full_jpg" "$thumb_webp"
      seq=$((seq-1))
      echo "SKIPPED	$f" >> "$FAILLOG"
      continue
    fi

    # dimensions of the produced full jpg
    dims="$(magick identify -format '%w %h' "$full_jpg" 2>/dev/null)"
    w="${dims% *}"; h="${dims#* }"
    [ -z "$w" ] && w=0
    [ -z "$h" ] && h=0

    rel_jpg="assets/properties/$slug/$NN.jpg"
    rel_webp="assets/properties/$slug/$NN.webp"
    rel_thumb="assets/properties/$slug/$NN-thumb.webp"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$folder" "$slug" "$NN" "$rel_jpg" "$rel_webp" "$rel_thumb" "$w" "$h" >> "$RECORDS"
  done < <(find "$dir" -mindepth 1 -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.heic' -o -iname '*.webp' \) -print0 | sort -z)

  count="$(ls -1 "$destdir"/[0-9][0-9].jpg 2>/dev/null | wc -l | tr -d ' ')"
  echo "DONE  $folder  ($slug)  -> $count images"
done

echo "ALL FOLDERS PROCESSED"
