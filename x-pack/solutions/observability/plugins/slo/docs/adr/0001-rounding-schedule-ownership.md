# One deployment-wide rounding schedule, owned by Kibana

SLI rollup documents are routed to dated indices by a single rounding schedule shared by every resources version. Kibana persists it in the hidden, namespace-agnostic global SLO settings saved object, next to the requested rounding. A segment in effect never changes, so a rewritten bucket always lands in the index of the original and reads across `.slo-observability.sli-v3*` never count it twice. The routing pipeline (`.slo-observability.sli.routing-v3`, scoped to the major version) is rendered from the schedule. Each per-SLO pipeline passes its own index prefix and legacy rounding, which covers the data written before the first segment.

## Considered Options

- **Schedule in the routing pipeline `_meta`**: rejected. A deleted or recreated pipeline rebuilds the schedule from the clock, which can move a segment that is already in effect.
- **One routing pipeline and schedule per resources version**: rejected. A rounding change would not reach SLOs still on an older version.
- **`kibana.yml` setting**: rejected. It needs an ECH allow-list entry and a precedence rule against the saved object, and serverless users cannot set it.
- **Separate saved object for the schedule**: rejected in favour of an internal sub-object. The two writers are kept apart by field: the API writes only the requested rounding, and the installer writes only the schedule under optimistic concurrency.

## Consequences

- The installer is the only writer of the schedule, and it re-converges it toward the requested rounding on every run.
- A breaking change to the per-SLO → routing pipeline contract needs a new major-scoped routing pipeline. Additive changes are applied in place.
- Legacy rounding is a per-version constant (v3.0–3.5 monthly, v3.6 daily) and must never change for a released version.
