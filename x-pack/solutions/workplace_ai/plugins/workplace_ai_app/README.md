# WorkplaceAIApp

Workplace AI application plugin


## Enabling tracing

### Langsmith tracing

Enabling langsmith tracing can be done by adding the corresponding entry to your Kibana dev config file:

```yaml
xpack.workplaceAIApp.tracing.langsmith:
  enabled: true
  apiKey: {API-KEY}
  project: {project-name}
```