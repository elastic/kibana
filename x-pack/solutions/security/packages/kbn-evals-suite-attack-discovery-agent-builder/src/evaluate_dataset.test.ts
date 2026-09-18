/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INDEX_FAMILY,
  buildWorkflow,
  computeWorkflowAlertCounts,
  extractAgentAlertRetrievalRowCounts,
  extractAgentEsqlRowCounts,
  extractRetrievalEvidence,
  extractUnscopedAlertRetrievalRowCounts,
  findAdToolResult,
  trackedStageKeys,
  trackedStages,
} from './evaluate_dataset';
import { createAdToolResultEvaluator } from './evaluators/ad_tool_result_evaluator';
import { AD2_SCENARIO_SEED_LABEL } from './scenario_registry';
import { EMPTY_RETRIEVAL_EVIDENCE, type AttackDiscoveryAgentBuilderTaskOutput } from './types';

/**
 * The recorded shape of the agent's ES|QL tool call (golden, all 9 dense reps):
 * `results[0]` echoes the submitted query (`type: 'query'`), `results[1]`
 * (`type: 'esql_results'`) carries the rows the agent received in
 * `data.values`. Only the row COUNT is read by the extraction below, so the
 * helper elides the row bodies instead of embedding 95 of them.
 */
const recordedEsqlStep = ({
  query,
  rows,
  includeResultQuery = true,
}: {
  query: string;
  rows: number;
  includeResultQuery?: boolean;
}): AttackDiscoveryAgentBuilderTaskOutput['steps'][number] => ({
  tool_id: 'platform.core.execute_esql',
  params: { query },
  results: [
    { type: 'query', data: { esql: query }, tool_result_id: 'query-echo' },
    {
      type: 'esql_results',
      data: {
        columns: [{ name: '_id', type: 'keyword' }],
        ...(includeResultQuery ? { query } : {}),
        source: 'esql',
        values: Array.from({ length: rows }, (_, index) => [`ad-scenario-alert-${index}`]),
      },
      tool_result_id: 'rows',
    },
  ],
});

// The query the AD default-retrieval tool returns and the agent runs against the
// seeded population (golden, every dense rep).
const denseRetrievalQuery =
  'FROM .alerts-security.alerts-default\n    METADATA _id\n  | WHERE @timestamp >= NOW() - 24 hours\n  | SORT kibana.alert.risk_score DESC, @timestamp DESC\n  | LIMIT 100';

describe('evaluate_dataset wiring', () => {
  // Smoke test: the refactor (Fix 5) moved evaluator construction into
  // src/evaluators/ factories. This guards against a wiring regression where
  // evaluate_dataset.ts silently stops using the extracted factory.
  it('createAdToolResultEvaluator produces a CODE evaluator named AdToolResult', () => {
    const evaluator = createAdToolResultEvaluator();

    expect(evaluator.name).toBe('AdToolResult');
    expect(evaluator.kind).toBe('CODE');
  });
});

describe('findAdToolResult', () => {
  // Fix 6 (Defect B): `buildSuccessResult`/`buildErrorResult`
  // (run_attack_discovery_tool/index.ts) return `{ data, tool_result_id, type }`
  // — `type` is a SIBLING of `data`, not a member of it. Reading
  // `data.type` made it always `undefined`, so `getAdStatus`'s
  // `resultType === 'error'` branch was unreachable and every AD tool error
  // was mislabelled as `status: null` ("no data") instead of `'error'`.
  //
  // The payload below is the real shape captured from a live converse
  // response against `security.attack-discovery.run`.
  it("labels an error result 'error' rather than null", () => {
    const result = findAdToolResult([
      {
        type: 'tool_call',
        tool_id: 'security.attack-discovery.run',
        results: [
          {
            data: { message: 'Attack Discovery workflows are not enabled for this space.' },
            tool_result_id: 'h4HKuy',
            type: 'error',
          },
        ],
      },
    ]);

    expect(result?.status).toBe('error');
  });

  it('reports a successful run as completed with its counts', () => {
    const result = findAdToolResult([
      {
        type: 'tool_call',
        tool_id: 'security.attack-discovery.run',
        results: [
          {
            data: {
              status: 'completed',
              execution_uuid: 'db82a24c-af29-40f5-b364-2b910ff3ccc0',
              alerts_context_count: 2,
              discovery_count: 1,
            },
            tool_result_id: 'ok1',
            type: 'other',
          },
        ],
      },
    ]);

    expect(result).toEqual({
      status: 'completed',
      executionUuid: 'db82a24c-af29-40f5-b364-2b910ff3ccc0',
      alertsContextCount: 2,
      discoveryCount: 1,
    });
  });

  it('returns undefined when the AD tool step never ran', () => {
    expect(
      findAdToolResult([{ tool_id: 'security.attack-discovery.get_status', results: [] }])
    ).toBeUndefined();
  });
});

describe('computeWorkflowAlertCounts', () => {
  // Fix 1: retrievedAlertCount and passedAlertCount must not both derive
  // from `adToolResult.alertsContextCount` (the PASSED count). Without the
  // fix, whenever the pipeline endpoint reports nothing for retrieval, the
  // retrieved count would silently mirror the passed count instead of
  // staying null.
  it('does not fall back to the passed count when the pipeline reports no retrieved count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.passedAlertCount).toBe(7);
    expect(result.retrievedAlertCount).toBeNull();
    expect(result.retrievedAlertCountSource).toBe('none');
  });

  it('uses alert_retrieval[0] as the primary retrieved-count source', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 12 }],
        combined_alerts: { alerts_context_count: 99 },
      },
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.retrievedAlertCount).toBe(12);
    expect(result.passedAlertCount).toBe(7);
  });

  it('falls back to combined_alerts only when alert_retrieval is absent, independently of the passed count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: { combined_alerts: { alerts_context_count: 20 } },
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.retrievedAlertCount).toBe(20);
    expect(result.passedAlertCount).toBe(7);
    expect(result.retrievedAlertCount).not.toBe(result.passedAlertCount);
  });

  it('leaves passedAlertCount null when adToolResult never reported a count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: { alert_retrieval: [{ alerts_context_count: 5 }] },
      adToolResult: undefined,
    });

    expect(result.passedAlertCount).toBeNull();
    expect(result.retrievedAlertCount).toBe(5);
  });
});

describe("the agent's own retrieval, read from the recorded steps", () => {
  it('derives the alerts-index family from the fixture index the suite seeds', () => {
    // Pins the derivation: without the suffix strip the family would be the whole
    // index name, and a space-scoped sibling index would stop matching.
    expect(ALERT_INDEX_FAMILY).toBe('.alerts-security.alerts');
  });

  it("counts the rows of the agent's alert retrieval (the recorded dense shape)", () => {
    const steps = [recordedEsqlStep({ query: denseRetrievalQuery, rows: 95 })];

    expect(extractAgentAlertRetrievalRowCounts(steps)).toEqual([95]);
    expect(extractAgentEsqlRowCounts(steps)).toEqual([95]);
  });

  // Measured on golden: two clean-profile reps ran ES|QL against
  // `logs-endpoint.events.process-default` and received 0 rows. Counting those
  // as a retrieval would report `retrievedAlertCount: 0` — a retrieval that
  // never happened — for runs that supplied their alerts instead.
  it('ignores an ES|QL result that did not read the alerts index', () => {
    const steps = [
      recordedEsqlStep({
        query: 'FROM logs-endpoint.events.process-default | WHERE host.name IN ("wks-karen-06")',
        rows: 0,
      }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps)).toEqual([]);
    expect(extractAgentEsqlRowCounts(steps)).toEqual([0]);
  });

  it('keeps every retrieval, so a narrowing query cannot hide the wider one', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, rows: 95 }),
      recordedEsqlStep({
        query: `${denseRetrievalQuery}\n  | WHERE host.name == "wks-karen-06"`,
        rows: 16,
      }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps)).toEqual([95, 16]);
  });

  it('falls back to the step params for the query text when the result carries none', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, rows: 95, includeResultQuery: false }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps)).toEqual([95]);
  });

  // The dense profile's retrieval question names the fixture marker and its
  // assertion is an EXACT population of a SHARED index, so a retrieval is
  // counted only when its query carries that marker.
  it('does not count an alerts query that omits the scope the example declares', () => {
    const steps = [
      // The reported payload: 95 rows read from the alerts index, none of them
      // this fixture's — accepted as a complete retrieval before the scope check.
      recordedEsqlStep({ query: 'FROM .alerts-security.alerts-default | LIMIT 95', rows: 95 }),
      // And the query the recorded dense reps actually ran (the AD default
      // query): all 18 recorded dense example-runs ran unscoped — 0/18 carried
      // the marker — so their 95 rows described the index at that moment.
      recordedEsqlStep({ query: denseRetrievalQuery, rows: 95 }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([]);
    expect(extractUnscopedAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([
      95, 95,
    ]);
    // The check belongs to the EXAMPLE, not to the extraction: with no scope
    // declared the same results still count, which is the shape the recorded
    // reps are replayed in.
    expect(extractAgentAlertRetrievalRowCounts(steps)).toEqual([95, 95]);
  });

  it('counts the retrieval when the query carries the scope the example declares', () => {
    const steps = [
      recordedEsqlStep({
        query: `FROM .alerts-security.alerts-default\n  | WHERE tags == "${AD2_SCENARIO_SEED_LABEL}"\n  | LIMIT 100`,
        rows: 95,
      }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([95]);
    expect(extractUnscopedAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([]);
  });

  // Every recorded golden rep whose question names a marker carried it in its
  // query, in four different spellings. A predicate parse would reject three of
  // them; the check is therefore a substring test on the query text.
  it('accepts every recorded spelling of the scope, not one predicate form', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const forms = [
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE tags LIKE "*${scope}*"`,
      `FROM .alerts-security.alerts-default | WHERE QSTR("${scope}")`,
      `FROM .alerts-security.alerts-default | WHERE message LIKE "*${scope}*" OR tags LIKE "*${scope}*"`,
    ];

    expect(
      forms.map((query) =>
        extractAgentAlertRetrievalRowCounts([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([[95], [95], [95], [95]]);
  });

  // The shared index at its worst: 95 fixture alerts plus two foreign ones. The
  // unscoped 97 describes the index, not the fixture, so it cannot become the
  // observed population while a scoped 95 can.
  it('keeps the scoped retrieval and excludes the unscoped one in the same run', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, rows: 97 }),
      recordedEsqlStep({
        query: `FROM .alerts-security.alerts-default\n  | WHERE tags == "${AD2_SCENARIO_SEED_LABEL}"`,
        rows: 95,
      }),
    ];

    expect(extractAgentAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([95]);
    expect(extractUnscopedAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([97]);
  });

  it('ignores the query-echo result and steps that are not ES|QL', () => {
    // `results[0]` has no `values`; a `security.attack-discovery.run` step is a
    // different tool whose count is a PASSED count. Neither may contribute.
    expect(
      extractAgentEsqlRowCounts([
        {
          tool_id: 'security.attack-discovery.run',
          results: [{ type: 'other', data: { alerts_context_count: 16 } }],
        },
        {
          tool_id: 'platform.core.execute_esql',
          results: [{ type: 'query', data: { esql: denseRetrievalQuery } }],
        },
      ])
    ).toEqual([]);
  });
});

describe('supplied alerts can never be read as retrieved', () => {
  // `get_pipeline_data` Step 2.5 writes the SUPPLIED alert set into the
  // retrieval block (`extraction_strategy: 'provided'`,
  // `alerts_context_count: providedAlerts.length`). That branch is unreachable
  // at this revision; making it reachable without this exclusion would score the
  // 7 provided-mode dense reps 16-vs-95 — a 0 that says nothing about retrieval.
  it('reads a provided-mode reconstruction as supplied, and scores the agent retrieval', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [
          {
            alerts: new Array(16).fill('alert'),
            alerts_context_count: 16,
            extraction_strategy: 'provided',
          },
        ],
        combined_alerts: { alerts: new Array(16).fill('alert'), alerts_context_count: 16 },
      },
      adToolResult: { status: 'completed', alertsContextCount: 16, discoveryCount: 4 },
      agentAlertRetrievalRowCounts: [95],
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('agent_esql_retrieval');
    expect(result.passedAlertCount).toBe(16);
  });

  it('reads a gate (skill) entry as passed, not retrieved', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 16, extraction_strategy: 'skill' }],
        combined_alerts: { alerts_context_count: 16 },
      },
      agentAlertRetrievalRowCounts: [95],
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('agent_esql_retrieval');
  });

  it('prefers the pipeline retrieval count when the retrieval phase ran (esql mode)', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 95, extraction_strategy: 'default_esql' }],
        combined_alerts: { alerts_context_count: 95 },
      },
      adToolResult: { status: 'completed', alertsContextCount: 95, discoveryCount: 5 },
      agentAlertRetrievalRowCounts: [95],
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('pipeline_alert_retrieval');
  });

  it('keeps the combined_alerts fallback for a retrieval entry with no count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: null, extraction_strategy: 'custom_workflow' }],
        combined_alerts: { alerts_context_count: 20 },
      },
    });

    expect(result.retrievedAlertCount).toBe(20);
    expect(result.retrievedAlertCountSource).toBe('pipeline_combined_alerts');
  });

  it('uses the largest of the agent retrievals as the observed population', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      agentAlertRetrievalRowCounts: [95, 16],
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('agent_esql_retrieval');
  });
});

describe('retrieval evidence persisted on the task output', () => {
  it('round-trips both response blocks when the response carries them', () => {
    const evidence = extractRetrievalEvidence({
      pipeline: {
        alert_retrieval: [
          {
            alerts: ['ALERT-A', 'ALERT-B'],
            alerts_context_count: 2,
            extraction_strategy: 'default_esql',
          },
        ],
        combined_alerts: { alerts: ['ALERT-A', 'ALERT-B'], alerts_context_count: 2 },
        diagnostics_context: { config: { alertRetrievalMode: 'custom_query' } },
        workflow_executions_tracking: {
          alert_retrieval: { workflow_id: 'w', workflow_run_id: 'r' },
          gate: null,
          generation: { workflow_id: 'g', workflow_run_id: 'gr' },
          validation: { workflow_id: 'v', workflow_run_id: 'vr' },
        },
      },
      agentEsqlRowCounts: [95],
    });

    expect(evidence).toEqual({
      alertRetrievalMode: 'custom_query',
      pipelineAlertRetrieval: [
        { alertsContextCount: 2, extractionStrategy: 'default_esql', alertsCount: 2 },
      ],
      pipelineCombinedAlerts: { alertsContextCount: 2, alertsCount: 2 },
      workflowExecutionsTrackingKeys: {
        alert_retrieval: true,
        gate: false,
        generation: true,
        validation: true,
      },
      agentEsqlRowCounts: [95],
      retrievalScope: null,
      unscopedAgentAlertRetrievalRowCounts: [],
    });
    // The raw alerts are the anonymized alert text: unbounded in size and copied
    // once per evaluator score document, while the set the agent saw is already
    // recorded in `steps`. Only the cardinality is persisted.
    expect(JSON.stringify(evidence)).not.toContain('ALERT-A');
  });

  it('records nulls for both blocks when the response carries neither (provided mode)', () => {
    const evidence = extractRetrievalEvidence({
      pipeline: {
        workflow_executions_tracking: {
          alert_retrieval: null,
          generation: { workflow_id: 'g', workflow_run_id: 'gr' },
          validation: { workflow_id: 'v', workflow_run_id: 'vr' },
        },
      },
      agentEsqlRowCounts: [95],
    });

    expect(evidence).toEqual({
      alertRetrievalMode: null,
      pipelineAlertRetrieval: null,
      pipelineCombinedAlerts: null,
      workflowExecutionsTrackingKeys: {
        alert_retrieval: false,
        generation: true,
        validation: true,
      },
      agentEsqlRowCounts: [95],
      retrievalScope: null,
      unscopedAgentAlertRetrievalRowCounts: [],
    });
  });

  // The scope a retrieval had to carry, and the retrievals excluded for not
  // carrying it, are persisted together: that is what makes an `N/A` read as
  // "the agent retrieved 97 rows unscoped" instead of "no retrieval happened".
  it('persists the declared scope and the retrievals it excluded', () => {
    const evidence = extractRetrievalEvidence({
      pipeline: null,
      agentEsqlRowCounts: [97, 95],
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: [97],
    });

    expect(evidence.retrievalScope).toBe(AD2_SCENARIO_SEED_LABEL);
    expect(evidence.unscopedAgentAlertRetrievalRowCounts).toEqual([97]);
    expect(evidence.agentEsqlRowCounts).toEqual([97, 95]);
  });

  it('records empty evidence when there is no pipeline response at all', () => {
    expect(extractRetrievalEvidence({ pipeline: null })).toEqual(EMPTY_RETRIEVAL_EVIDENCE);
  });

  it('derives `stages` and the persisted key booleans from one predicate', () => {
    const tracking = {
      alert_retrieval: { workflow_id: 'w' },
      gate: null,
      generation: { workflow_id: 'g' },
      validation: { workflow_id: 'v' },
    };

    expect(trackedStages(tracking)).toEqual(['alert_retrieval', 'generation', 'validation']);
    expect(trackedStageKeys(tracking)).toEqual({
      alert_retrieval: true,
      gate: false,
      generation: true,
      validation: true,
    });
  });

  // The end-to-end shape of the dense provided reps: the route reports neither
  // block, the agent's own retrieval returned the whole population (95), and 16
  // alerts were supplied — so the run must score against 95, from the agent.
  it('persists the evidence and reads a provided-mode run from the agent retrieval', () => {
    const workflow = buildWorkflow({
      pipeline: null,
      adToolResult: { status: 'completed', alertsContextCount: 16, discoveryCount: 4 },
      agentEsqlRowCounts: [95],
      agentAlertRetrievalRowCounts: [95],
    });

    expect(workflow).toEqual({
      stages: [],
      retrievedAlertCount: 95,
      retrievedAlertCountSource: 'agent_esql_retrieval',
      passedAlertCount: 16,
      validatedDiscoveryCount: 4,
      retrievalEvidence: { ...EMPTY_RETRIEVAL_EVIDENCE, agentEsqlRowCounts: [95] },
    });
  });

  // The same run, with the dense example's declared scope and a retrieval that
  // does not carry it (the recorded dense shape): nothing reported a count that
  // belongs to this fixture, so the run stays unscored and the evidence says why
  // — 97 rows retrieved unscoped, not "no retrieval".
  it('leaves the retrieved count null when the only alerts retrieval was unscoped', () => {
    const steps = [recordedEsqlStep({ query: denseRetrievalQuery, rows: 97 })];
    const workflow = buildWorkflow({
      pipeline: null,
      adToolResult: { status: 'completed', alertsContextCount: 16, discoveryCount: 4 },
      agentEsqlRowCounts: extractAgentEsqlRowCounts(steps),
      agentAlertRetrievalRowCounts: extractAgentAlertRetrievalRowCounts(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: extractUnscopedAlertRetrievalRowCounts(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
    });

    expect(workflow.retrievedAlertCount).toBeNull();
    expect(workflow.retrievedAlertCountSource).toBe('none');
    expect(workflow.passedAlertCount).toBe(16);
    expect(workflow.retrievalEvidence.retrievalScope).toBe(AD2_SCENARIO_SEED_LABEL);
    expect(workflow.retrievalEvidence.unscopedAgentAlertRetrievalRowCounts).toEqual([97]);
    expect(workflow.retrievalEvidence.agentEsqlRowCounts).toEqual([97]);
  });
});
