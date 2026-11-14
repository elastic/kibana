# Native vulnerability scanner

Experimental. Matches the software inventory that osquery collects from hosts against vendor
security advisories (Canonical and Red Hat OVAL to start), and writes ECS `vulnerability.*`
findings that the existing vulnerability findings UI can show.

Disabled by default. Enable with:

```yaml
xpack.nativeVulnScanner.enabled: true
```

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
