#!/bin/bash

SCRIPT_DIR="$(dirname -- "$0")"
URL_FILE="$SCRIPT_DIR/notebooks.txt"
DATA_DIR="$SCRIPT_DIR/../server/data"

echo "Saving notebooks to $DATA_DIR"

# Check if the DATA_DIR exists, if not, create it
if [ ! -d "$DATA_DIR" ]; then
    echo "Creating directory $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# Check if the URL file exists
if [ ! -f "$URL_FILE" ]; then
    echo "URL file does not exist: $URL_FILE"
    exit 1
fi

# Read each line from the URL file
while IFS= read -r url; do
    if [ -z "$url" ]; then
        # Skip empty lines
        continue
    fi

    echo "Downloading: $url"
    # Extract the filename from the URL
    full_filename=$(basename "$url")
    filename="${full_filename%.*}"
    # Convert filename to snake case
    # This replaces non-alphanumeric characters with underscores and lowercases the result
    snake_case_filename=$(echo "$filename" | sed -r 's/[^a-zA-Z0-9]+/_/g' | tr '[:upper:]' '[:lower:]')

    # Use curl to download the file. -L follows redirects, and -o specifies the output file path.
    curl -L "$url" -o "$DATA_DIR/$snake_case_filename.json"
done < "$URL_FILE"

echo "Download completed."
