# Threat Intelligence Diagrams

Excalidraw-style **sequence** and **component** diagrams for the [architecture overview](../architecture_overview_and_prd.md).

## Format

- **PNG** — embedded in Markdown and Word (readable at document scale).
- Diagrams are **sequence diagrams** (vertical lifelines, labeled messages) or **architecture maps** (grouped components), not horizontal flowcharts.

## Source

Most PNGs are exported from `threat_intelligence_phase_a_architecture.docx` (the reference architecture pack). To refresh from that document:

```bash
REF_DOC="$HOME/Downloads/threat_intelligence_phase_a_architecture.docx"
DIAG="$(dirname "$0")"
TMP=$(mktemp -d)
unzip -qo "$REF_DOC" -d "$TMP"

cp "$TMP/word/media/image11.png" "$DIAG/component_architecture.png"
cp "$TMP/word/media/image10.png" "$DIAG/plugin_dependencies.png"
cp "$TMP/word/media/image2.png"  "$DIAG/skill_tool_registration.png"
cp "$TMP/word/media/image12.png" "$DIAG/detection_layers.png"
cp "$TMP/word/media/image13.png" "$DIAG/two_tier_hunt.png"
cp "$TMP/word/media/image3.png"  "$DIAG/flow_3_1_source_ingestion.png"
cp "$TMP/word/media/image9.png"  "$DIAG/flow_3_2_nl_extraction.png"
cp "$TMP/word/media/image5.png"  "$DIAG/flow_3_3_ioc_indicator_sync.png"
cp "$TMP/word/media/image4.png"  "$DIAG/flow_3_4_coverage_gap.png"
cp "$TMP/word/media/image13.png" "$DIAG/flow_3_5_behavioral_hunt.png"
cp "$TMP/word/media/image8.png"  "$DIAG/flow_3_6_digest_delivery.png"
cp "$TMP/word/media/image7.png"  "$DIAG/flow_3_7_hit_provenance_backfill.png"
cp "$TMP/word/media/image6.png"  "$DIAG/flow_3_9_analyst_subscription.png"
cp "$TMP/word/media/image1.png"  "$DIAG/phase_roadmap.png"

rm -rf "$TMP"
```

Diagrams added after the reference pack (flyout insights, `hunt_orchestrated` Path B) are generated with `sequence_diagram.py`:

```bash
python3 sequence_diagram.py   # uses sequence_render.py + rsvg-convert
```

## Editing

1. Open the reference `.docx` in Word, or extract a PNG and import into [excalidraw.com](https://excalidraw.com).
2. Edit the diagram (keep sequence layout: participants on lifelines, messages on horizontal arrows).
3. Export PNG and overwrite the file in this directory.
4. Rebuild the Word doc from the overview markdown (see parent folder).

## Index

| PNG | Section |
| --- | --- |
| `component_architecture.png` | §2.1 |
| `plugin_dependencies.png` | §2.2 |
| `skill_tool_registration.png` | §2.4 |
| `detection_layers.png` | §2.5 |
| `two_tier_hunt.png` | §2.5 Path A (behavioral hunt) |
| `hunt_orchestrated_path_b.png` | §2.5 / §3.5 Path B |
| `flow_3_1_source_ingestion.png` | §3.1 |
| `flow_3_2_nl_extraction.png` | §3.2 |
| `flow_3_3_ioc_indicator_sync.png` | §3.3 |
| `flow_3_4_coverage_gap.png` | §3.4 |
| `flow_3_5_behavioral_hunt.png` | §3.5 Path A |
| `flow_3_6_digest_delivery.png` | §3.6 |
| `flow_3_7_hit_provenance_backfill.png` | §3.7 |
| `flow_3_8_flyout_insights.png` | §3.8 |
| `flow_3_9_analyst_subscription.png` | §3.9 |
| `phase_roadmap.png` | §6.6 (optional) |

## Drift notes

Reference diagrams may show older names or schedules. The overview doc calls out deltas (e.g. **4 h** ingestion vs 6 h in figures, `.kibana-threat-*` indices, `manage_subscriptions`, `synthesize_advisory` in digest).
