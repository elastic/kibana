# get_change_events

Answers **"What changed?"** during an incident by surfacing deployments, configuration updates, feature flag toggles, and scaling events.

Searches both logs (K8s events, config changes) and traces (CI/CD pipelines).

## Usage

```json
{
  "tool_id": "observability.get_change_events",
  "tool_params": {
    "start": "now-1h",
    "end": "now",
    "serviceName": "checkout-service",
    "environment": "production",
    "changeTypes": ["deployment", "configuration", "feature_flag", "scaling"]
  }
}
```

## Response

```json
{
  "summary": "Found 4 change events with 1 new version detected.",
  "total": 4,
  "events": [...],
  "versionsByService": {
    "checkout-service": [
      { "version": "v2.0.0", "firstSeen": "...", "lastSeen": "..." }
    ]
  }
}
```

## Notes

- `changeTypes` defaults to all types (`deployment`, `configuration`, `feature_flag`, `scaling`) when omitted.
- The `query` parameter (KQL) only filters logs, not CI/CD traces.
- `versionsByService` shows only versions **first deployed** within the time range.
