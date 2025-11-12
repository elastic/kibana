# Observability Agent

This plugin provides an agent specialized in logs, metrics, and traces for Agent Builder.

## Feature flag

The agent is hidden behind a feature flag. It can be enabled via kibana.yml:

```yml
feature_flags.overrides:
  observabilityAgent.enabled: true
```
