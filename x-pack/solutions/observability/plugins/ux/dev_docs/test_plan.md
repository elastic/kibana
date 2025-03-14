# Manual test plan

## Data generation

User experience test data is available in the edge-oblt cluster. To connect to it via cross-cluster search in a development environment, you can utilize [oblt-cli](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/) with the edge-oblt template. You can interact with oblt-cli directly in your terminal or via the [slack integration](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/#slack). The slack integration is preferred for productivity.

Oblt-cli will provide kibana.yml configuration that can be in `config/kibana.dev.yml`. This configuration will replace your existing `kibana.dev.yml` configuration. Be sure to uncomment the field `elasticsearch.ignoreVersionMismatch: true`, as the elasticsearch version often conflicts with the Kibana version.

## Feature testing

The user experience app is a single page containing a collection of dashboards for data from for the Elastic APM Real User Monitoring (RUM) JavaScript Agent.

Because the whole app is a single page, it's quite straightforward to test. Simply interact with every element on the page. This includes

1. Changing the time range on the time picker
2. Testing all filter dropdowns
3. Adding a url search to the url search bar
4. However oven the ? icon to view the tooltips
5. Use the breakdown feature on the page load distribution and total page view visualizations
6. Click on a specific country in the page load by country visualization to test filtering from the visualization
7. Click on a piece of the pie chart from the Visitor breakdowns to test filtering from the visualization
8. Navigate through the console errors list
