# Additive cloud graph runtime targets

This patch appends cloud fallbacks without changing existing CASE branches or their precedence. Existing request-ID, host, provider, and path mappings are retained; judging or replacing those identities is separate work. Azure App Service remains unchanged.

## AWS CloudTrail OTel additions

- IAM: an explicit request-parameter userName fills user.target.name for DetachUserPolicy, CreateUser, DeleteUser, UpdateUser, PutUserPolicy, DeleteUserPolicy, CreateAccessKey, DeleteAccessKey, and UpdateAccessKey. New branches require the aws.cloudtrail.otel dataset and iam.amazonaws.com service. The original AttachUserPolicy mapping remains unchanged, including its behavior when rpc.service is missing. No new user IDs are invented.
- S3: DeleteObject with an explicit bucketName fills service.target.name, scoped to aws.cloudtrail.otel and s3.amazonaws.com. This represents the containing bucket, not the object. Populated names remain authoritative. GetObject and PutObject keep their existing service-name identities; this patch does not replace them with bucket identities.

References:

- [CloudTrail record contents](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html)
- [IAM DeleteUser](https://docs.aws.amazon.com/IAM/latest/APIReference/API_DeleteUser.html)
- [Identifying S3 requests in CloudTrail](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-request-identification.html)

## Identity contract

The graph derives target EUIDs using Entity Store definitions with target field names. Currently, service identity uses service.target.name, not service.target.id; generic identity uses entity.target.id, not entity.target.name. A populated field in the preliminary target-exists check does not necessarily produce a node. The new fallbacks populate fields used by the resolver.

## Documentation-backed resource targets

These additions fill entity.target.id only when it is not already populated. They can add a resource-specific node alongside an existing service node, rather than renaming or replacing that service. Most source fields were already indexed, but were unused for generic node identity. Bedrock also gains a provider-native model_id fallback.

| Integration | Provider field → indexed field | Addition and boundary |
| --- | --- | --- |
| AWS Bedrock invocation | modelId → gen_ai.request.model.id, with aws_bedrock.invocation.model_id fallback | Model or inference-profile target, in addition to the existing service target. No blanket foundation-model classification: modelId can identify an inference profile. |
| AWS Security Hub | resources[].type / uid → resource.type / resource.id | Lambda resource target. The existing generic fallback excluded AWS::Lambda::Function, while its service.target.id alone could not produce a service EUID. Uses only the integration's selected primary resource, not uncorrelated array subfields. |
| Azure OpenAI | resourceId → azure.resource.id | Hosting Azure resource target for Audit and RequestResponse only. Existing model/service identities remain intact. This is the emitting account resource, not a claim that resourceId identifies a model deployment. |
| Azure AI Foundry | resourceId → azure.resource.id | Same hosting-resource target for Audit and RequestResponse logs. The existing GatewayLogs response-ID branch is untouched. |
| GCP Vertex AI audit | protoPayload.resourceName → gcp.vertexai.audit.resource_name | Audited resource or collection target alongside the existing Vertex AI service node. Prompt/response request-ID targets are unchanged. |

Provider references:

- [Bedrock invocation log entry format](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html): modelId is the model or inference profile used by the invocation.
- [Security Hub resource attributes](https://docs.aws.amazon.com/securityhub/latest/userguide/aws-extension-basic-attributes.html): type uses CloudFormation naming; uid identifies the resource. Not every uid is an ARN, so cross-account uniqueness must still be assessed.
- [Azure resource-log schema](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/resource-logs-schema): resourceId identifies the resource emitting the event.
- [Azure OpenAI monitoring reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/monitor-openai-reference): Audit and RequestResponse are resource-log categories.
- [Google AuditLog schema](https://docs.cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog): resourceName identifies the operation's target resource or collection, not necessarily a model.

Indexed-field evidence was checked in the integrations checkout at 4a1087c9761d2ee24a6bf9d20e9aae545eaf84fa:

- packages/aws_bedrock/data_stream/invocation/elasticsearch/ingest_pipeline/default.yml: modelId is renamed to model_id and copied into gen_ai.request.model.id (package 1.5.1).
- packages/aws_securityhub/data_stream/finding/elasticsearch/ingest_pipeline/default.yml: selected resource uid/type become resource.id/type (package 1.0.0).
- packages/azure_openai/data_stream/logs/elasticsearch/ingest_pipeline/default.yml and packages/azure_ai_foundry/data_stream/logs/elasticsearch/ingest_pipeline/default.yml: resourceId becomes azure.resource.id (packages 1.12.0 / 0.10.0).
- packages/gcp_vertexai/data_stream/auditlogs/elasticsearch/ingest_pipeline/default.yml and fields/fields.yml: resourceName becomes the keyword gcp.vertexai.audit.resource_name (package 1.4.0).

Deferred candidates: Bedrock GuardrailArn is available in aggregate CloudWatch metrics, not an individual actor/action event. Arbitrary request/response flattened subfields and nested resource arrays need indexed execution and correlation tests before use with the graph's unmapped_fields=NULLIFY configuration.

## Additional integrations

| Integration | Indexed field → output | Guard and preservation |
| --- | --- | --- |
| Slack | slack.audit.entity.id/name → entity.target.id/name | Adds channel, app, workspace, enterprise only. Existing user, file, and login mappings remain unchanged. |
| Microsoft 365 Defender | file.hash.sha1 → entity.target.id | Only m365_defender.event with category AdvancedHunting-DeviceFileEvents. Existing SHA-256 and native target IDs take precedence. |
| AWS Bedrock AgentCore | aws.bedrock_agentcore.resource_arn and aws.bedrock_agentcore.memory.resource_arn → entity.target.id | Runtime/memory application-log datasets only. Existing service and gateway targets remain unchanged. |
| GCP Vertex AI | gcp.vertexai.audit.authentication_info.principal_subject → entity.id | Nonempty audit-log principal subject. Generic actor fallback comes after user, host, and service resolution; native entity.id is preserved. It does not replace user.id or assert a human-user classification. |

Sources and indexed-field evidence:

- [Slack audit schema](https://docs.slack.dev/admins/audit-logs-api/). The slack audit pipeline renames entity.channel/app/workspace/enterprise into slack.audit.entity and retains entity_type. Both id and name are keywords.
- [Defender DeviceFileEvents](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicefileevents-table). Microsoft documents sparse SHA256 population and recommends SHA1. The m365_defender event pipeline_device.yml copies the subject-file SHA1 into file.hash.sha1; this is not InitiatingProcessSHA1.
- [AgentCore runtime application logs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-runtime-metrics.html) and [memory application logs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-memory-metrics.html). The respective integration field schemas expose resource_arn as keyword. These are application logs, not usage metrics.
- [Google AuthenticationInfo](https://docs.cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog). The Vertex AI audit ingest pipeline renames protoPayload.authenticationInfo.principalSubject to the keyword principal_subject field.

GitLab group targets remain deferred until a canonical instance identifier can scope numeric group IDs. Azure App Service file-audit targets remain deferred until category ingestion and path mapping are validated.

Identity limitations: SHA-1 and SHA-256 representations of the same file are not reconciled by this patch; raw Slack IDs retain the existing convention and need cross-organization validation. Resource-level and service-level nodes can coexist for one event. GCP principal subjects fill only otherwise-unresolved actors, so they may not increase coverage when a host/service already resolves.

## Validation boundary

enrichment_query.test.ts checks the generated assignments for the affected actor/target fields, plus the original CloudTrail user.target.id assignment. Each case names its integration and destination field, and asserts the exact conditions, values, fallback order, populated-value preservation, and typed null default. These are query-construction tests, not ES|QL execution tests.

fetch_events_graph.test.ts checks that principal-subject enrichment appears before actor resolution and generic entity.id remains last in its COALESCE. Elasticsearch calls in that test are mocked.

Live Elasticsearch execution and before/after node-set comparisons remain required. Test missing parameters, wrong services/datasets, populated targets, and OTel field encoding using indexed fixtures. Compare resolved identities per event, not only non-null field counts. Previously resolved identities should be a subset of the new result for these additive fallbacks. Real-world precision and recall have not been measured.
