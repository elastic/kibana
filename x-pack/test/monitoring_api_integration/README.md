### Stack Monitoring API tests

This directory defines a custom test server that provides bundled integrations
packages to the spawned test Kibana. This allows us to install those packages at
startup, with all their assets (index templates, ingest pipelines..), without
having to reach a remote package registry.

With the packages and their templates already installed when we execute the test
suites, we can use the kbn-es-archiver to insert documents and make our assertions.

The pinned versions of the packages bundled under `./fixtures/packages`.
