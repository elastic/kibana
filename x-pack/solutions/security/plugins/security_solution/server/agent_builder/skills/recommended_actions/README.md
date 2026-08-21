# Recommended actions capability map

The `recommended-actions` skill only proposes and classifies actions. It does not call these APIs.
The human-in-the-loop translation layer maps an approved `capability_ref` as follows:

| Action type | Capability ref | Kibana capability |
| --- | --- | --- |
| `isolate_host` | `endpoint.isolate` | `POST /api/endpoint/action/isolate` (`ISOLATE_HOST_ROUTE_V2`) |
| `kill_process` | `endpoint.kill_process` | `POST /api/endpoint/action/kill_process` (`KILL_PROCESS_ROUTE`) |
| `hunt_process_persistence` | `endpoint.running_procs` | `POST /api/endpoint/action/running_procs` (`GET_PROCESSES_ROUTE`) or an approved execute action |
| `create_case` | `cases.create` | Cases API `POST /api/cases` |
| `set_asset_criticality` | `asset_criticality.set` | `POST /api/asset_criticality` (`ASSET_CRITICALITY_PUBLIC_URL`) |
| `analyze_exfiltration_ips` | `threat_hunting.exfil_ips` | `threat-hunting` skill or read-only `platform.core` ES\|QL tools |

The manual action types `revoke_user_account`, `enforce_step_up_auth`, and `onboard_integration`
have no Kibana API mapping. They are rendered as analyst to-dos and omit `capability_ref`.
