/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { THREAT_REPORTS_INDEX } from '../../../common/threat_intel/constants';
import { rulesFieldMap } from '../../../common/field_maps';
import { installIndexTemplates } from '../setup/index_templates';

const ALERTS_INDEX = 'attribution-alerts-it';
const SPACE_ID = 'space-a';
const TECHNIQUE_FIELD = 'kibana.alert.rule.threat.technique.id';

interface WorkflowStep {
  name?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
}

const findStepByName = (steps: WorkflowStep[] | undefined, name: string): WorkflowStep => {
  for (const step of steps ?? []) {
    if (step.name === name) return step;
    const nested = steps && step.steps ? findStepByName(step.steps, name) : undefined;
    if (nested) return nested;
  }
  throw new Error(`step ${name} not found`);
};

type Engine = ReturnType<typeof createWorkflowLiquidEngine>;

// Mirrors `WorkflowTemplatingEngine.renderValueRecursively`.
const render = (engine: Engine, value: unknown, context: Record<string, unknown>): unknown => {
  if (typeof value === 'string') {
    if (value.startsWith('${{') && value.endsWith('}}')) {
      const expression = value.substring(1);
      const open = expression.indexOf('{{');
      const close = expression.lastIndexOf('}}');
      return engine.evalValueSync(expression.substring(open + 2, close).trim(), context);
    }
    return engine.parseAndRenderSync(value, context);
  }
  if (Array.isArray(value)) return value.map((item) => render(engine, item, context));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, render(engine, item, context)])
    );
  }
  return value;
};

interface TechniqueTag {
  id: string;
  subtechniques?: string[];
}

const buildThreat = (techniques: TechniqueTag[]) => [
  {
    framework: 'MITRE ATT&CK',
    tactic: {
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
    },
    technique: techniques.map(({ id, subtechniques }) => ({
      id,
      name: id,
      reference: `https://attack.mitre.org/techniques/${id}/`,
      ...(subtechniques
        ? {
            subtechnique: subtechniques.map((subId) => ({
              id: subId,
              name: subId,
              reference: `https://attack.mitre.org/techniques/${subId.replace('.', '/')}/`,
            })),
          }
        : {}),
    })),
  },
];

interface AlertSpec {
  techniques: TechniqueTag[];
  ruleType?: string;
  spaceId?: string;
  daysAgo?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const ALERTS: Record<string, AlertSpec> = {
  A1: { techniques: [{ id: 'T1059' }] },
  A2: { techniques: [{ id: 'T1059', subtechniques: ['T1059.004'] }] },
  A3: { techniques: [{ id: 'T1059', subtechniques: ['T1059.001'] }] },
  A4: {
    techniques: [{ id: 'T1059' }, { id: 'T1003', subtechniques: ['T1003.001'] }],
  },
  A5: { techniques: [{ id: 'T1566', subtechniques: ['T1566.001'] }] },
  A6: {
    techniques: [{ id: 'T1059', subtechniques: ['T1059.004'] }],
    ruleType: 'threat_match',
  },
  A7: {
    techniques: [{ id: 'T1059', subtechniques: ['T1059.004'] }],
    spaceId: 'space-b',
  },
  A8: {
    techniques: [{ id: 'T1059', subtechniques: ['T1059.004'] }],
    daysAgo: 8,
  },
  A9: { techniques: [{ id: 'T1098.001' }] },
};

interface ReportSpec {
  techniqueIds: string[] | null;
  today: number;
  after: number;
}

const REPORTS: Record<string, ReportSpec> = {
  R1: { techniqueIds: ['T1059'], today: 4, after: 4 },
  R2: { techniqueIds: ['T1059.004'], today: 0, after: 3 },
  R3: { techniqueIds: ['T1059', 'T1059.004'], today: 4, after: 4 },
  R4: { techniqueIds: ['T1059.004', 'T1059.001'], today: 0, after: 4 },
  R5: { techniqueIds: ['T1003.002'], today: 0, after: 0 },
  R6: { techniqueIds: [''], today: 0, after: 0 },
  R7: { techniqueIds: null, today: 0, after: 0 },
  R8: { techniqueIds: ['T1098.001'], today: 1, after: 1 },
  R9: { techniqueIds: ['T1566.001', 'T1566.001'], today: 0, after: 1 },
};

describe('attribute alerts to reports: layer 2 query against Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  const logger = loggingSystemMock.createLogger();
  const engine = createWorkflowLiquidEngine();

  const definition = getManagedWorkflowDefinition(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID);
  const workflow = parse(definition?.yaml ?? '') as { steps: WorkflowStep[] };
  const captureStep = findStepByName(workflow.steps, 'capture_report_ref');
  const layer2Step = findStepByName(workflow.steps, 'layer2_search');

  const reportHits: Record<string, { _id: string; _index: string; _source: unknown }> = {};

  const countAfter = async (reportName: string): Promise<number> => {
    const item = reportHits[reportName];
    const captured = render(engine, captureStep.with, { foreach: { item } }) as {
      technique_clauses: string;
    };
    const rendered = render(engine, layer2Step.with, {
      variables: { spaceId: SPACE_ID, technique_clauses: captured.technique_clauses },
      foreach: { item },
    }) as { size: number; query: Record<string, unknown> };
    const response = await esClient.search({
      index: ALERTS_INDEX,
      size: rendered.size,
      query: rendered.query,
      track_total_hits: true,
    });
    return (response.hits.total as { value: number }).value;
  };

  // The version 3 baseline, kept on purpose: the query this workflow ran before sub-technique
  // matching, with the same filters and only the technique lookup. It no longer exists in the
  // YAML, and is here to prove that no report's count goes down.
  const countToday = async (reportName: string): Promise<number> => {
    const item = reportHits[reportName];
    const response = await esClient.search({
      index: ALERTS_INDEX,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: 'now-7d' } } },
            { term: { 'kibana.space_ids': SPACE_ID } },
            {
              terms: {
                [TECHNIQUE_FIELD]: {
                  index: item._index,
                  id: item._id,
                  path: 'extracted.behaviors.technique_id',
                },
              },
            },
          ],
          must_not: [{ term: { 'kibana.alert.rule.type': 'threat_match' } }],
        },
      },
    });
    return (response.hits.total as { value: number }).value;
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient() as unknown as ElasticsearchClient;

    await esClient.indices.delete(
      { index: [THREAT_REPORTS_INDEX, ALERTS_INDEX], expand_wildcards: ['open', 'hidden'] },
      { ignore: [404] }
    );
    await installIndexTemplates({ esClient, logger });
    await esClient.indices.create({
      index: ALERTS_INDEX,
      mappings: mappingFromFieldMap({ ...technicalRuleFieldMap, ...rulesFieldMap }, false),
    });

    const now = Date.now();
    await esClient.bulk({
      refresh: true,
      operations: Object.entries(ALERTS).flatMap(
        ([name, { techniques, ruleType, spaceId, daysAgo }]) => [
          { index: { _index: ALERTS_INDEX, _id: name } },
          {
            '@timestamp': new Date(now - (daysAgo ?? 0) * DAY_MS - 60_000).toISOString(),
            'kibana.space_ids': [spaceId ?? SPACE_ID],
            'kibana.alert.rule.type': ruleType ?? 'query',
            'kibana.alert.rule.threat': buildThreat(techniques),
          },
        ]
      ),
    });

    await esClient.bulk({
      refresh: true,
      operations: Object.entries(REPORTS).flatMap(([name, { techniqueIds }]) => [
        { index: { _index: THREAT_REPORTS_INDEX, _id: name } },
        {
          extracted: {
            behaviors: (techniqueIds ?? []).map((techniqueId, index) => ({
              id: `${name}-b${index}`,
              technique_id: techniqueId,
              description: `behavior ${index}`,
              telemetry_targets: [],
              confidence: 0.9,
              llm_confidence: 0.9,
            })),
          },
        },
      ]),
    });

    const stored = await esClient.search({
      index: THREAT_REPORTS_INDEX,
      size: 20,
      expand_wildcards: ['open', 'hidden'],
    });
    stored.hits.hits.forEach(({ _id, _index, _source }) => {
      reportHits[_id as string] = { _id: _id as string, _index, _source };
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('loads the alerts and the reports it counts against', () => {
    expect(Object.keys(reportHits).sort()).toEqual(Object.keys(REPORTS).sort());
  });

  it.each(Object.entries(REPORTS))('counts %s the same as before or higher', async (name, spec) => {
    const today = await countToday(name);
    const after = await countAfter(name);
    expect({ today, after }).toEqual({ today: spec.today, after: spec.after });
    expect(after).toBeGreaterThanOrEqual(today);
  });
});
