# WorkplaceAIApp

Workplace AI application plugin

## Quickstart:

### Setup
```bash
nvm use
yarn kbn bootstrap
```

### Start ES
```bash
yarn es serverless --projectType workplaceai
```

### Start Workplace AI in Kibana
```bash
yarn serverless-workplace-ai
```

## EARS Integration (Elastic Auth Redirect Service)

The Workplace AI plugin supports integration with [EARS (Elastic Auth Redirect Service)](https://github.com/elastic/elastic-auth-redirect-service) for OAuth authentication with third-party services like Google.

### Configuration

The following configuration options are available under `xpack.workplaceAIApp.ears`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | - | The URL where EARS is running (e.g., `https://localhost:8052`) |
| `ui_enabled` | boolean | `false` | Whether to show the EARS test UI on the Workplace AI home page |
| `allow_insecure` | boolean | `true` | Whether to allow insecure HTTPS connections (for self-signed certificates in local dev) |

### Enabling the EARS Test UI

The default URL for local EARS is already configured in `config/serverless.workplaceai.yml`. To enable the test UI, add the following to your `config/kibana.dev.yml` (this file is gitignored):

```yaml
xpack.workplaceAIApp.ears.ui_enabled: true
```

### Running EARS Locally

See the [EARS repository](https://github.com/elastic/elastic-auth-redirect-service) for instructions on how to run EARS locally. Once EARS is running, you can use the "Test the Elastic Auth Redirect Service" section on the Workplace AI home page to test OAuth flows.
