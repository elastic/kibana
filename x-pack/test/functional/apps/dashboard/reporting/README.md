## The Reporting Tests

### Reporting baseline snapshots

The functional version of the reporting tests create a few pdf reports and do a snapshot comparison against a couple baselines.  The baseline images are stored in `./functional/reports/baseline`.

#### Updating the baselines

Every now and then visual changes will be made that will require the snapshots to be updated.  This is how you go about updating it.  I will discuss generating snapshots from chromium since that is the way of the future.

1. Load the ES Archive containing the dashboard and data
  ```
  node scripts/es_archiver load reporting/ecommerce --config=x-pack/test/reporting/configs/chromium_functional.js
  node scripts/es_archiver load reporting/ecommerce_kibana --config=x-pack/test/reporting/configs/chromium_functional.js
  ```
2. Generate a report of the archived E-commerce dashboard in the Kibana UI.
3. Download the report and save it in the `reports/baseline` folder.