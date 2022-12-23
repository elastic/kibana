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
are already installed by elasticseach at startup, and available at `.monitoring-<product>-8-mb`
patterns.

### Validating a new package version
- Get the locally built package from <integrations-repos>/build/packages/<package-<version>.zip; or
- Download the package zip at <package-registry>/epr/<package>/<package>-<version>.zip
- Add the zipped package of the new version under `./fixtures/packages` and remove the previous version
- Update the package version in `./packages.ts`
- Create draft PR with the change to run against CI; or
- Run the impacted test suite locally:
  - start test server: `node scripts/functional_tests_server --config x-pack/test/monitoring_api_integration/config`
  - start test suite for the update server (eg Elasticsearch, Kibana..): `node scripts/functional_test_runner --config x-pack/test/monitoring_api_integration/config --grep "<Product>"`
