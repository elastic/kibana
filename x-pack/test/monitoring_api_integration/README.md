## Stack Monitoring API tests

This directory defines a custom test server that provides bundled integrations
packages to the spawned test Kibana. This allows us to install those packages at
startup, with all their assets (index templates, ingest pipelines..), without
having to reach a remote package registry.

With the packages and their templates already installed when we execute the test
suites, we can use the kbn-es-archiver to insert documents and make our assertions.

By updating the bundled packages when we release changes to the mappings, we can
assert than no regression were introduced.
The pinned versions of the packages bundled under `./fixtures/packages`.

### Updating a package
- Download the package zip at <package-registry>/epr/<package>/<package>-<version>.zip
- Remove the zipped package of the previous version under `./fixtures/packages`
- Update the package version in `./packages.ts`
