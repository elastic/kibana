/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIntegrationRuntimeEvals } from './enrichment_query';
import { parseEvalSnippet } from './merge_eval';

/**
 * LIKE type-safety for non-keyword fields (e.g. user.id mapped as long in some integrations)
 * is handled in two places:
 *
 *   1. aws_bedrock.ts: LIKE conditions are written as `TO_STRING(user.id) LIKE "arn:..."` so
 *      the operand is always keyword regardless of how user.id is mapped.
 *
 *   2. fetch_events_graph.ts: `| EVAL user.id = TO_STRING(user.id)` runs before the enrichment
 *      query, ensuring the preserve branch `user.id IS NOT NULL, user.id` in the merged CASE
 *      always returns keyword (fixing the "argument of [CASE] must be [long]" error).
 *
 * These tests verify the enrichment query emits exactly what the source integration files
 * contain — no extra wrapping is added by the merge layer.
 */
describe('buildIntegrationRuntimeEvals — LIKE conditions', () => {
  it('emits TO_STRING(user.id) LIKE as written in aws_bedrock.ts', () => {
    const query = buildIntegrationRuntimeEvals();
    expect(query).toContain('TO_STRING(user.id) LIKE');
  });

  it('does not emit bare user.id LIKE (no wrapping should be absent from source)', () => {
    const query = buildIntegrationRuntimeEvals();
    expect(query).not.toMatch(/\buser\.id\s+LIKE\b/);
  });
});

describe('buildIntegrationRuntimeEvals — CASE default type safety', () => {
  it('uses TO_STRING(null) as the default in every CASE expression to preserve KEYWORD type after constant folding', () => {
    // ES|QL partiallyFold folds CASE to its default when all conditions are constant-false
    // (e.g. after COALESCE makes data_stream.dataset a derived constant and user.id has been
    // pre-cast to KEYWORD so "user.id IS NOT NULL" folds to false). If the default is bare
    // `null` (null_type) but the CASE was typed as KEYWORD, partiallyFold throws
    // "partiallyFold produced type [NULL] but expected [KEYWORD]". Using TO_STRING(null) keeps
    // the default KEYWORD-typed, preventing the mismatch.
    const query = buildIntegrationRuntimeEvals();
    // bare `null` as a top-level CASE default must never appear
    expect(query).not.toMatch(/CASE\([^)]*,\s*\n\s*null\s*\n\s*\)/s);
    // every CASE default must be TO_STRING(null) instead
    expect(query).toMatch(/TO_STRING\(null\)/);
  });
});

describe('buildIntegrationRuntimeEvals — sysdig field names', () => {
  it('uses sysdig.vulnerability.resource_id, not the missing bare resource.id', () => {
    // sysdig.vulnerability data stream has no top-level "resource.id" field.
    // The correct field is "sysdig.vulnerability.resource_id" (keyword).
    // A bare "resource.id" would always be null-typed under SET unmapped_fields=NULLIFY,
    // silently producing null for entity.target.id on every sysdig vulnerability event.
    const query = buildIntegrationRuntimeEvals({ integrations: ['sysdig'] });
    expect(query).toContain('sysdig.vulnerability.resource_id');
    // Bare "resource.id" must not appear as a CASE return value
    expect(query).not.toMatch(/,\s*resource\.id,/);
  });
});

describe('buildIntegrationRuntimeEvals — integration actor and target fields', () => {
  it.each([
    {
      integration: 'aws_cloudtrail_otel',
      column: 'user.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method == "AttachUserPolicy" AND aws.request.parameters.userName IS NOT NULL',
          value: 'aws.request.parameters.userName',
        },
      ],
    },
    {
      integration: 'aws_cloudtrail_otel',
      column: 'user.target.name',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method == "AttachUserPolicy" AND aws.request.parameters.userName IS NOT NULL',
          value: 'aws.request.parameters.userName',
        },
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.service == "iam.amazonaws.com" AND rpc.method IN ("DetachUserPolicy", "CreateUser", "DeleteUser", "UpdateUser", "PutUserPolicy", "DeleteUserPolicy", "CreateAccessKey", "DeleteAccessKey", "UpdateAccessKey") AND aws.request.parameters.userName IS NOT NULL',
          value: 'aws.request.parameters.userName',
        },
      ],
    },
    {
      integration: 'aws_cloudtrail_otel',
      column: 'service.target.name',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method == "GetCallerIdentity" AND rpc.service IS NOT NULL',
          value: 'rpc.service',
        },
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.method IN ("PutObject", "GetObject") AND rpc.service IS NOT NULL',
          value: 'rpc.service',
        },
        {
          condition:
            'data_stream.dataset == "aws.cloudtrail.otel" AND rpc.service == "s3.amazonaws.com" AND rpc.method == "DeleteObject" AND aws.request.parameters.bucketName IS NOT NULL',
          value: 'aws.request.parameters.bucketName',
        },
      ],
    },
    {
      integration: 'aws_bedrock',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws_bedrock.invocation" AND gen_ai.request.model.id IS NOT NULL',
          value: 'gen_ai.request.model.id',
        },
        {
          condition:
            'data_stream.dataset == "aws_bedrock.invocation" AND aws_bedrock.invocation.model_id IS NOT NULL',
          value: 'aws_bedrock.invocation.model_id',
        },
      ],
    },
    {
      integration: 'aws_securityhub',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws_securityhub.finding" AND resource.type != "AWS::EC2::Instance" AND resource.type != "AWS::Lambda::Function" AND resource.type != "AWS::IAM::User"',
          value: 'resource.id',
        },
        {
          condition:
            'data_stream.dataset == "aws_securityhub.finding" AND resource.type == "AWS::Lambda::Function" AND resource.id IS NOT NULL',
          value: 'resource.id',
        },
      ],
    },
    {
      integration: 'azure_openai',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "azure_openai.logs" AND azure.open_ai.category IN ("Audit", "RequestResponse") AND azure.resource.id IS NOT NULL',
          value: 'azure.resource.id',
        },
      ],
    },
    {
      integration: 'azure_ai_foundry',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "azure_ai_foundry.logs" AND data_stream.type == "logs" AND azure.ai_foundry.category == "GatewayLogs"',
          value: 'azure.ai_foundry.properties.backend_response_body.id',
        },
        {
          condition:
            'data_stream.dataset == "azure_ai_foundry.logs" AND data_stream.type == "logs" AND azure.ai_foundry.category IN ("Audit", "RequestResponse") AND azure.resource.id IS NOT NULL',
          value: 'azure.resource.id',
        },
      ],
    },
    {
      integration: 'gcp_vertexai',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "gcp_vertexai.prompt_response_logs" AND gcp.vertexai.prompt_response_logs.request_id IS NOT NULL',
          value: 'gcp.vertexai.prompt_response_logs.request_id',
        },
        {
          condition:
            'data_stream.dataset == "gcp_vertexai.auditlogs" AND gcp.vertexai.audit.resource_name IS NOT NULL',
          value: 'gcp.vertexai.audit.resource_name',
        },
      ],
    },
    {
      integration: 'gcp_vertexai',
      column: 'entity.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "gcp_vertexai.auditlogs" AND gcp.vertexai.audit.authentication_info.principal_subject IS NOT NULL AND gcp.vertexai.audit.authentication_info.principal_subject != ""',
          value: 'gcp.vertexai.audit.authentication_info.principal_subject',
        },
      ],
    },
    {
      integration: 'slack',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "slack.audit" AND slack.audit.entity.entity_type == "file"',
          value: 'slack.audit.entity.id',
        },
        {
          condition:
            'data_stream.dataset == "slack.audit" AND slack.audit.entity.entity_type IN ("channel", "app", "workspace", "enterprise") AND slack.audit.entity.id IS NOT NULL',
          value: 'slack.audit.entity.id',
        },
      ],
    },
    {
      integration: 'slack',
      column: 'entity.target.name',
      branches: [
        {
          condition:
            'data_stream.dataset == "slack.audit" AND slack.audit.entity.entity_type == "file"',
          value: 'slack.audit.entity.name',
        },
        {
          condition:
            'data_stream.dataset == "slack.audit" AND slack.audit.entity.entity_type IN ("channel", "app", "workspace", "enterprise") AND slack.audit.entity.name IS NOT NULL',
          value: 'slack.audit.entity.name',
        },
      ],
    },
    {
      integration: 'm365_defender',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset IN ("m365_defender.event", "m365_defender.alert") AND file.hash.sha256 IS NOT NULL',
          value: 'file.hash.sha256',
        },
        {
          condition:
            'data_stream.dataset == "m365_defender.event" AND m365_defender.event.category == "AdvancedHunting-DeviceFileEvents" AND file.hash.sha1 IS NOT NULL',
          value: 'file.hash.sha1',
        },
      ],
    },
    {
      integration: 'aws_bedrock_agentcore',
      column: 'entity.target.id',
      branches: [
        {
          condition:
            'data_stream.dataset == "aws_bedrock_agentcore.gateway_application_logs" AND aws.bedrock_agentcore.gateway.target IS NOT NULL',
          value: 'aws.bedrock_agentcore.gateway.target',
        },
        {
          condition:
            'data_stream.dataset == "aws_bedrock_agentcore.runtime_application_logs" AND aws.bedrock_agentcore.resource_arn IS NOT NULL',
          value: 'aws.bedrock_agentcore.resource_arn',
        },
        {
          condition:
            'data_stream.dataset == "aws_bedrock_agentcore.memory_application_logs" AND aws.bedrock_agentcore.memory.resource_arn IS NOT NULL',
          value: 'aws.bedrock_agentcore.memory.resource_arn',
        },
      ],
    },
  ])(
    'preserves fallback conditions and order for $integration / $column',
    ({ integration, column, branches }) => {
      const query = buildIntegrationRuntimeEvals({ integrations: [integration] });
      const assignment = query
        .split('| EVAL')
        .flatMap((phase) => parseEvalSnippet(phase))
        .find((item) => item.column === column);

      expect({
        ...assignment,
        branches: assignment?.branches.map(({ condition, value }) => ({
          condition: condition.replace(/\s+/g, ' '),
          value,
        })),
      }).toEqual({
        column,
        hasPreserve: true,
        branches,
        defaultValue: 'TO_STRING(null)',
      });
    }
  );
});
