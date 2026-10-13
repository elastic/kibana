/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
} from '@kbn/agentic-investigations-plugin/common';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed';
import { parse } from 'yaml';
import {
  AlertAnalysisWorkflowOutput,
  AlertAnalysisWorkflowOutputFields,
  AlertAnalysisWorkflowSettings,
  isThresholdRangeValid,
} from './alert_analysis_workflow';

const baseSettings = {
  autoCloseEnabled: true,
  autoCloseConfidenceScoreMinThreshold: 0.85,
  autoCloseConfidenceScoreMaxThreshold: 1,
  agentId: 'elastic-ai-agent',
  tagPrefix: 'alert-analysis',
};

describe('AlertAnalysisWorkflowSettings tagPrefix validation', () => {
  it.each(['alert-analysis', 'security.alert.analysis', 'alert_analysis', 'aa123'])(
    'accepts the valid tag prefix %p',
    (tagPrefix) => {
      expect(AlertAnalysisWorkflowSettings.safeParse({ ...baseSettings, tagPrefix }).success).toBe(
        true
      );
    }
  );

  // The prefix is interpolated into Liquid expression strings, so quotes, braces, pipes, spaces,
  // and empty values must be rejected before they can break the workflow at run time. Prefixes made
  // up of only punctuation (e.g. '.', '_', '-') are also rejected: they pass the charset check but
  // carry no meaningful namespace, so at least one letter or number is required.
  it.each([
    '',
    '   ',
    'foo"bar',
    'foo{{bar}}',
    'a|b',
    'has space',
    'tag:value',
    '.',
    '_',
    '-',
    '._-',
  ])('rejects the unsafe tag prefix %p', (tagPrefix) => {
    expect(AlertAnalysisWorkflowSettings.safeParse({ ...baseSettings, tagPrefix }).success).toBe(
      false
    );
  });
});

describe('isThresholdRangeValid', () => {
  it('is valid when min is lower than max', () => {
    expect(
      isThresholdRangeValid({
        autoCloseConfidenceScoreMinThreshold: 0.5,
        autoCloseConfidenceScoreMaxThreshold: 0.9,
      })
    ).toBe(true);
  });

  it('is invalid when min is greater than or equal to max', () => {
    expect(
      isThresholdRangeValid({
        autoCloseConfidenceScoreMinThreshold: 0.9,
        autoCloseConfidenceScoreMaxThreshold: 0.9,
      })
    ).toBe(false);
  });
});

describe('AlertAnalysisWorkflowOutput', () => {
  const sampleOutput = {
    verdicts: [
      {
        alert_id: 'a1',
        classification: 'true_positive' as const,
        confidence_score: 0.9,
        rationale: 'c2 url',
        contributing_factors: ['external url'],
        host_name: 'ws-1',
        host_entity_key: 'HW-UUID-1',
        user_name: 'alice',
      },
      {
        alert_id: 'a2',
        classification: 'false_positive' as const,
        confidence_score: 0.8,
        rationale: 'signed installer',
        contributing_factors: ['vendor signature'],
        host_name: 'ws-1',
        host_entity_key: 'HW-UUID-1',
        user_name: 'bob',
      },
    ],
    false_positive_count: 1,
    true_positive_count: 1,
    inconclusive_count: 0,
    auto_closed_ids: [] as string[],
    grouped_counts_summary: ' 2 alert(s) for host ws-1 classified as true positive.',
    generated_summary: 'Hosts look compromised.',
    connector_id: 'connector-1',
    agent_id: 'elastic-ai-agent',
    impacted_entities: [{ id: 'host:ws-1', name: 'ws-1', type: 'host' as const }],
    missing_alert_ids: [] as string[],
  };

  it('accepts a full workflow.output payload including attribution and impact fields', () => {
    const parsed = AlertAnalysisWorkflowOutput.safeParse(sampleOutput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.verdicts[0].host_name).toBe('ws-1');
      expect(parsed.data.impacted_entities).toHaveLength(1);
      expect(parsed.data.generated_summary).toBe('Hosts look compromised.');
    }
  });

  it('rejects when verdict counts do not sum to verdicts.length', () => {
    expect(
      AlertAnalysisWorkflowOutput.safeParse({
        ...sampleOutput,
        true_positive_count: 0,
      }).success
    ).toBe(false);
  });

  it('rejects when a count does not match its classification (swapped counts)', () => {
    expect(
      AlertAnalysisWorkflowOutput.safeParse({
        ...sampleOutput,
        // Totals still sum to verdicts.length, but classifications are swapped.
        true_positive_count: 0,
        false_positive_count: 2,
        inconclusive_count: 0,
      }).success
    ).toBe(false);
  });

  it('rejects when impacted_entities exceeds 100', () => {
    expect(
      AlertAnalysisWorkflowOutput.safeParse({
        ...sampleOutput,
        impacted_entities: Array.from({ length: 101 }, (_, i) => ({
          id: `host:host-${i}`,
          name: `host-${i}`,
          type: 'host' as const,
        })),
      }).success
    ).toBe(false);
  });

  it('rejects when a verdict has more than 3 contributing_factors', () => {
    expect(
      AlertAnalysisWorkflowOutput.safeParse({
        ...sampleOutput,
        verdicts: [
          {
            ...sampleOutput.verdicts[0],
            contributing_factors: ['a', 'b', 'c', 'd'],
          },
        ],
        true_positive_count: 1,
        false_positive_count: 0,
        inconclusive_count: 0,
      }).success
    ).toBe(false);
  });

  it('rejects when rationale exceeds 500 characters', () => {
    expect(
      AlertAnalysisWorkflowOutput.safeParse({
        ...sampleOutput,
        verdicts: [
          {
            ...sampleOutput.verdicts[0],
            rationale: 'x'.repeat(501),
          },
        ],
        true_positive_count: 1,
        false_positive_count: 0,
        inconclusive_count: 0,
      }).success
    ).toBe(false);
  });
});

describe('AlertAnalysisWorkflowOutput YAML sync', () => {
  it('keeps Zod output keys and truncated enum aligned with the managed YAML schema', () => {
    const workflow = parse(SECURITY_ALERT_ANALYSIS_WORKFLOW.yaml) as {
      outputs: {
        required: string[];
        properties: Record<
          string,
          {
            enum?: string[];
            maxItems?: number;
            items?: {
              required?: string[];
              properties?: Record<
                string,
                { maxLength?: number; maxItems?: number; enum?: string[] }
              >;
            };
            maxLength?: number;
          }
        >;
      };
    };

    const zodKeys = Object.keys(AlertAnalysisWorkflowOutputFields.shape).sort();
    const yamlKeys = Object.keys(workflow.outputs.properties).sort();
    expect(yamlKeys).toEqual(zodKeys);
    expect([...workflow.outputs.required].sort()).toEqual(zodKeys);

    // The YAML carries literal values; they must stay on the shared impact limits, or the
    // output validates while the attachImpact step rejects the same entities.
    const impactedEntity = workflow.outputs.properties.impacted_entities;
    expect(impactedEntity.maxItems).toBe(MAX_ENTITY_IDS);
    expect(impactedEntity.items?.properties?.id?.maxLength).toBe(MAX_ENTITY_ID_LENGTH);
    expect(impactedEntity.items?.properties?.name?.maxLength).toBe(MAX_ENTITY_NAME_LENGTH);
    expect(impactedEntity.items?.properties?.type?.enum).toEqual(['host', 'user']);
    expect(workflow.outputs.properties.missing_alert_ids?.maxItems).toBe(1000);
    expect(workflow.outputs.properties.verdicts.items?.properties?.rationale?.maxLength).toBe(500);
    expect(
      workflow.outputs.properties.verdicts.items?.properties?.contributing_factors?.maxItems
    ).toBe(3);
  });
});
