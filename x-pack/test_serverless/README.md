# Kibana Serverless Tests

The tests and helper methods (services, page objects) defined here in
`x-pack/test_serverless` cover the serverless functionality introduced by the
 `serverless`, `serverless_observability`, `serverless_search` and
 `serverless_security` plugins.

## Serverless testing structure and conventions

### Overview

The serverless test structure corresponds to what we have in `x-pack/test` with
API tests in `api_integration` and UI tests in `functional`, each with their
set of helper methods and sub-directories for
- `common` functionality shared across serverless projects (core, shared UX, ...)
- `observability` project specific functionality
- `search` project specific functionality
- `security` project specific functionality

The `shared` directory contains fixtures, services, ... that are shared across
`api_integration` abd `functional` tests.

```
x-pack/test_serverless/
├─ api_integration
│  ├─ services
│  ├─ test_suites
│  │  ├─ common
│  │  ├─ observability
│  │  ├─ search
│  │  ├─ security
├─ functional
│  ├─ page_objects
│  ├─ services
│  ├─ test_suites
│  │  ├─ common
│  │  ├─ observability
│  │  ├─ search
│  │  ├─ security
├─ shared
│  ├─ services
│  ├─ types
```

### Shared services and page objects

Test services and page objects from `x-pack/test/[api_integration|functional]`
are available for reuse.

Serverless specific services and page objects are implemented in
`x-pack/test_serverless/[api_integration|functional|shared]` only and may not be added
to or make modifications in `x-pack/test`.

With this helper method reuse, we have to avoid name clashes and go with the
following namesapces:

| project       | namespace for helper methods |
| ------------- | ---------------------------- |
| common        | svlCommon                    |
| observability | svlOblt                      |
| search        | svlSearch                    |
| security      | svlSec                       |

### Adding Serverless Tests

As outlined above, serverless tests are separated from stateful tests (except
the reuse helper methods), which includes a separate base configuration. All
tests that should run in an serverless environment have to be added here in
`x-pack/test_serverless`.

Tests in this area should be clearly designed for the serverless environment,
particularly when it comes to timing for API requests and UI interaction.

## Run tests
Similar to how functional tests are run in `x-pack/test`, you can point the
functional tests server and test runner to config files in this `x-pack/test_serverless`
directory, e.g. from the `x-pack` directory run:
```
node scripts/functional_tests_server.js --config test_serverless/api_integration/test_suites/common/config.ts

node scripts/functional_test_runner.js --config test_serverless/api_integration/test_suites/common/config.ts
```