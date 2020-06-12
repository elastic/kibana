## The Dashboard Reporting Tests

### Baseline snapshots

The reporting tests create a few PNG reports and do a snapshot comparison against stored baselines.  The baseline images are stored in `./reports/baseline`.

### Updating the baselines

Every now and then visual changes will be made that will require the snapshots to be updated.  This is how you go about updating it.

1. **Load the ES Archive containing the dashboard and data.**
   This will load the test data into an Elasticsearch instance running via the functional test server:
  ```
  node scripts/es_archiver load reporting/ecommerce --config=x-pack/test/functional/config.js
  node scripts/es_archiver load reporting/ecommerce_kibana --config=x-pack/test/functional/config.js
  ```
2. **Generate the reports of the E-commerce dashboard in the Kibana UI.**
   Navigate to `http://localhost:5620`, find the archived dashboard, and generate all the types of reports for which there are stored baseline images.
3. **Download the reports, and save them into the `reports/baseline` folder.**
   Change the names of the PNG/PDF files to overwrite the stored baselines.

The next time functional tests run, the generated reports will be compared to the latest image that you have saved :bowtie: