## Stack Monitoring API tests

This directory defines a custom test server that provides bundled integrations
packages to the spawned test Kibana. This allows us to install those packages at
startup, with all their assets (index templates, ingest pipelines..), without
having to reach a remote package registry.
With the packages and their templates already installed we don't have to provide
the static mappings in the tests archives. This has the benefit of reducing our
disk footprint and setup time but more importantly it enables an easy upgrade path
of the mappings so we can verify no breaking changes were introduced by bundling
the new versions of the packages.

_Note that while Stack Monitoring currently supports 3 collection modes, the tests
in this directory only focus on metricbeat and elastic-agent data. Tests for legacy
data are defined under `x-pack/test/api_integration/apis/monitoring`._

Since an elastic-agent integration spawns the corresponding metricbeat module under
the hood (ie when an agent policy defines elasticsearch metrics data streams,
a metricbeat process with the elasticsearch module will be spawned), the output
documents are _almost_ identical. This means that we can easily transform documents
from a source (elastic-agent) to another (metricbeat), and have the same tests run
against both datasets.

Note that we don't have to install anything for the metricbeat data since the mappings
are already installed by elasticseach at startup, and available at `.monitoring-<component>-8-mb`
patterns. So we are always running the metricbeat tests against the latest version of
the mappings.
We could have a similar approach for packages, for example by installing the latest
packages versions from public EPR before the test suites run, instead of using pinned
versions. Besides the questionable reliance on remote services for running tests,
this is also dangerous given that packages are released in a continuous model.
This means that whenever the test suite would execute against the latest version
of packages it would be too late, as in already available to users.

### Validating a new package version
**IMPORTANT: this validation should be done before merging the new package version.
A more tightly coupled test step will be considered as a next step (ie run the impacted
test suite as CI step in the integrations package).**

- Get the locally built package from `<integrations-repo>/build/packages/<package>-<version>.zip`; or
- Download the package zip from local registry `<package-registry-url>/epr/<package>/<package>-<version>.zip`
- Add the zipped package of the new version under `./fixtures/packages` and remove the previous version
- Update the package version in `./packages.ts`
- Create draft PR with the change to run against CI; or
- Run the impacted test suite locally:
  - start test server: `node scripts/functional_tests_server --config x-pack/test/monitoring_api_integration/config`
  - start test suite for the updated component (eg Elasticsearch, Kibana..): `node scripts/functional_test_runner --config x-pack/test/monitoring_api_integration/config --grep "<Component>"`

### Adding a new archive
- Generate elastic-agent data for the relevant integration and archive the data
  with the kbn-es-archiver. Assuming the data is extracted from an elastic-package
  stack: `node scripts/es_archiver.js save <output-dir> 'metrics-<component>.stack_monitoring.*' --es-url=https://elastic:changeme@localhost:9200 --es-ca=~/.elastic-package/profiles/default/certs/ca-cert.pem`
  - `<output-dir>` should point to a subdirectory of the `./archives` dir for consistency,
    and since we're generating package data, end with `package` dir. example `<kibana>/x-pack/test/monitoring_api_integration/archives/kibana/two-nodes/package`
- `<output-dir>` should only contain a `data.json.gz`. make sure the `mappings.json` file was removed by the script
- run the transform script to generate metricbeat data `node scripts/transform_archive --src <output-dir>/data.json.gz`
- create a test case with the new archive
