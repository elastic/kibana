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
matches on it). The pack must contain the five queries below, with these exact query ids,
run in snapshot mode on Linux. Until the pack exists and is assigned to your agent policies,
the scan exits early with `No "software-inventory" osquery pack found; nothing to scan`
and produces no findings.

| Query id | SQL |
| --- | --- |
| `native_vuln_scanner_deb_packages` | `SELECT name, version, arch, source, status FROM deb_packages;` |
| `native_vuln_scanner_rpm_packages` | `SELECT name, epoch, version, release, arch, source FROM rpm_packages;` |
| `native_vuln_scanner_os_version` | `SELECT platform, platform_like, codename, major, name, version FROM os_version;` |
| `native_vuln_scanner_kernel_info` | `SELECT version FROM kernel_info;` |
| `native_vuln_scanner_language_packages` | `SELECT ecosystem, namespace, name, version, purl, path, manager, install_time FROM elastic_language_packages;` |

All five run with `platform: linux` and `snapshot: true` — one run reports the full table,
which is what makes one result per host a complete inventory. The definitions in
`server/lib/inventory/queries.ts` are the source of truth for the SQL and ids.
`elastic_language_packages` is an osquerybeat extension table (Python and npm, one purl per
row); on agents whose beats predate it the query returns no rows and the scanner simply
collects no language packages.

### Interval and time to first findings

Use `interval: 86400` (1 day) for steady state. The osquery schedule is interval-driven: in
testing, a pack with `interval: 86400` returned no snapshot results within ~8 minutes of being
assigned to an agent, while `interval: 60` returned results right away. Expect the first
inventory to take up to one `interval` after the agent receives the pack.

## Scan workflow

The scan is a managed workflow, `system-security-native-vuln-scan`, not a Task Manager task. Its
definition lives in `kbn-workflows/managed/definitions/native_vuln_scanner/scan.yaml`. When the plugin
is enabled, Kibana installs it once, in the default space, at start. It is installed **disabled**:
the findings depend on an inventory pack that agent policies opt in to, so an operator turns it on.
Kibana does not load the plugin when it is disabled, so Workflows' start-up cleanup removes the
workflow.

**Enable flow.** Open the workflow in Workflows (search for "Scan for vulnerabilities") and enable
it. It then runs every `24h`. Use **Run** for a first scan once the first inventory has arrived. A scan
that runs before the first inventory finds nothing, and the findings only appear at the next one. To see
a first result quickly, create the pack with a short interval (for example `60`), assign it to the agent
policy, wait for the agent to report, run the workflow, then raise the interval back to `86400`.

**Steps.** Three custom steps, in order:

1. `native_vuln.fetch_feed` reads the inventory, works out which OS releases it contains and downloads
   those vendor feeds, sending `If-None-Match` when it holds a cached copy. Its output is metadata and
   counts only (per-release status, etag), never advisory data. The feeds themselves stay in a per-node
   cache keyed by release.
2. `native_vuln.match` re-reads the inventory, matches each release against its feed and writes the
   findings as the Kibana internal user. A release whose feed failed fails alone.
3. `native_vuln.summarize` writes one summary document for the run.

A failed step does not skip the summary; the workflow's last step then fails the run so the failure
shows in the execution list.

**Concurrency.** `settings.concurrency` uses the key `native-vuln-scan`, strategy `drop`, maximum 1: a
run that starts while another is in flight is dropped, not queued.

**Where the result is.** Each run writes one document, with the execution id as its id, to the hidden
index `.kibana-native-vuln-scanner-runs`: run id, start and finish time, hosts scanned, findings open and
fixed, per-feed status and failures. The name sits under `.kibana*` because that is the only pattern the
`kibana_system` role may create and write for a plugin; the other names we tried were rejected with
`indices:admin/create is unauthorized`. Query it with `expand_wildcards: hidden`. Each step's output is
in the workflow's execution history.

**Limits.** The feed cache is per Kibana node and is lost on restart, so each node downloads a feed once
after a restart.

## Licence

Native vulnerability scanning requires an **Enterprise** licence; a trial licence counts. Below that,
each workflow step (`native_vuln.fetch_feed`, `native_vuln.match`, `native_vuln.summarize`) checks the
current licence before it reads or writes anything and fails with "Native vulnerability scanning
requires an Enterprise licence". Findings written while the licence was sufficient stay readable.

## Finding lifecycle and detection rules

A finding is `new` on its first sighting, `active` while later scans still match it, `fixed` once
a scan of its host no longer does, and `reopened` if it matches again. `event.created` is set on
the first sighting and kept until a reopen, which resets it to that scan's time.

A detection rule created from a finding matches `vulnerability.id` and
`event.created >= <rule creation>`, uses `event.created` as its timestamp, and asks for alert
suppression per host (`resource.id`). The reset on reopen is what lets a finding first seen
before the rule existed match again. How often it alerts depends on the license:

| License | Alerts |
| --- | --- |
| Platinum, Enterprise or trial | Suppression is applied. Each new finding and every reopen raises a new alert. Scans that fix a finding or change nothing raise none. Matches on one host within a single rule run fold into one alert. |
| Basic (only after a downgrade) | Suppression is ignored, so there is no per-host grouping. The alert id derives from the finding's stable document id, so the finding alerts once per rule: the first time it is new or reopened after the rule was created. Later reopens raise no alert. |

A reopened finding has `native_vuln_scanner.state: reopened`, which you can filter on or add as a
column on the findings page.
`native_vuln_scanner.first_seen` never changes, so "First found" in the flyout stays at the
original sighting.

### Unfixed findings

```yaml
xpack.nativeVulnScanner.includeUnfixed: true
```

With `includeUnfixed` (off by default) the scanner also reports CVEs that affect an installed
package but have no fixed version yet: Red Hat's unpatched feed (`oval:com.redhat.cve`
definitions) and Ubuntu's "might be affected" and kernel-flavour-only criteria. Such findings
carry no `package.fixed_version`, are marked `native_vuln_scanner.unfixed: true` and carry the
vendor's own wording in `native_vuln_scanner.vendor_reason` (Red Hat resolution states verbatim,
e.g. "Will not fix" or "Affected"; Ubuntu says "might be affected").

An unfixed finding is `unfixed` from its first sighting: it is never `new` or `reopened` while no
fix exists, and it never alerts — detection rules created from findings exclude
`native_vuln_scanner.unfixed: true` (rules created before this exclusion keep the old query until
recreated). When the vendor later ships a fix, the next scan that matches it reopens the finding
and resets `event.created`, so rules alert from then on.

The fix pass only closes unfixed findings when the run's feed included unfixed rows
(`includeUnfixed: true`); a run without them leaves unfixed findings open.

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

### Known limitation: per-account trend

The vulnerability dashboard trend includes native findings in the overall severity totals. The
per-cloud-account trend buckets are keyed on `cloud.account.id`, which native findings do not have,
so they are not counted there. The trend is written by a task that runs only when the Cloud
Security Posture integration is installed.
