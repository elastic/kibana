# Entity Analytics Architecture

Technical deep-dive into Entity Store, Risk Engine, and Asset Criticality for developers.

## Viewing

Open `architecture_presentation.md` in any Markdown viewer — VS Code preview (`Cmd+Shift+V`), GitHub, or any Markdown renderer. It's a single scrolling document with a linked table of contents.

## Structure

The document follows progressive disclosure:

| Section | Topic |
|---------|-------|
| 1 | High-level overview and system connections |
| 2 | Entity Store deep dive |
| 3 | Risk Engine deep dive |
| 4 | Supporting components (Asset Criticality, Privilege Monitoring) |
| 5 | Operational reference (APIs, tasks, config, telemetry) |
| Appendixes | RFCs, glossary, quick reference links |

## Diagrams

Diagrams are pre-rendered SVGs in the `diagrams/` directory. The source `.mmd` (Mermaid) files live alongside the SVGs.

### Editing a diagram

1. Edit the `.mmd` file in `diagrams/` (e.g., `01_high_level_architecture.mmd`)
2. Re-render by running the render script:

```bash
./diagrams/render.sh
```

This requires `npx` (comes with Node.js). The script uses `@mermaid-js/mermaid-cli` to convert `.mmd` files to `.svg`.

### Diagram files

| SVG | Source | Description |
|-----|--------|-------------|
| `01_high_level_architecture.svg` | `01_high_level_architecture.mmd` | Overall system architecture |
| `02_data_flow_overview.svg` | `02_data_flow_overview.mmd` | Sequence diagram of data flow |
| `03_entity_store_data_flow.svg` | `03_entity_store_data_flow.mmd` | Entity Store extraction pipeline |
| `04_entity_store_lifecycle.svg` | `04_entity_store_lifecycle.mmd` | Entity Store engine state machine |
| `05_risk_scoring_pipeline.svg` | `05_risk_scoring_pipeline.mmd` | Risk scoring calculation flow |
| `06_risk_engine_lifecycle.svg` | `06_risk_engine_lifecycle.mmd` | Risk Engine state machine |
| `07_asset_criticality_flow.svg` | `07_asset_criticality_flow.mmd` | Asset Criticality data flow |
| `08_complete_system.svg` | `08_complete_system.mmd` | Full system integration diagram |

## Updating

Edit `architecture_presentation.md` directly.

- Add new sections under the appropriate heading
- Add RFC appendixes by duplicating the RFC template section
- Links point to `main` branch on GitHub — they stay current as code moves
