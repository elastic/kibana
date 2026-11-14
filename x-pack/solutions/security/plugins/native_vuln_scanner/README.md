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

All four run with `platform: linux`, `interval: 86400` (1 day), `snapshot: true` — one run
reports the full table, which is what makes one result per host a complete inventory. The
definitions in `server/lib/inventory/queries.ts` are the source of truth for the SQL and ids.

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
