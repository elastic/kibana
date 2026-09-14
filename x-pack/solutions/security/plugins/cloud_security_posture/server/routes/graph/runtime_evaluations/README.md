# Integration runtime evaluations

The files in [integrations/](./integrations/) supply actor, action, target, and classification fields for integration events. [enrichment_query.ts](./enrichment_query.ts) merges their CASE assignments into the graph's ES|QL enrichment pipeline.

## Adding a field mapping

- Use the provider's field documentation to establish what a value identifies: the caller, affected user, resource, or containing service.
- Check the integration's ingest pipeline and field mappings for the indexed name and type. Provider JSON paths are not necessarily Elasticsearch field names.
- Scope the condition to the dataset and, where needed, operation, service, or category. Handle absent values.
- Preserve populated output fields and existing fallback order. Append a fallback after the branches it must not override.
- Populate a field used by node identity resolution. Service targets use `service.target.name`; generic targets use `entity.target.id`. A name or service ID alone is not enough for a generic target.
- Keep identity and classification separate. A model identifier may identify an inference profile; a principal subject is not necessarily a human user.
- Check tenant/account scope and array correlation before using raw IDs or resource arrays.

See [target_euid.ts](../target_euid.ts) for target identity fields and [NULLIFY_WORKAROUNDS.md](./NULLIFY_WORKAROUNDS.md) for the existing ES|QL field-type constraints.

## Mapping examples and sources

These examples explain field choices in the evaluators; they are not a complete list of supported integrations. Existing branches and populated identities take precedence.

| Integration | Indexed field → output | Meaning and provider source |
| --- | --- | --- |
| AWS CloudTrail OTel | `aws.request.parameters.userName` → `user.target.name`; `aws.request.parameters.bucketName` → `service.target.name` | IAM request user, not caller; S3 DeleteObject's containing bucket, not object. See [IAM UserName example](https://docs.aws.amazon.com/IAM/latest/APIReference/API_DeleteUser.html#API_DeleteUser_RequestParameters), [DeleteObject Bucket](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html#AmazonS3-DeleteObject-request-header-Bucket), and [CloudTrail bucketName examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-request-identification.html#ct-examples-identify-object-access-requests). |
| AWS Bedrock | `gen_ai.request.model.id`, then `aws_bedrock.invocation.model_id` → `entity.target.id` | [Invocation log modelId](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html#model-invocation-log-format): invoked model or inference profile. |
| AWS Security Hub | `resource.id` → `entity.target.id` for `AWS::Lambda::Function` | Selected resource's [identifier](https://docs.aws.amazon.com/securityhub/latest/userguide/aws-extension-basic-attributes.html#resource-id) and [type](https://docs.aws.amazon.com/securityhub/latest/userguide/aws-extension-basic-attributes.html#resource-type); the ID is not always an ARN. |
| Azure OpenAI / AI Foundry | `azure.resource.id` → `entity.target.id` for Audit / RequestResponse | [resourceId](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/resource-logs-schema#top-level-common-schema) identifies the emitting account resource, not a model deployment. See the [account log categories](https://learn.microsoft.com/en-us/azure/foundry/openai/monitor-openai-reference#supported-resource-logs-for-microsoftcognitiveservicesaccounts). GatewayLogs mappings remain separate. |
| GCP Vertex AI | `gcp.vertexai.audit.resource_name` → `entity.target.id`; `gcp.vertexai.audit.authentication_info.principal_subject` → `entity.id` | [resourceName](https://docs.cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog#FIELDS.resource_name) identifies the target resource or collection; [principalSubject](https://docs.cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog#AuthenticationInfo.FIELDS.principal_subject) identifies the caller. Generic actor resolution follows user, host, and service resolution. |
| Slack | `slack.audit.entity.id/name` → `entity.target.id/name` for channel, app, workspace, enterprise | [Audit event entity](https://docs.slack.dev/admins/audit-logs-api/#audit-event). The ingest pipeline flattens the typed entity object. Raw IDs need cross-organization uniqueness checks. |
| Microsoft 365 Defender | `file.hash.sha1` → `entity.target.id` for DeviceFileEvents, after SHA-256 | [DeviceFileEvents SHA1/SHA256 columns](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicefileevents-table#devicefileevents): hash of the affected file, not the initiating process. SHA-1 and SHA-256 identities for the same file are not reconciled. |
| AWS Bedrock AgentCore | `aws.bedrock_agentcore.resource_arn` / `aws.bedrock_agentcore.memory.resource_arn` → `entity.target.id` | Resource ARN in [runtime application logs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-runtime-metrics.html#observability-runtime-application-log-data) and [memory logs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-memory-metrics.html#memory_logs_summary), not aggregate usage metrics. |

Indexed names were checked against the [Elastic integrations source at 4a1087c9761d2ee24a6bf9d20e9aae545eaf84fa](https://github.com/elastic/integrations/tree/4a1087c9761d2ee24a6bf9d20e9aae545eaf84fa/packages). Recheck the relevant package's ingest pipeline and field definitions when extending these mappings.

## Testing

Add integration-specific query-construction checks to [enrichment_query.test.ts](./enrichment_query.test.ts). Check the destination, exact conditions and values, populated-value preservation, fallback order, and typed null default. Actor-resolution order is checked in [fetch_events_graph.test.ts](../fetch_events_graph.test.ts).

These unit tests do not execute ES|QL against Elasticsearch. Before claiming improved coverage, run the merged query against indexed events, including missing fields, wrong datasets/services, and existing target IDs. Compare resolved node sets before and after, not just non-null fields or total node counts: an event can have both resource and service nodes.
