## The Reporting Tests

### Overview

Reporting tests have their own top level test folder because:
  - Current API tests run with `optimize.enabled=false` flag for performance reasons, but reporting actually requires UI assets.
  - Reporting tests take a lot longer than other test types. This separation allows developers to run them in isolation, or to run other functional or API tests without them.

  ### Running the tests

  There is more information on running x-pack tests here: https://github.com/elastic/kibana/blob/master/x-pack/README.md#running-functional-tests. Similar to running the API tests, you need to specify a reporting configuration file. Reporting currently has two configuration files you can point to:
  - test/reporting/configs/chromium_api.js 
  - test/reporting/configs/chromium_functional.js 

  The `api` versions hit the reporting api and ensure report generation completes successfully, but does not verify the output of the reports. This is done in the `functional` test versions, which does a snapshot comparison of the generated URL against a baseline to determine success.

  To run the tests in a single command. :
1. cd into x-pack directory.
2. run:
  ```
node scripts/functional_tests --config test/reporting/configs/[config_file_name_here].js
  ```

 You can also run the test server seperately from the runner. This is beneficial when debugging as Kibana and Elasticsearch will remain up and running throughout multiple test runs. To do this:

1. cd into x-pack directory.
2. In one terminal window, run:
  ```
node scripts/functional_tests_server.js --config test/reporting/configs/[test_config_name_here].js
  ```
3. In another terminal window, cd into x-pack dir and run:
  ```
node ../scripts/functional_test_runner.js --config test/reporting/configs/[test_config_name_here].js
  ```

**Prerequisites**
The reporting functional tests use [pdf-image](https://www.npmjs.com/package/pdf-image) to convert PDF's pages to png files for image comparisons between generated reports and baseline reports.
pdf-image requires the system commands `convert`, `gs`, and `pdfinfo` to function. Those can be set up by running the following.

```sh
//OSX
brew install imagemagick ghostscript poppler

//Ubutnu
sudo apt-get install imagemagick ghostscript poppler-utils
```

For windows:

ImageMagick-6.9.9-37-Q16-HDRI-x64-dll.exe
from
https://sourceforge.net/projects/imagemagick/postdownload
Install with all default options

gs925w64.exe
from
https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs925/gs925w64.exe
Install with all default options


**Note:** Configurations from `kibana.dev.yml` are picked up when running the tests. Ensure that `kibana.dev.yml` does not contain any `xpack.reporting` configurations.

### Reporting baseline snapshots

The functional version of the reporting tests create a few pdf reports and do a snapshot comparison against a couple baselines.  The baseline images are stored in `./functional/reports/baseline`.

#### Updating the baselines

Every now and then visual changes will be made that will require the snapshots to be updated.  This is how you go about updating it.  I will discuss generating snapshots from chromium since that is the way of the future.

1. Run the test server for chromium.
  ```
node scripts/functional_tests_server.js --config test/reporting/configs/chromium_functional.js
  ```
  2. Run the test runner
  ```
  node ../scripts/functional_test_runner.js --config test/reporting/configs/chromium_functional.js
  ```
  3. This will create new report snapshots in `./functional/reports/session/`.
  4. After manually verifying the new reports in the `session` folder, copy them into [./functional/reports/baseline/](https://github.com/elastic/kibana/blob/master/x-pack/test/reporting/functional/reports/baseline)
  5. Create a new PR with the new snapshots in the baseline folder.

**Note:** Dashboard has some snapshot testing too, in `_dashboard_snapshots.js`. This test watches for a command line flag `--updateBaselines` which automates updating the baselines. Probably worthwhile to do some similar here in the long run.

  ### Adding a new BWC test

  We have tests that ensure the latest version of Kibana will continue to generate reports from URLs generated in previous versions, to ensure backward compatibility.  These tests are in `api/bwc_generation_urls.js`. It's important to update these every now and then and add new ones, especially if anything in the URL changed in a release.

  To add test coverage for a specific minor release,:
1. Checkout previous branch, e.g. `git checkout upstream/6.4`
2. Sync your environment via `yarn kbn bootstrap` (Note, if you run into problems you may want to first clean via `yarn kbn clean`)
3. Start up kibana and Elasticsearch (`yarn es snapshot --license trial` in one terminal, and `yarn start` in another)
4. Load the reporting test data that is used in the tests. Ensure you are in the `x-pack` directory and run:

```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 load ../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana
```
^^ That loads the .kibana index.

```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 load ../../../../test/functional/fixtures/es_archiver/dashboard/current/data
```
^^ That loads the data indices.

**Note:** Depending on your kibana.yml configuration, you may need to adjust the username, pw, and port in the urls above.

5. Navigate to Kibana in the browser (`http://localhost:5601`)
6. Log in, pick any index to be the default to get page the management screen (doesn’t matter)
7. Generate some reporting URLs
  - Use a mixture of Visualize, Discover (CSV), Dashboard
  - Can view the current test coverage by checkout out [api/generation_urls.js](https://github.com/elastic/kibana/blob/master/x-pack/test/reporting/api/generation_urls.js). You can use different ones for better test coverage (e.g. different dashboards, different visualizations).
  - Don’t generate urls from huge dashboards since this is time consuming.  
  - Use dashboards that have time saved with them if you wish to have data included.
8. Save these reporting urls.
9. Navigate back to the main branch via `git checkout master`. Then create, or work off your branch as usual to add the extra test coverage.
10. Copy the urls into `api/generation_urls.js`, stripping out the domain, port and base path (if they have it).
11. Write your new tests in [api/bwc_generation_urls.js](https://github.com/elastic/kibana/blob/master/x-pack/test/reporting/api/bwc_generation_urls.js)
12. Run tests via the mechanism above.

**Note:** We may at some point wish to push most of these tests into an integration suite, as testing BWC of urls generated in every single minor, especially if there were not notable changes, may be overkill, especially given the time they add to the ci.

### Expanding test coverage by including more data

As Kibana development progresses, our existing data indices often fail to cover new situations, such as:
 - Reports with new visualization types
 - Canvas reports
 - Reports with visualizations referencing new index types (e.g. visualizations referencing rolled up indices)
 - etc

 Every now and then we should expand our test coverage to include new features. This is how you go about doing that in the context of reporting:

 1. Checkout the `[version].x` branch, where `version` is the currently working minor version (e.g. 6.x, not `master`). This is because we don't want to run tests from data generated from a master version. The opposite works fine however - tests on master can run against data generated from the last minor.  At least generally, though major version upgrades may require updating archived data (or be run through the appropriate migration scripts).

 2. Load the current archives via:
 ```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 load ../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana
```
^^ That loads the .kibana index.

```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 load ../../../../test/functional/fixtures/es_archiver/dashboard/current/data
```
^^ That loads the data indices.

**Note:** Your es-url parameter might be different, but those are the default ports if running via `yarn start` and `yarn es snapshot --license trial`.

3. Now generate the new data, create new index patterns, create new visualizations, and create new dashboards using those visualizations. All the fun stuff that you may want to use in your tests.

**Note:** This data is used in open source dashboard testing.  All visualizations and saved searches that have `Rendering Test` in their name are dynamically added to a new dashboard and their rendering is confirmed in https://github.com/elastic/kibana/tree/master/test/functional/apps/dashboard/_embedddable_rendering.js.  You may need to adjust the expectations if you add new tests (which will be a good thing anyway, help extend the basic rendering tests - this way issues are caught before it gets to reporting tests!).  Similarly all visualizations and saved searches that have `Filter Bytes Test` in their name are tested in https://github.com/elastic/kibana/tree/master/test/functional/apps/dashboard/_dashboard_filtering.js

**Note:** The current reporting tests add visualizations from what is in `PageObjects.dashboard.getTestVisualizationNames`.  We should probably instead use a saved dashboard we generate this report from. Then you can add any new visualizations, re-save the dashboard, and re-generate the snapshot above.

4. After adding more visualizations to a test dashboard, update tests if necessary, update snapshots, then **save the new archives**!
 ```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 save ../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana
```
^^ That saves the .kibana index.

```
node ../scripts/es_archiver.js --es-url http://elastic:changeme@localhost:9200 save ../../../../test/functional/fixtures/es_archiver/dashboard/current/data log* animal* dog* [ANY OTHER NEW INDEX NAME YOU ADDED]*
```
^^ That saves the data indices.  The last parameter is a list of indices you want archived. You don't want to include the `.kibana` one in there (this way you can use a custom `.kibana`, but can reuse the data archive, for tests, and `.kibana` archive is small, but the data archives are larger and should be reused).

5. Create your PR with test updates, and the larger archive.



