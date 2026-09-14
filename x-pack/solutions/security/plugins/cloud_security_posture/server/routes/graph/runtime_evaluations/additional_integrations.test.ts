/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidFromObjectForSearch } from '@kbn/entity-store/common/domain/euid';
import { buildIntegrationRuntimeEvals } from './enrichment_query';
import { parseEvalSnippet } from './merge_eval';
import { slackEvaluations } from './integrations/slack';
import { m365_defenderEvaluations } from './integrations/m365_defender';
import { aws_bedrock_agentcoreEvaluations } from './integrations/aws_bedrock_agentcore';
import { gcp_vertexaiEvaluations } from './integrations/gcp_vertexai';
import baselines from './fixtures/additional_integrations_baseline.json';
import type { IntegrationEvaluations } from './types';

const integrations = [
  slackEvaluations,
  m365_defenderEvaluations,
  aws_bedrock_agentcoreEvaluations,
  gcp_vertexaiEvaluations,
] as const;

const assignmentFor = (integration: IntegrationEvaluations, phase: string, column: string) => {
  const snippet = integration.evaluations.find(({ id }) => id === phase);
  const assignment = parseEvalSnippet(snippet?.esql ?? '').find((item) => item.column === column);
  if (!assignment) throw new Error(`Missing ${phase} assignment for ${column}`);
  return assignment;
};

describe('additional documented integration fallbacks', () => {
  it.each(integrations)('retains every existing evaluation for $integration', (integration) => {
    for (const [phase, snippet] of Object.entries(baselines[integration.integration])) {
      for (const original of parseEvalSnippet(snippet)) {
        const current = assignmentFor(integration, phase, original.column);
        expect(current.hasPreserve).toBe(original.hasPreserve);
        expect(current.defaultValue).toBe(original.defaultValue);
        expect(current.branches.slice(0, original.branches.length)).toEqual(original.branches);
      }
    }
  });

  it.each(['id', 'name'])('adds Slack %s only for the documented new entity types', (field) => {
    const assignment = assignmentFor(slackEvaluations, 'target', `entity.target.${field}`);
    expect(assignment.hasPreserve).toBe(true);
    expect(assignment.branches).toHaveLength(2);
    expect(assignment.branches[1]).toEqual({
      condition: `data_stream.dataset == "slack.audit" AND slack.audit.entity.entity_type IN ("channel", "app", "workspace", "enterprise") AND slack.audit.entity.${field} IS NOT NULL`,
      value: `slack.audit.entity.${field}`,
    });
  });

  it('uses Defender SHA-1 only after SHA-256, and only for DeviceFileEvents', () => {
    const assignment = assignmentFor(m365_defenderEvaluations, 'target', 'entity.target.id');
    expect(assignment.hasPreserve).toBe(true);
    expect(assignment.branches).toHaveLength(2);
    expect(assignment.branches[0].value).toBe('file.hash.sha256');
    expect(assignment.branches[1]).toEqual({
      condition:
        'data_stream.dataset == "m365_defender.event" AND m365_defender.event.category == "AdvancedHunting-DeviceFileEvents" AND file.hash.sha1 IS NOT NULL',
      value: 'file.hash.sha1',
    });
  });

  it('keeps gateway targets before adding AgentCore runtime and memory ARNs', () => {
    const assignment = assignmentFor(
      aws_bedrock_agentcoreEvaluations,
      'target',
      'entity.target.id'
    );
    expect(assignment.hasPreserve).toBe(true);
    expect(assignment.branches).toHaveLength(3);
    expect(assignment.branches[0].value).toBe('aws.bedrock_agentcore.gateway.target');
    expect(assignment.branches.slice(1)).toEqual([
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
    ]);
  });

  it('adds nonempty GCP principal subjects as generic actors without changing user assignments', () => {
    const assignment = assignmentFor(gcp_vertexaiEvaluations, 'actor', 'entity.id');
    expect(assignment.hasPreserve).toBe(true);
    expect(assignment.branches).toEqual([
      {
        condition:
          'data_stream.dataset == "gcp_vertexai.auditlogs" AND gcp.vertexai.audit.authentication_info.principal_subject IS NOT NULL AND gcp.vertexai.audit.authentication_info.principal_subject != ""',
        value: 'gcp.vertexai.audit.authentication_info.principal_subject',
      },
    ]);
    const originalActor = parseEvalSnippet(baselines.gcp_vertexai.actor);
    for (const original of originalActor.filter(({ column }) => column.startsWith('user.'))) {
      expect(assignmentFor(gcp_vertexaiEvaluations, 'actor', original.column)).toEqual(original);
    }
  });

  it.each(integrations)(
    'keeps new source fields in the merged $integration query',
    (integration) => {
      const query = buildIntegrationRuntimeEvals({ integrations: [integration.integration] });
      const snippets = integration.evaluations.filter(
        ({ id }) => id === 'actor' || id === 'target'
      );
      for (const snippet of snippets) {
        for (const assignment of parseEvalSnippet(snippet.esql)) {
          for (const { condition } of assignment.branches) {
            expect(query).toContain(condition);
          }
        }
      }
    }
  );

  it.each([
    'C123ABC456',
    'A123ABC456',
    'T123ABC456',
    'E123ABC456',
    'a'.repeat(40),
    'arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/example',
    'arn:aws:bedrock-agentcore:us-east-1:123456789012:memory/example',
    'principal://iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/subject/example',
  ])('resolves the already-enriched generic identity %s', (id) => {
    expect(getEuidFromObjectForSearch('generic', { 'entity.id': id })).toBe(id);
  });
});
