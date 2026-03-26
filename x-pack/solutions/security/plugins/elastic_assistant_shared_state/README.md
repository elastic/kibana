# Elastic Assistant Shared State

This plugin acts as a reactive bridge between the elastic assistant plugin and other plugins. It exposes an RxJS-based interface where:

- Other plugin registers components, actions or state updates via observables.

- The elastic assistant plugin subscribes to those updates by consuming the corresponding observables and using the values in to render the assistant. 

This decouples the plugins while enabling reactive updates across plugins.

See where the RxJS values are consumed in the elastic assistant plugin: `x-pack/solutions/security/plugins/elastic_assistant/public/src/context/assistant_context/assistant_provider.tsx`

## Maintainers

Maintained by the Security Solution team - @elastic/security-generative-ai

## Development

### Testing

To run the tests for this plugin, run `node scripts/jest --watch x-pack/solutions/security/plugins/elastic_assistant_shared_state/jest.config.js --coverage` from the Kibana root directory.