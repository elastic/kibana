# Elastic AI Assistant

This plugin implements server APIs for the `Elastic AI Assistant`. Furthermore, it registers the `Elastic Assistant` in the navigation bar.

For further UI components, see `x-pack/platform/packages/shared/kbn-elastic-assistant`.

## Maintainers

Maintained by the Security Solution team

## Graph structure

### Default Assistant graph

![DefaultAssistantGraph](./docs/img/default_assistant_graph.png)

### Default Attack discovery graph

![DefaultAttackDiscoveryGraph](./docs/img/default_attack_discovery_graph.png)

## Development

### Generate graph structure

To generate the graph structure, run `yarn draw-graph` from the plugin directory.
The graphs will be generated in the `docs/img` directory of the plugin.

### Testing

To run the tests for this plugin, run `node scripts/jest --watch x-pack/solutions/security/plugins/elastic_assistant/jest.config.js --coverage` from the Kibana root directory.
