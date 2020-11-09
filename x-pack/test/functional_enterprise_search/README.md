# Enterprise Search Functional E2E Tests

## Running these tests

Follow the [Functional Test Runner instructions](https://www.elastic.co/guide/en/kibana/current/development-functional-tests.html#_running_functional_tests).

There are two suites available to run, a suite that requires a Kibana instance without an `enterpriseSearch.host`
configured, and one that does. The later also [requires a running Enterprise Search instance](#enterprise-search-requirement), and a Private API key
from that instance set in an Environment variable.

Ex.

```sh
# Run specs from the x-pack directory
cd x-pack

# Run tests that do not require enterpriseSearch.host variable
node scripts/functional_tests --config test/functional_enterprise_search/without_host_configured.config.ts

# Run tests that require enterpriseSearch.host variable
APP_SEARCH_API_KEY=[use private key from local App Search instance here] node scripts/functional_tests --config test/functional_enterprise_search/with_host_configured.config.ts
```

## Enterprise Search Requirement

The `with_host_configured` tests will not currently start an instance of App Search automatically. As such, they are not run as part of CI and are most useful for local regression testing.

The easiest way to start Enterprise Search for these tests is to check out the `ent-search` project
and use the following script.

```sh
cd script/stack_scripts
/start-with-license-and-expiration.sh platinum 500000
```

Requirements for Enterprise Search:

- Running on port 3002 against a separate Elasticsearch cluster.
- Elasticsearch must have a platinum or greater level license (or trial).
- Must have Standard or Native Auth configured with an `enterprise_search` user with password `changeme`.
- There should be NO existing Engines or Meta Engines.
