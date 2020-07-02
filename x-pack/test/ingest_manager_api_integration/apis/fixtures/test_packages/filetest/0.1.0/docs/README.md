# filetest

This package contains randomly collected files from other packages to be used in API integration tests.

It also serves as an example how to serve a package from the fixtures directory with the package registry docker container. For this, also see the `x-pack/test/ingest_manager_api_integration/config.ts` how the `test_packages` directory is mounted into the docker container, and `x-pack/test/ingest_manager_api_integration/apis/fixtures/package_registry_config.yml` how to pass the directory to the registry.