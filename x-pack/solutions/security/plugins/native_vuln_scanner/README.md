# Native vulnerability scanner

Experimental. Matches the software inventory that osquery collects from hosts against vendor
security advisories (Canonical and Red Hat OVAL to start), and writes ECS `vulnerability.*`
findings that the existing vulnerability findings UI can show.

Disabled by default. Enable with:

```yaml
xpack.nativeVulnScanner.enabled: true
```

## Inventory pack requirement

The scanner reads inventory results from an osquery pack named exactly `software-inventory`
(and only that name — the schedule-id lookup in `server/lib/inventory/schedule_ids.ts`
matches on it). The pack must contain the four queries below, with these exact query ids,
run in snapshot mode on Linux. Until the pack exists and is assigned to your agent policies,
the scan task exits early with `No "software-inventory" osquery pack found; nothing to scan`
and produces no findings.

| Query id | SQL |
| --- | --- |
| `native_vuln_scanner_deb_packages` | `SELECT name, version, arch, source, status FROM deb_packages;` |
| `native_vuln_scanner_rpm_packages` | `SELECT name, epoch, version, release, arch, source FROM rpm_packages;` |
| `native_vuln_scanner_os_version` | `SELECT platform, platform_like, codename, major, name, version FROM os_version;` |
| `native_vuln_scanner_kernel_info` | `SELECT version FROM kernel_info;` |

All four run with `platform: linux` and `snapshot: true` — one run reports the full table,
which is what makes one result per host a complete inventory. The definitions in
`server/lib/inventory/queries.ts` are the source of truth for the SQL and ids.

### Interval and time to first findings

Use `interval: 86400` (1 day) for steady state. The osquery schedule is interval-driven: in
testing, a pack with `interval: 86400` returned no snapshot results within ~8 minutes of being
assigned to an agent, while `interval: 60` returned results right away. Expect the first
inventory to take up to one `interval` after the agent receives the pack.

The scan task has its own schedule, independent of osquery. It is scheduled every day (`1d`) and
Kibana asks Task Manager to run it as soon as possible each time it starts (`runSoon`). If that
request fails, for example because a scan is already running, Kibana logs a warning and the
regular schedule still applies. A scan that runs before the first inventory arrives finds nothing,
and the findings only appear at the next scan. To see a first result quickly:

1. Create the pack with a short interval (for example `60`) and assign it to the agent policy.
2. Wait for the agent to report results, then run the scan again by restarting Kibana, which
   triggers a scan on start.
3. Raise the pack interval back to `86400` once the first findings show up.

To check what the last scan did, look for the `Vulnerability scan <run id>: {...}` line in the
Kibana log (`hosts`, `findings` and per-release `releases` status) and for the `lastRun` object
in the task state (`native-vuln-scanner:scan` in the `.kibana_task_manager` index). A missing
pack, a release with no vendor feed and a failed feed download are logged as warnings.

## Agent runtime requirement

Elastic Agents 9.7+ route agent inputs through the OTel collector runtime by default, and that
runtime only accepts filestream inputs (`OTel manager failed: failed to generate otel config:
the only supported type is 'filestream', got: "osquery"`). Agents that enroll with a policy
containing the osquery integration therefore fail to start osquery until the policy pins that
integration to the process runtime.

Set it in Fleet under **Agent policies → *your policy* → Settings → Advanced settings → Agent internal**
(the `advanced_settings.agent_internal` field, which takes a YAML string):

```yaml
agent:
  internal:
    runtime:
      default: process
      osquerybeat:
        default: process
        osquery: process
```

A policy that has this set shows `runtime: {default: process, osquerybeat: {default: process,
osquery: process}}` under its `advanced_settings` (verify via
`GET /api/fleet/agent_policies/<id>`).

## Version ordering

Distro package versions do not order like semver. `server/lib/version_compare` ports dpkg's
`verrevcmp` and librpm's `rpmvercmp`, and builds a sortable keyword key for each scheme whose
plain byte order equals the distro's order. That lets Elasticsearch compare
`installed_key < fixed_key` with ordinary keyword comparisons.

The tests check both the comparators and the keys against pairs labelled by the real `dpkg` and
`rpm` tools.
