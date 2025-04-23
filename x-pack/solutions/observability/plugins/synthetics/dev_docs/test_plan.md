# Manual test plan

## Data generation

Monitor's locations are available in the edge-oblt cluster. To connect to it via cross-cluster search in a development environment, you can utilize [oblt-cli](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/) with the edge-oblt template. You can interact with oblt-cli directly in your terminal or via the [slack integration](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/#slack). The slack integration is preferred for productivity.

Oblt-cli will provide kibana.yml configuration that can be in `config/kibana.dev.yml`. This configuration will replace your existing `kibana.dev.yml` configuration. Be sure to uncomment the field `elasticsearch.ignoreVersionMismatch: true`, as the elasticsearch version often conflicts with the Kibana version.

## Feature testing

### Create monitors

1. Create a Single Page browser monitor
2. Create a Multistep monitor
3. Create a HTTP Ping monitor, click on the `Inspect configuration` button and on the `Run test` button before clicking on the `Create monitor` button.
4. Create a TCP Ping monitor.
5. Create a ICMP Ping monitor.

### Overview

1. Ensure all created monitor cards are displayed.
2. Click on one of the cards and make sure the monitor details flyout is visible.
3. Hover over one of the cards and click the `Actions` button and make sure all the actions are visible and working as expected. The following actions should be shown:

   - Go to monitor
   - Quick inspect
   - Run test manually
   - Edit monitor
   - Clone monitor
   - Create SLO
   - Disable monitor (all locations)
   - Disable status alerts (all locations)

4. Use the search bar to filter the monitors
5. Test the `Up`, `Down`, `Disabled` and `Pending` filters.
6. Test the `Type`, `Location`, `Tags` and `Frequency` filters.
7. Check that the Monitors status panel correctly shows the Up, Down and Disabled monitors.
8. In the monitors status panel click on the 3 dots icon and test the `Add to dashboard` functionality.
9. Make sure the `Errors` and `Alerts` panels are visible.
10. Select `All permitted spaces` in the Spaces dropdown and make sure all monitors are shown. To test this make sure you are part of another space and that space contains at least 1 monitor.
11. Test the `Add to dashboard` button.
12. Make sure the `Sort by` dropdown works as expected.
13. Make sure the `Group by` dropdown works as expected.

### Management

1. Use the search bar to filter the monitors
2. Test the `Type`, `Location`, `Tags` and `Frequency` filters.
3. Make sure the `Summary` and `Last 30 days` panels are visible.
4. On the `Last 30 days` panel hover over the number of test runs and click on `Inspect`, make sure the flyout opens.
5. On the `Last 30 days` panel hover over the graph and click on `Inspect`, make sure the flyout opens.
6. Test enabling/disabling one of the monitors with the toggle on the Configuration tile.
7. Test the `Edit`, `Clone`, `Delete` and `Disable status alerts` actions on the Configuration tile.
8. Select `All permitted spaces` in the Spaces dropdown and make sure all monitors are shown. To test this make sure you are part of another space and that space contains at least 1 monitor.

### Monitor detail page

To get access to this page from the `Overview` tab click on one of the monitors and then click on `Go to monitor` on the flyout.

1. On a monitor with multiple locations make sure the `Location` dropdown works as expected.
2. Click on `Edit monitor` and update the monitor.
3. Click on `Edit monitor` and delete the monitor.
4. On the Overview tab make sure the following panels are visible:
   - Summary
   - Monitor details
   - Duration trends
   - Status
   - Last test run
   - Alerts
   - Duration by step
   - Last 10 Test Runs
5. If it's a journey/page type of monitor on the `Last test run` panel click on `View test run` to open the Test run details page. Make sure the `View performance breakdown` works as expected.
6. On the `History` tab make sure the time filter correctly filters data and that the following panels are visible:

   - Stats
   - Duration trends
   - Status
   - Test runs

7. On the `Errors` tab make sure the time filter correctly filters data and that the following panels are visible:

   - Overview
   - Failed tests
   - Errors
   - Failed tests by step

8. Click on the `Alerts` tab.

### Settings

1. Check that the `Alerting` page is visible.
2. Select the `Private Locations` tab and create a private location.
3. Select the `Global Parameters` tab, create a parameter and use it in one of the monitor's configurations. Link on how to do it [here](https://www.elastic.co/guide/en/observability/current/synthetics-params-secrets.html).
4. Check that the `Data Retention` page is visible.
5. Generate a Project API Key in the `Project API Keys` page.

### Project monitors

Follow [this docs](https://www.elastic.co/guide/en/observability/current/synthetics-get-started-project.html) to set up a project.

To push changes the command to run is:

```
SYNTHETICS_API_KEY=${API_KEY} npm run push
```

1. Push the changes and check that the monitors contained in the boilerplate have been created.
2. Edit one of the monitors and push the changes. Make sure the monitor has been changed.
3. Delete one of the monitors and push the changes. Make sure the monitor has been deleted.

### Alerts and rules

1. Click on the `Alerts and rules` dropdown, `Monitor status rule` and create a rule.
2. Click on the `Alerts and rules` dropdown, `TLS rule` and create a rule.

### TLS certificates

1. Check that the `TLS certificates` under `Synthetics` are visible.
