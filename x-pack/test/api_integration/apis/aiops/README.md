# AIOps Labs API integration tests

Note the tests in `explain_log_rate_spikes_extended.ts` are skipped, they are not intended to run on CI.
They need datasets not available within Kibana CI.
To run these tests locally you can do the following:


- Use the ML-QA framework to set up a separate local cluster and restore the snapshot `cluster-apm-catalog`.
- Set up a local snapshot repo in this cluster:
  - Config path: `path.repo: /Users/<user>/.elastic/snapshots` in the cluster's `elasticsearch.yml`.
  - Run the following in Dev Tools:
    ```
    PUT _snapshot/aiops_api_tests
    {
      "type": "fs",
      "settings": {
        "location": "aiops_api_tests"
      }
    }
    ```
- Create a local snapshot of the indices of `cluster-apm-catalog`.
- In your Kibana dev checkout, change the `path.repo` part in the file `x-pack/test/functional/config.base.js` to that same directory.
- From within the `x-pack` directory, start the functional tests server:
  `node scripts/functional_tests_server --config test/functional/config.base.js`
- In Dev tools, run the same `PUT _snapshot/...` command from above.
- Restore the snapshot with the indices you created (e.g. via Snapshot/Restore UI in Kibana Management)
