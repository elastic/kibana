# Native vulnerability scanner

Experimental. Matches the software inventory that osquery collects from hosts against vendor
security advisories (Canonical and Red Hat OVAL to start), and writes ECS `vulnerability.*`
findings that the existing vulnerability findings UI can show.

Disabled by default. Enable with:

```yaml
xpack.nativeVulnScanner.enabled: true
```

## Version ordering

Distro package versions do not order like semver. `server/lib/version_compare` ports dpkg's
`verrevcmp` and librpm's `rpmvercmp`, and builds a sortable keyword key for each scheme whose
plain byte order equals the distro's order. That lets Elasticsearch compare
`installed_key < fixed_key` with ordinary keyword comparisons.

The tests check both the comparators and the keys against pairs labelled by the real `dpkg` and
`rpm` tools.
