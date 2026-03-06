#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Rendering Mermaid diagrams to SVG..."
for f in *.mmd; do
  echo "  $f → ${f%.mmd}.svg"
  npx -y @mermaid-js/mermaid-cli@latest -i "$f" -o "${f%.mmd}.svg" -c mermaid-config.json -b white -w 1400
done
echo "Done."
