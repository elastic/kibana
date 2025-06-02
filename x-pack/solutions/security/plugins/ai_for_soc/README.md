# Security Solution AI for SOC

This plugin provides AI capabilities for Security Operations Center (SOC) analysts within Kibana's Security Solution.

## Features

- AI-powered alert analysis and triage
- Automated threat detection assistance
- Intelligent incident response recommendations

## Development

### Setup

1. Clone the Kibana repository
2. Navigate to the plugin directory: `cd x-pack/solutions/security/plugins/ai_for_soc`
3. Install dependencies: `yarn kbn bootstrap`

### Build

```bash
yarn build
```

### Test

```bash
yarn test
```

## Plugin Structure

- `server/`: Server-side code
- `public/`: Browser-side code
- `common/`: Shared code between server and browser
- `target/`: Build output (generated)

## Configuration

The plugin can be configured through the standard Kibana configuration system. Configuration options are available under the `xpack.securitySolutionAiForSoc` namespace.

## License

Elastic License 2.0 