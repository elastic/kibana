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
   - Add to dashboard

4. Use the search bar to filter the monitors
5. Test the `Up`, `Down`, `Disabled` and `Pending` filters.
6. Test the `Type`, `Location`, `Tags` and `Frequency` filters.
7. For the `Location` and `Tags` filters make sure the `Use logical AND` option works as expected.
8. Check that the Monitors status panel correctly shows the Up, Down and Disabled monitors.
9. In the monitors status panel click on the 3 dots icon and test the `Add to dashboard` functionality.
10. Make sure the `Errors` and `Alerts` panels are visible.
11. Select `All permitted spaces` in the Spaces dropdown and make sure all monitors are shown. To test this make sure you are part of another space and that space contains at least 1 monitor.
12. Test the `Add to dashboard` button.
13. Make sure the `Sort by` dropdown works as expected.
14. Make sure the `Group by` dropdown works as expected.
15. Make sure the buttons to switch between `card view` and `compact view` work as expected.

### Management

1. Use the search bar to filter the monitors
2. Test the `Type`, `Location`, `Tags` and `Frequency` filters.
3. For the `Location` and `Tags` filters make sure the `Use logical AND` option works as expected.
4. Make sure the `Summary` and `Last 30 days` panels are visible.
5. On the `Last 30 days` panel hover over the number of test runs and click on `Inspect`, make sure the flyout opens.
6. On the `Last 30 days` panel hover over the graph and click on `Inspect`, make sure the flyout opens.
7. Test enabling/disabling one of the monitors with the toggle on the Configuration tile.
8. Test the `Edit`, `Clone`, `Delete` and `Disable status alerts` actions on the Configuration tile.
9. Select `All permitted spaces` in the Spaces dropdown and make sure all monitors are shown. To test this make sure you are part of another space and that space contains at least 1 monitor.

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
   - Failed tests by step (visible only if it's a journey/page type of monitor)

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

### Edit private location

1. From a non-default space create a private location. In the `Spaces` dropdown be sure `* All Spaces` is selected.
2. Change the location name.
3. Change the location tags.
4. Confirm that `Agent policy` and `Spaces` fields are disabled and not editable.
5. Still in the non-default space, create a monitor that uses this private location.
6. Switch to the default space and create another monitor that uses the same private location.
7. Return to the non-default space and rename the private location again.
8. Verify that the updated location name appears in both monitors (the one in the default space and the one in the non-default space).
9. Open Fleet → Agent policies, select the agent policy for this private location, and check that the integration policies now show the new location name.

### Multi space monitors

1. In the default space create a new monitor. Under `Advanced options` → `Kibana spaces`, select both the default space and the non-default space.
2. Go to `Management` view; under the `Spaces` column confirm avatars for both spaces are shown.
3. Switch to the non-default space and confirm the monitor is listed there as well.
4. From the non-default space delete the multi-space monitor.
5. Create another multi space monitor, this time in `Advanced options` → `Kibana spaces` choose `* All spaces`.
6. In Management view, the `Spaces` column should now show a single avatar with `*`.
7. Create a new space and verify that this monitor automatically appears in the new space.

### Maintenance Windows

1. In the default space start creating a monitor. Under `Advanced options` → `Maintenance windows` click `Create`.
2. Create a maintenance window.
3. Back in the monitor fly-out, select the newly created maintenance window and save the monitor.
4. On the `Overview` page, the monitor card should display a `pause` icon.
5. Hover over the `pause` icon; a tooltip should explain that the monitor is paused due to the maintenance window.
6. Go to `Maintenance windows`, edit the window so it is no longer active.
7. Return to the `Overview` page; the `pause` icon should disappear and the monitor should resume running.
