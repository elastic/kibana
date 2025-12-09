# Observability Agent Builder

This plugin provides an observability agent, observability tools and attachments for Agent Builder.

## Feature flag

The agent is hidden behind a feature flag. It can be enabled via kibana.yml:

```yml
feature_flags.overrides:
  observabilityAgent.enabled: true
```
