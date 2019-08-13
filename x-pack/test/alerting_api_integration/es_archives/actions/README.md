The values of `id` and `secrets` in the `basic/data.json` file
may change over time, and to get the current "correct" value to replace it with,
you can do the following:


- add a `process.exit()` in this test, after an action is created:

      https://github.com/elastic/kibana/blob/master/x-pack/test/api_integration/apis/actions/create.ts#L37

- figure out what data got put in ES via

      curl -v 'http://elastic:changeme@localhost:9220/_search?q=type:action' | json

- there should be a new `id` and `secrets`

- update the following files:

    - `id` and `secrets`

      `x-pack/test/functional/es_archives/actions/basic/data.json`

    - `id`

      `x-pack/test/api_integration/apis/actions/constants.ts`
