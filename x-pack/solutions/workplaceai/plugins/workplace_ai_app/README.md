# WorkplaceAIApp

Workplace AI application plugin

## Quickstart:

### Setup
```yaml
nvm use
yarn kbn bootstrap
```

### Start ES
```yaml
yarn es serverless --projectType workplaceai
```

### Start Workplace AI in Kibana
```yaml
yarn serverless-workplace-ai
```

## Enabling tracing

### Langsmith tracing

Enabling langsmith tracing can be done by adding the corresponding entry to your Kibana dev config file:

```yaml
xpack.workplaceAIApp.tracing.langsmith:
  enabled: true
  apiKey: {API-KEY}
  project: {project-name}
```