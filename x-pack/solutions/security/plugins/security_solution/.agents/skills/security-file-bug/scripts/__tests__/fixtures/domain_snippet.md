## Team Label to Code Path Mapping

| GitHub Label | Server Path | Public Path | Route Registration | Common API |
|-------------|------------|-------------|-------------------|------------|
| `Team:Entity Analytics` | `server/lib/entity_analytics/` | `public/entity_analytics/` | `server/lib/entity_analytics/register_entity_analytics_routes.ts` | `common/api/entity_analytics/` |
| `Team:Detection Engine` | `server/lib/detection_engine/` | `public/detection_engine/` | `server/lib/detection_engine/rule_management/api/register_routes.ts` | `common/api/detection_engine/` |
| `Team:Threat Hunting` | `server/lib/timeline/` | `public/timelines/` | `server/lib/timeline/routes/index.ts` | `common/api/timeline/` |
| `Team:Security Solution` | varies | varies | varies | varies |

## Team Ownership Lookup

### Table A — Security Solution Teams

| CODEOWNERS Team | GitHub Issue Label | Primary Code Paths |
|---|---|---|
| `@elastic/security-solution` | `Team:SecuritySolution` | `security_solution/` (root-level, shared) |
| `@elastic/security-entity-analytics` | `Team:Entity Analytics` | `server/lib/entity_analytics/`, `public/entity_analytics/` |
| `@elastic/security-detection-engineering` | `Team:Detection Engineering` | `server/lib/detection_engine/`, `lists/`, `server/lib/detection_engine/rule_management/`, `prebuilt_rules/` |
| `@elastic/security-threat-hunting-investigations` | `Team:Threat Hunting` | `server/lib/timeline/`, `public/timelines/`, `timelines/` |

## Common Page Routes

| User-Facing Navigation | Application Route | Code Area |
|------------------------|-------------------|-----------|
| Security > Alerts | `/app/security/alerts` | `public/detection_engine/`, `public/detections/` |
| Security > Entity Analytics | `/app/security/entity_analytics` | `public/entity_analytics/` |
| Security > Attack Discovery | `/app/security/attack_discovery` | `public/attack_discovery/` |
