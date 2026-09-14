/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidFromObject } from '@kbn/entity-store/common/domain/euid';
import { getTargetEuidSourceFields } from '../target_euid';
import { buildIntegrationRuntimeEvals } from './enrichment_query';
import { parseEvalSnippet } from './merge_eval';
import { aws_bedrockEvaluations } from './integrations/aws_bedrock';
import { aws_securityhubEvaluations } from './integrations/aws_securityhub';
import { azure_openaiEvaluations } from './integrations/azure_openai';
import { azure_ai_foundryEvaluations } from './integrations/azure_ai_foundry';
import { gcp_vertexaiEvaluations } from './integrations/gcp_vertexai';
import baselines from './fixtures/cloud_targets_baseline.json';
import type { IntegrationEvaluations } from './types';

const integrations = [
  aws_bedrockEvaluations,
  aws_securityhubEvaluations,
  azure_openaiEvaluations,
  azure_ai_foundryEvaluations,
  gcp_vertexaiEvaluations,
] as const;

const targetAssignments = (integration: IntegrationEvaluations) => {
  const target = integration.evaluations.find(({ id }) => id === 'target');
  if (!target) throw new Error('Missing target phase');
  return parseEvalSnippet(target.esql);
};

describe('documentation-backed cloud targets', () => {
  it.each(integrations)(
    'preserves every original target branch for $integration',
    (integration) => {
      const original = parseEvalSnippet(baselines[integration.integration]);
      const current = targetAssignments(integration);
      for (const assignment of original) {
        const updated = current.find(({ column }) => column === assignment.column);
        expect(updated).toBeDefined();
        expect(updated?.hasPreserve).toBe(assignment.hasPreserve);
        expect(updated?.defaultValue).toBe(assignment.defaultValue);
        expect(updated?.branches.slice(0, assignment.branches.length)).toEqual(assignment.branches);
      }
    }
  );

  it.each([
    {
      integration: aws_bedrockEvaluations,
      condition:
        'data_stream.dataset == "aws_bedrock.invocation" AND gen_ai.request.model.id IS NOT NULL',
      value: 'gen_ai.request.model.id',
    },
    {
      integration: aws_bedrockEvaluations,
      condition:
        'data_stream.dataset == "aws_bedrock.invocation" AND aws_bedrock.invocation.model_id IS NOT NULL',
      value: 'aws_bedrock.invocation.model_id',
    },
    {
      integration: aws_securityhubEvaluations,
      condition:
        'data_stream.dataset == "aws_securityhub.finding" AND resource.type == "AWS::Lambda::Function" AND resource.id IS NOT NULL',
      value: 'resource.id',
    },
    {
      integration: azure_openaiEvaluations,
      condition:
        'data_stream.dataset == "azure_openai.logs" AND azure.open_ai.category IN ("Audit", "RequestResponse") AND azure.resource.id IS NOT NULL',
      value: 'azure.resource.id',
    },
    {
      integration: azure_ai_foundryEvaluations,
      condition:
        'data_stream.dataset == "azure_ai_foundry.logs" AND data_stream.type == "logs" AND azure.ai_foundry.category IN ("Audit", "RequestResponse") AND azure.resource.id IS NOT NULL',
      value: 'azure.resource.id',
    },
    {
      integration: gcp_vertexaiEvaluations,
      condition:
        'data_stream.dataset == "gcp_vertexai.auditlogs" AND gcp.vertexai.audit.resource_name IS NOT NULL',
      value: 'gcp.vertexai.audit.resource_name',
    },
  ])(
    'adds a guarded, resolvable $value target in $integration.integration',
    ({ integration, condition, value }) => {
      const assignment = targetAssignments(integration).find(
        ({ column }) => column === 'entity.target.id'
      );
      expect(assignment?.hasPreserve).toBe(true);
      expect(assignment?.branches).toContainEqual({ condition, value });
      expect(getTargetEuidSourceFields('generic')).toEqual(['entity.target.id']);
      const merged = buildIntegrationRuntimeEvals({ integrations: [integration.integration] });
      expect(merged).toContain(condition);
      expect(merged).toContain(value);
    }
  );

  it.each([
    ['Bedrock', 'anthropic.claude-3-haiku-20240307-v1:0', 'Bedrock'],
    ['Security Hub', 'arn:aws:lambda:us-east-1:123456789012:function:example', 'Lambda'],
    [
      'Azure OpenAI',
      '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/openai',
      'gpt-4o',
    ],
    [
      'Azure AI Foundry',
      '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/foundry',
      'deployment-a',
    ],
    ['Vertex AI', 'projects/project-a/locations/us-central1/endpoints/123', 'Vertex AI'],
  ])(
    'can add the %s resource identity alongside its existing service identity',
    (_name, resourceId, serviceName) => {
      // These are already-enriched fields, not execution of the ES|QL snippet.
      const existing = getEuidFromObject('service', { 'service.name': serviceName });
      const added = getEuidFromObject('generic', { 'entity.id': resourceId });
      expect(existing).toBe(`service:${serviceName}`);
      expect(added).toBe(resourceId);
      expect(new Set([existing, added]).size).toBe(2);
    }
  );

  it('prefers the canonical Bedrock model field before the provider-native fallback', () => {
    const assignment = targetAssignments(aws_bedrockEvaluations).find(
      ({ column }) => column === 'entity.target.id'
    );
    expect(assignment?.branches.map(({ value }) => value)).toEqual([
      'gen_ai.request.model.id',
      'aws_bedrock.invocation.model_id',
    ]);
  });
});
