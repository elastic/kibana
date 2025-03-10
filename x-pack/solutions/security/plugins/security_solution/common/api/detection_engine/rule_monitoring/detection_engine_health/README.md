# Detection Engine health API

Epic: https://github.com/elastic/kibana/issues/125642

This health API allows users to get health overview of the Detection Engine across the whole cluster, or within a given Kibana space, or for a given rule. It can be useful for troubleshooting issues with cluster provisioning/scaling, issues with certain rules failing or generating too much load on the cluster, identifying common rule execution errors, etc.

In the future, this API might become helpful for building more Rule Monitoring UIs giving our users more clarity and transparency about the work of the Detection Engine.

See more info:

- [Detection Engine health data](./health_data.md)
- [Detection Engine health endpoints](./health_endpoints.md)
