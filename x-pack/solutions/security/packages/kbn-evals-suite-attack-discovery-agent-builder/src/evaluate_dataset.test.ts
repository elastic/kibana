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
  createEvaluateAttackDiscoveryAgentBuilderDataset,
  extractAdToolEsqlQuery,
  extractAgentAlertRetrievalPopulation,
  extractAgentEsqlRowCounts,
  extractRetrievalEvidence,
  extractUnscopedAlertRetrievalRowCounts,
  findAdToolResult,
  insightsFromValidatedDiscoveries,
  trackedStageKeys,
  waitForValidationPhase,
  WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS,
  trackedStages,
} from './evaluate_dataset';
import { createAdToolResultEvaluator } from './evaluators/ad_tool_result_evaluator';
import { AD2_SCENARIO_SEED_LABEL } from './scenario_registry';
import { EMPTY_RETRIEVAL_EVIDENCE, type AttackDiscoveryAgentBuilderTaskOutput } from './types';

/**
 * The recorded shape of the agent's ES|QL tool call (golden, all 9 dense reps):
 * `results[0]` echoes the submitted query (`type: 'query'`), `results[1]`
 * (`type: 'esql_results'`) carries the rows the agent received in
 * `data.values` plus the `_id` of each row. The helper elides the row bodies
 * instead of embedding 95 of them, and lets a test override the identities (to
 * model a retrieval split across calls) or drop the `_id` column entirely.
 */
const recordedEsqlStep = ({
  query,
  rows,
  ids,
  includeResultQuery = true,
  includeIdColumn = true,
}: {
  query: string;
  rows?: number;
  ids?: string[];
  includeResultQuery?: boolean;
  includeIdColumn?: boolean;
}): AttackDiscoveryAgentBuilderTaskOutput['steps'][number] => {
  const alertIds =
    ids ?? Array.from({ length: rows ?? 0 }, (_, index) => `ad-scenario-alert-${index}`);

  return {
    tool_id: 'platform.core.execute_esql',
    params: { query },
    results: [
      { type: 'query', data: { esql: query }, tool_result_id: 'query-echo' },
      {
        type: 'esql_results',
        data: {
          columns: includeIdColumn
            ? [{ name: '_id', type: 'keyword' }]
            : [{ name: 'message', type: 'text' }],
          ...(includeResultQuery ? { query } : {}),
          source: 'esql',
          values: alertIds.map((id) => [includeIdColumn ? id : `row for ${id}`]),
        },
        tool_result_id: 'rows',
      },
    ],
  };
};

/** The AD tool call, whose `params.esql_query` is what the pipeline's own
 *  Alert Retrieval phase runs (recorded dense rep 2 shape: mode `esql`). */
const recordedAdStep = ({
  esqlQuery,
  executionUuid = 'e0e0e0e0-0000-0000-0000-000000000000',
}: {
  esqlQuery?: string;
  executionUuid?: string;
}): AttackDiscoveryAgentBuilderTaskOutput['steps'][number] => ({
  tool_id: 'security.attack-discovery.run',
  params: {
    alert_retrieval_mode: esqlQuery == null ? 'custom_query' : 'esql',
    ...(esqlQuery == null ? {} : { esql_query: esqlQuery }),
  },
  results: [
    {
      type: 'other',
      data: {
        status: 'completed',
        execution_uuid: executionUuid,
        alerts_context_count: 16,
        discovery_count: 4,
      },
      tool_result_id: 'ad-1',
    },
  ],
});

/** 95 distinct ids, in the order a full retrieval returns them. */
const denseAlertIds = (count: number, offset = 0): string[] =>
  Array.from({ length: count }, (_, index) => `ad-scenario-alert-${offset + index}`);

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

    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(95);
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

    expect(extractAgentAlertRetrievalPopulation(steps)).toBeNull();
    expect(extractAgentEsqlRowCounts(steps)).toEqual([0]);
  });

  // The reported defect: reading one result's row count as the population
  // scores a retrieval that was simply split. Two scoped calls returning 50 and
  // 45 DISTINCT alerts of the 95-alert fixture have observed all 95, and the
  // recorded ES|QL payload carries each row's `_id`, so the identities union.
  it('unions the distinct alerts a split retrieval returned', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, ids: denseAlertIds(50) }),
      recordedEsqlStep({
        query: `${denseRetrievalQuery}\n  | WHERE host.name == "wks-karen-06"`,
        ids: denseAlertIds(45, 50),
      }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(95);
  });

  it('counts an alert once, however many retrievals returned it', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, ids: denseAlertIds(95) }),
      recordedEsqlStep({
        query: `${denseRetrievalQuery}\n  | WHERE host.name == "wks-karen-06"`,
        ids: denseAlertIds(16),
      }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(95);
  });

  // A query that keeps no identity (`KEEP` without `METADATA _id`) cannot be
  // unioned — its rows' identities are unknown — and its row count is not a
  // count of distinct alerts either: `MV_EXPAND` or an aggregation makes rows
  // that are not one-to-one with the alerts behind them, so admitting the count
  // let a scoped query over FEWER distinct alerts score as a complete
  // retrieval. It contributes nothing; the row count survives only as
  // diagnostics.
  it('refuses to take an id-less row count as the alert population', () => {
    const steps = [
      recordedEsqlStep({
        query: denseRetrievalQuery,
        rows: 95,
        includeIdColumn: false,
      }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps)).toBeNull();
    // Diagnostics keep the observation so the null is still explainable.
    expect(extractAgentEsqlRowCounts(steps)).toEqual([95]);
  });

  it('counts only the id-bearing results, never an id-less row count alongside them', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, ids: denseAlertIds(50) }),
      recordedEsqlStep({
        query: `${denseRetrievalQuery}\n  | WHERE host.name == "wks-karen-06"`,
        rows: 45,
        includeIdColumn: false,
      }),
    ];

    // 50, not max(50, 45)=50 and not 95: the id-less result cannot be shown to
    // hold 45 DISTINCT alerts of this fixture, so it adds nothing.
    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(50);
  });

  // The reported defect: an id-less result whose inflated row count exceeds the
  // id union used to become the population, so a scoped query touching fewer
  // distinct alerts than the fixture holds could still score a full retrieval.
  it('does not let an inflated id-less row count outrank the id union', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, ids: denseAlertIds(10) }),
      recordedEsqlStep({
        query: `${denseRetrievalQuery}\n  | MV_EXPAND process.args`,
        rows: 95,
        includeIdColumn: false,
      }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(10);
  });

  it('falls back to the step params for the query text when the result carries none', () => {
    const steps = [
      recordedEsqlStep({ query: denseRetrievalQuery, rows: 95, includeResultQuery: false }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(95);
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

    expect(extractAgentAlertRetrievalPopulation(steps, AD2_SCENARIO_SEED_LABEL)).toBeNull();
    expect(extractUnscopedAlertRetrievalRowCounts(steps, AD2_SCENARIO_SEED_LABEL)).toEqual([
      95, 95,
    ]);
    // The check belongs to the EXAMPLE, not to the extraction: with no scope
    // declared the same results still count, which is the shape the recorded
    // reps are replayed in.
    expect(extractAgentAlertRetrievalPopulation(steps)).toBe(95);
  });

  // The marker has to be in a RESTRICTIVE clause, not merely somewhere in the
  // query text. The reported payload: the marker is present but the query
  // filters on nothing, so its rows are arbitrary shared-index rows.
  it('does not accept a marker that only appears outside a filtering clause', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const notFiltering = [
      `FROM .alerts-security.alerts-default | EVAL fixture = "${scope}" | LIMIT 95`,
      `FROM .alerts-security.alerts-default | KEEP _id, "${scope}" | LIMIT 95`,
      `FROM .alerts-security.alerts-default | LIMIT 95 // scoped by ${scope}`,
      `FROM .alerts-security.alerts-default /* ${scope} */ | LIMIT 95`,
      `FROM .alerts-security.alerts-default | LIMIT 95 | EVAL note = "${scope}"`,
      // A comment carrying the marker AFTER a WHERE clause: the marker is
      // inside a restrictive segment textually, so only stripping comments
      // first keeps this rejected.
      `FROM .alerts-security.alerts-default | WHERE tags == "unrelated" // ${scope}`,
      `FROM .alerts-security.alerts-default | WHERE tags == "unrelated" /* ${scope} */`,
    ];

    expect(
      notFiltering.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null, null, null, null, null]);

    expect(
      notFiltering.map((query) =>
        extractUnscopedAlertRetrievalRowCounts([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([[95], [95], [95], [95], [95], [95], [95]]);
  });

  // Two classes of unrestricted `WHERE` that still CONTAIN the marker, both
  // reported by review: a negation selects everything except this run, and a
  // tautological disjunct selects the whole index. Either one's rows are an
  // unrelated population, so admitting them scores a complete retrieval of this
  // fixture on rows that are not this fixture's.
  it('does not accept a WHERE clause that negates the marker', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const negated = [
      `FROM .alerts-security.alerts-default | WHERE tags != "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE tags <> "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE NOT tags == "${scope}"`,
    ];

    expect(
      negated.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null]);

    expect(
      negated.map((query) =>
        extractUnscopedAlertRetrievalRowCounts([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([[95], [95], [95]]);
  });

  it('does not accept a WHERE clause whose tautological branch keeps the whole index', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const tautologies = [
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}" OR true`,
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}" OR 1 == 1`,
    ];

    expect(
      tautologies.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null]);

    expect(
      tautologies.map((query) =>
        extractUnscopedAlertRetrievalRowCounts([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([[95], [95]]);
  });

  // The other direction: the stricter check must not reject the shapes the
  // recorded scoped queries actually use — a positive marker beside a negated
  // unrelated term, and a marker named in every OR branch.
  it('still accepts a positive marker branch alongside other predicates', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const positive = [
      `FROM .alerts-security.alerts-default | WHERE tags != "unrelated" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE QSTR("${scope}")`,
      `FROM .alerts-security.alerts-default | WHERE message LIKE "*${scope}*" OR tags LIKE "*${scope}*"`,
    ];

    expect(
      positive.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95]);
  });

  // WIDENING: `OR` unions its branches, so a marker in ONE branch does not
  // narrow the others. Such a query is a superset of this fixture, and on the
  // shared index its rows — and any exact-looking 95 — may all belong to the
  // other run. A positive marker in one branch was previously enough, which is
  // exactly this false positive.
  it('does not accept a WHERE clause that widens to another run', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const widening = [
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}" OR tags == "other-run"`,
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}" OR tags != "unrelated"`,
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}" OR host.name != "none"`,
    ];

    expect(
      widening.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null]);

    expect(
      widening.map((query) =>
        extractUnscopedAlertRetrievalRowCounts([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([[95], [95], [95]]);
  });

  // A disjunct that OPENS with NOT is not the same as a marker predicate that is
  // negated. Generated ES|QL legitimately leads with an unrelated negated filter
  // and positively filters the marker in a later `AND` branch; treating the
  // whole disjunct as negated scores a correct run as zero/unscoped.
  it('accepts a positive marker branch that follows an unrelated negation', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const positive = [
      `FROM .alerts-security.alerts-default | WHERE NOT kibana.alert.workflow_status == "closed" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE NOT kibana.alert.workflow_status == "closed" AND tags LIKE "*${scope}*"`,
      `FROM .alerts-security.alerts-default | WHERE NOT host.name == "nope" AND QSTR("${scope}")`,
    ];

    expect(
      positive.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95]);

    // And the negated-marker shapes are still rejected, including when they
    // themselves follow an unrelated positive branch.
    const stillNegated = [
      `FROM .alerts-security.alerts-default | WHERE NOT tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE NOT host.name == "nope" AND NOT tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE tags != "${scope}"`,
    ];

    expect(
      stillNegated.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null]);
  });

  // Quoted literals are DATA, not syntax. The previous implementation removed
  // comments and split on `|` with plain regexes, so a quoted command line
  // containing `//` was truncated BEFORE a later marker predicate and a quoted
  // literal containing `|` split one query into phantom segments. Both shapes
  // are realistic for these seeded attack chains and both scored a correctly
  // scoped retrieval as a zero.
  it('accepts the marker after a quoted URL or pipe literal', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const quoted = [
      `FROM .alerts-security.alerts-default | WHERE process.command_line LIKE "*https://cdn.example/*" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE process.command_line LIKE "*cmd.exe /c echo a|b*" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE message LIKE "*http://evil.example/x*" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE message == "a | b" AND tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | WHERE message LIKE "*WHERE tags == \\"decoy\\"*" AND tags == "${scope}"`,
    ];

    expect(
      quoted.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95, 95, 95]);

    // The escape hatch must not be one-way: a quoted marker is still a marker,
    // and a marker in a real trailing comment is still ignored.
    const stillUnscoped = [
      `FROM .alerts-security.alerts-default | WHERE message == "nothing" // tags == "${scope}"`,
    ];

    expect(
      stillUnscoped.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null]);
  });

  it('does not treat a marker that is only text inside a longer literal as scope', () => {
    // `includes(marker)` used to be the whole test, so a query that merely
    // MENTIONS the marker as data was credited as fixture-scoped and its
    // whole-index row count was admitted as the fixture's population. The
    // marker has to be a filter VALUE: a complete literal, or a LIKE fragment
    // delimited by wildcards.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const mentionsOnly = [
      `FROM .alerts-security.alerts-default | WHERE message == "the marker is ${scope} here"`,
      `FROM .alerts-security.alerts-default | WHERE message == "prefix${scope}suffix"`,
      `FROM .alerts-security.alerts-default | WHERE process.command_line == "echo ${scope}"`,
    ];

    expect(
      mentionsOnly.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null]);
  });

  it('does not let a pipe inside a comment invent a scoped segment', () => {
    // Pipeline boundaries were located BEFORE comments were removed, so a `|`
    // in a comment split off a synthetic segment made of comment text:
    //   FROM ... | LIMIT 95 // | WHERE tags == "<marker>"
    // executes as an unscoped 95-row query, yet the comment's pipe produced a
    // second segment that looked fixture-scoped and admitted those arbitrary
    // rows. Comment state must be tracked while locating boundaries.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const commentOnly = [
      `FROM .alerts-security.alerts-default METADATA _id | LIMIT 95 // | WHERE tags == "${scope}"`,
      `FROM .alerts-security.alerts-default METADATA _id | LIMIT 95 /* | WHERE tags == "${scope}" */`,
      `FROM .alerts-security.alerts-default | LIMIT 95 // WHERE tags == "${scope}"`,
    ];

    expect(
      commentOnly.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null, null]);
  });

  it('does not admit a pipeline count from a query that reads another index', () => {
    // The pipeline runs the AD tool's query itself, so that query must clear the
    // same bar as an agent-side retrieval: carry the scope AND read the alerts
    // index. Scope alone admitted a count of seeded RAW EVENTS (the marker also
    // labels them), so an exact-looking count could pass the population
    // assertion with no alert retrieved.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const otherIndexQuery = `FROM logs-endpoint.events.process-default | WHERE labels.ad_portable_seed == "${scope}" | LIMIT 95`;
    const pipeline = {
      alert_retrieval: [{ alerts_context_count: 95, extraction_strategy: 'default_esql' }],
      combined_alerts: { alerts_context_count: 95 },
    };

    const result = computeWorkflowAlertCounts({
      pipeline,
      adToolEsqlQuery: otherIndexQuery,
      retrievalScope: scope,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('unscoped_retrieval');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
  });

  it('does not let an index named only in a comment satisfy the index check', () => {
    // The pipeline runs this query itself. Naming the alert index family in a
    // comment used to satisfy the "reads the alert index" check while the query
    // read an unrelated index, admitting its 95 rows as this fixture's
    // population.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const unrelatedIndexWithComment = `FROM logs-endpoint.events.process-default // ${ALERT_INDEX_FAMILY}`;

    expect(
      extractAgentAlertRetrievalPopulation(
        [recordedEsqlStep({ query: unrelatedIndexWithComment, rows: 95 })],
        scope
      )
    ).toBe(null);

    const pipeline = { alert_retrieval: [], esql_query: unrelatedIndexWithComment };
    const counts = computeWorkflowAlertCounts({
      pipeline,
      adToolEsqlQuery: unrelatedIndexWithComment,
      retrievalScope: scope,
    });
    expect(counts.retrievedAlertCount).toBe(0);
  });

  it('does not let a negated group containing the marker satisfy the scope check', () => {
    // `NOT (tags == X OR host == Y)` excludes the fixture; the old per-branch
    // text check saw a positive marker mention inside the parens and accepted it.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const negatedGroup = `FROM ${ALERT_INDEX_FAMILY} | WHERE NOT (tags == "${scope}" OR host.name == "wks-ops-40") | LIMIT 95`;
    const steps = [recordedEsqlStep({ query: negatedGroup, rows: 95 })];

    expect(extractAgentAlertRetrievalPopulation(steps, scope)).toBe(null);
    expect(extractUnscopedAlertRetrievalRowCounts(steps, scope)).toEqual([95]);
  });

  it('still accepts a positive marker beside a negated group', () => {
    // The mirror of the previous case, and the false negative a stricter check
    // could introduce: a negated UNRELATED group does not stop the marker from
    // restricting the result.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const legit = `FROM ${ALERT_INDEX_FAMILY} | WHERE tags == "${scope}" AND NOT host.name == "wks-ops-40" | LIMIT 95`;

    expect(
      extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query: legit, rows: 95 })], scope)
    ).toBe(95);
  });

  it('still accepts a grouped OR whose every branch names the marker', () => {
    // Another false negative to guard: `(A OR B)` where both branches name the
    // marker still restricts to the fixture.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const grouped = `FROM ${ALERT_INDEX_FAMILY} | WHERE (tags == "${scope}" OR tags LIKE "*${scope}*") | LIMIT 95`;

    expect(
      extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query: grouped, rows: 95 })], scope)
    ).toBe(95);
  });

  it('does not treat an index named only in a comment as an alert retrieval', () => {
    // The exact shape reported in review: the query reads the endpoint events
    // index and only MENTIONS the alert family in a trailing comment. Both the
    // agent-side and pipeline-side index checks used a bare substring test, so
    // this query's raw-event ids were scored as the dense alert population.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const unrelatedIndexWithComment = `FROM logs-endpoint.events.process-default METADATA _id | WHERE labels.ad_portable_seed == "${scope}" // ${ALERT_INDEX_FAMILY}`;

    expect(
      extractAgentAlertRetrievalPopulation(
        [recordedEsqlStep({ query: unrelatedIndexWithComment, rows: 95 })],
        scope
      )
    ).toBe(null);

    const pipeline = { alert_retrieval: [], esql_query: unrelatedIndexWithComment };
    const counts = computeWorkflowAlertCounts({
      pipeline,
      adToolEsqlQuery: unrelatedIndexWithComment,
      retrievalScope: scope,
    });
    expect(counts.retrievedAlertCount).toBe(0);
  });

  it('does not let the marker inside a negated group count as scoped', () => {
    // `NOT (host.name == "x" AND tags == <marker>)` excludes the fixture. The
    // previous implementation took the last textual `AND` before the marker as
    // the branch start, which landed INSIDE the negated group, so no negation
    // regex matched and the query was classified as positively scoped.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const negatedGroup = `FROM ${ALERT_INDEX_FAMILY} | WHERE status == "open" AND NOT (host.name == "x" AND tags == "${scope}")`;
    const steps = [recordedEsqlStep({ query: negatedGroup, rows: 95 })];

    expect(extractAgentAlertRetrievalPopulation(steps, scope)).toBe(null);
    expect(extractUnscopedAlertRetrievalRowCounts(steps, scope)).toEqual([95]);
  });

  it('accepts a grouped OR that only refines a positively scoped retrieval', () => {
    // Splitting on every `OR` without tracking parentheses treated the second
    // branch of `(severity == "high" OR severity == "critical")` as a top-level
    // alternative lacking the marker, scoring a correct retrieval as unscoped.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const groupedRefinement = `FROM ${ALERT_INDEX_FAMILY} | WHERE tags == "${scope}" AND (severity == "high" OR severity == "critical")`;

    expect(
      extractAgentAlertRetrievalPopulation(
        [recordedEsqlStep({ query: groupedRefinement, rows: 95 })],
        scope
      )
    ).toBe(95);
  });

  it('does not let a tautological or widened marker literal prove scope', () => {
    // The reported defect: `leafRole` returned `positive` whenever the marker
    // appeared as a delimited literal, without checking the predicate RESTRICTS
    // to it. Both shapes below name the marker as a value yet admit rows the
    // fixture does not own, so 95 arbitrary ids scored as the dense population.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const widening = [
      // Constant true: compares the marker to itself, so it admits every row.
      `FROM ${ALERT_INDEX_FAMILY} | WHERE "${scope}" == "${scope}"`,
      // The marker is one accepted value among others, so rows without it pass.
      `FROM ${ALERT_INDEX_FAMILY} | WHERE tags IN ("${scope}", "other-run-marker")`,
    ];

    expect(
      widening.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([null, null]);
  });

  it('still accepts the marker as the sole accepted value of a field', () => {
    // The other direction: the stricter role check must not reject the
    // restricting spellings the recorded scoped queries use.
    const scope = AD2_SCENARIO_SEED_LABEL;
    const restricting = [
      `FROM ${ALERT_INDEX_FAMILY} | WHERE tags == "${scope}"`,
      `FROM ${ALERT_INDEX_FAMILY} | WHERE tags IN ("${scope}")`,
      `FROM ${ALERT_INDEX_FAMILY} | WHERE tags LIKE "*${scope}*"`,
      `FROM ${ALERT_INDEX_FAMILY} | WHERE QSTR("${scope}")`,
    ];

    expect(
      restricting.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95, 95]);
  });

  it('still accepts the marker when a WHERE clause restricts on it', () => {
    const scope = AD2_SCENARIO_SEED_LABEL;
    const filtering = [
      `FROM .alerts-security.alerts-default | WHERE tags == "${scope}"`,
      `FROM .alerts-security.alerts-default | LIMIT 100 | WHERE message LIKE "*${scope}*"`,
      `FROM .alerts-security.alerts-default | STATS c = COUNT(*) BY host.name | WHERE c > 0 AND tags == "${scope}"`,
    ];

    expect(
      filtering.map((query) =>
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95]);
  });

  it('counts the retrieval when the query carries the scope the example declares', () => {
    const steps = [
      recordedEsqlStep({
        query: `FROM .alerts-security.alerts-default\n  | WHERE tags == "${AD2_SCENARIO_SEED_LABEL}"\n  | LIMIT 100`,
        rows: 95,
      }),
    ];

    expect(extractAgentAlertRetrievalPopulation(steps, AD2_SCENARIO_SEED_LABEL)).toBe(95);
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
        extractAgentAlertRetrievalPopulation([recordedEsqlStep({ query, rows: 95 })], scope)
      )
    ).toEqual([95, 95, 95, 95]);
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

    expect(extractAgentAlertRetrievalPopulation(steps, AD2_SCENARIO_SEED_LABEL)).toBe(95);
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

describe("the AD tool call's own ES|QL query", () => {
  it('reads the query the agent handed the AD tool', () => {
    const steps = [recordedAdStep({ esqlQuery: denseRetrievalQuery })];

    expect(extractAdToolEsqlQuery(steps)).toBe(denseRetrievalQuery);
  });

  // No `esql_query` means the tool's own unscoped default query ran — which is
  // a different observable from "the agent scoped its retrieval", so the two
  // must not collapse into one reading.
  it('is null when the call supplied no query', () => {
    expect(extractAdToolEsqlQuery([recordedAdStep({})])).toBeNull();
  });

  it('is null when the AD tool never ran', () => {
    expect(
      extractAdToolEsqlQuery([recordedEsqlStep({ query: denseRetrievalQuery, rows: 95 })])
    ).toBeNull();
  });

  // The pipeline response read below is the one for the FIRST AD call's
  // execution (`findAdToolResult`), so the first call's query is the one that
  // explains it.
  it('reads the first AD call, the one whose execution the response belongs to', () => {
    const steps = [
      recordedAdStep({ esqlQuery: `FROM .alerts-security.alerts-default | LIMIT 95` }),
      recordedAdStep({ esqlQuery: `FROM .alerts-security.alerts-default | LIMIT 12` }),
    ];

    expect(extractAdToolEsqlQuery(steps)).toBe('FROM .alerts-security.alerts-default | LIMIT 95');
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
      agentAlertRetrievalPopulation: 95,
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
      agentAlertRetrievalPopulation: 95,
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
      agentAlertRetrievalPopulation: 95,
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

  it('scores the population the scoped retrievals observed', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      agentAlertRetrievalPopulation: 95,
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('agent_esql_retrieval');
  });
});

// Fix 3: the scope gate used to apply to the agent's own ES|QL retrievals only,
// so a pipeline-derived count — which the response prefers over the agent's —
// became the scored retrieval with no scope check at all. The pipeline's Alert
// Retrieval phase runs the query the agent handed the AD tool, so that query is
// the observable that holds the pipeline side to the same rule.
describe('the declared scope is enforced on pipeline-derived counts too', () => {
  const scopedQuery = `FROM .alerts-security.alerts-default | WHERE tags == "${AD2_SCENARIO_SEED_LABEL}"`;
  const unscopedQuery = 'FROM .alerts-security.alerts-default | LIMIT 95';
  const pipelineWithRetrieval = {
    alert_retrieval: [{ alerts_context_count: 95, extraction_strategy: 'default_esql' }],
    combined_alerts: { alerts_context_count: 95 },
  };

  it('admits the pipeline count when the AD query carries the declared scope', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: pipelineWithRetrieval,
      adToolEsqlQuery: scopedQuery,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('pipeline_alert_retrieval');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([]);
  });

  // The recorded dense shape: `alert_retrieval_mode: 'esql'` with a LIMIT-100
  // query that names no marker. Its 95 rows describe the shared index, not this
  // fixture, so they cannot satisfy the fixture's exact-population assertion.
  it('excludes a pipeline count whose AD query omits the declared scope', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: pipelineWithRetrieval,
      adToolEsqlQuery: unscopedQuery,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('unscoped_retrieval');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
  });

  it('excludes the pipeline count when the AD call supplied no query at all', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: pipelineWithRetrieval,
      adToolEsqlQuery: null,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
  });

  // The scope check belongs to the example: with no scope declared, the same
  // unscoped query's count is admitted (this is the clean-profile shape, where
  // the pipeline's retrieval IS the run's retrieval).
  it('admits every pipeline count when the example declares no scope', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: pipelineWithRetrieval,
      adToolEsqlQuery: unscopedQuery,
      retrievalScope: null,
    });

    expect(result.retrievedAlertCount).toBe(95);
    expect(result.retrievedAlertCountSource).toBe('pipeline_alert_retrieval');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([]);
  });

  // An excluded pipeline count must not hide a scoped retrieval the agent made
  // itself: the fallback still runs, so the run is scored on what it did scope.
  it('falls back to the scoped agent retrieval when the pipeline count is excluded', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: pipelineWithRetrieval,
      adToolEsqlQuery: unscopedQuery,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      agentAlertRetrievalPopulation: 12,
    });

    expect(result.retrievedAlertCount).toBe(12);
    expect(result.retrievedAlertCountSource).toBe('agent_esql_retrieval');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
  });

  // A pipeline count that is not a retrieval at all (`provided` / `skill`) is
  // excluded by strategy, never recorded as a scope violation — and it is
  // never admitted as the retrieved count either: the scoped example observes
  // none of its population, so it scores 0 rather than borrowing the supplied
  // 16.
  it('does not score a supplied count as a retrieved one', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 16, extraction_strategy: 'provided' }],
        combined_alerts: { alerts_context_count: 16 },
      },
      adToolEsqlQuery: unscopedQuery,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('none');
    expect(result.unscopedPipelineAlertRetrievalCounts).toEqual([]);
  });
});

// A scoped example asserts a retrieved population, so BOTH ways of observing
// none of it are failures of that one assertion and score 0: retrieving
// without the marker, and not retrieving at all. `null` would let either take
// `N/A` (dropped from the aggregate). It stays reserved for an example that
// asks no retrieval question at all.
describe('an unscoped retrieval scores 0 rather than going unscored', () => {
  const scopedQuery = `FROM .alerts-security.alerts-default | WHERE tags == "${AD2_SCENARIO_SEED_LABEL}"`;

  it("reports 0 when the only retrieval was the agent's own, unscoped", () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: [97],
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('unscoped_retrieval');
  });

  it('reports 0 when the only retrieval came from the pipeline, unscoped', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: { alert_retrieval: [{ alerts_context_count: 95, extraction_strategy: 'esql' }] },
      adToolEsqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 95',
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('unscoped_retrieval');
  });

  // The dodge this closes: a run that makes NO retrieval at all reports 0 too,
  // so skipping retrieval cannot take `N/A` in place of the failure. The source
  // is `none` (nothing retrieved) rather than `unscoped_retrieval` (retrieved,
  // out of scope), so the record still separates the two findings.
  it('reports 0 when the run retrieved nothing at all', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      adToolEsqlQuery: scopedQuery,
    });

    expect(result.retrievedAlertCount).toBe(0);
    expect(result.retrievedAlertCountSource).toBe('none');
  });

  // The `null`/`N/A` path that survives: no scope declared means no retrieval
  // question, so there is no count to score and the evidence stays incomplete.
  it('stays null for an example that declares no scope, whatever it retrieved', () => {
    const result = computeWorkflowAlertCounts({ pipeline: {}, retrievalScope: null });

    expect(result.retrievedAlertCount).toBeNull();
    expect(result.retrievedAlertCountSource).toBe('none');
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
      unscopedPipelineAlertRetrievalCounts: [],
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
      unscopedPipelineAlertRetrievalCounts: [],
    });
  });

  // The scope a retrieval had to carry, and the retrievals excluded for not
  // carrying it, are persisted together on BOTH sides: that is what makes a 0
  // read as "the run retrieved 97 rows unscoped" instead of "no retrieval
  // happened".
  it('persists the declared scope and the retrievals it excluded', () => {
    const evidence = extractRetrievalEvidence({
      pipeline: null,
      agentEsqlRowCounts: [97, 95],
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: [97],
      unscopedPipelineAlertRetrievalCounts: [95],
    });

    expect(evidence.retrievalScope).toBe(AD2_SCENARIO_SEED_LABEL);
    expect(evidence.unscopedAgentAlertRetrievalRowCounts).toEqual([97]);
    expect(evidence.unscopedPipelineAlertRetrievalCounts).toEqual([95]);
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
      agentAlertRetrievalPopulation: 95,
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
  // does not carry it (the recorded dense shape). The run DID retrieve, but none
  // of what it observed belongs to this fixture, so it reports 0 — a failed
  // retrieval the evaluator scores — and the evidence says why: 97 rows
  // retrieved unscoped, not "no retrieval".
  it('scores an unscoped-only retrieval as 0 of the fixture alerts', () => {
    const steps = [recordedEsqlStep({ query: denseRetrievalQuery, rows: 97 })];
    const workflow = buildWorkflow({
      pipeline: null,
      adToolResult: { status: 'completed', alertsContextCount: 16, discoveryCount: 4 },
      agentEsqlRowCounts: extractAgentEsqlRowCounts(steps),
      agentAlertRetrievalPopulation: extractAgentAlertRetrievalPopulation(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: extractUnscopedAlertRetrievalRowCounts(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
    });

    expect(workflow.retrievedAlertCount).toBe(0);
    expect(workflow.retrievedAlertCountSource).toBe('unscoped_retrieval');
    expect(workflow.passedAlertCount).toBe(16);
    expect(workflow.retrievalEvidence.retrievalScope).toBe(AD2_SCENARIO_SEED_LABEL);
    expect(workflow.retrievalEvidence.unscopedAgentAlertRetrievalRowCounts).toEqual([97]);
    expect(workflow.retrievalEvidence.agentEsqlRowCounts).toEqual([97]);
  });

  // The other half of the same contract: a run that retrieved NOTHING scores 0
  // too, because the example asks for a retrieval and the run observed none of
  // its population. The source stays `none` (nothing retrieved) rather than
  // `unscoped_retrieval`, so the record separates "skipped the retrieval" from
  // "retrieved out of scope" — both 0, different findings.
  it('scores 0 when the run retrieved nothing at all', () => {
    const workflow = buildWorkflow({
      pipeline: null,
      adToolResult: { status: 'completed', alertsContextCount: 16, discoveryCount: 4 },
      agentEsqlRowCounts: [],
      agentAlertRetrievalPopulation: null,
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: [],
    });

    expect(workflow.retrievedAlertCount).toBe(0);
    expect(workflow.retrievedAlertCountSource).toBe('none');
    expect(workflow.retrievalEvidence.unscopedAgentAlertRetrievalRowCounts).toEqual([]);
    expect(workflow.retrievalEvidence.agentEsqlRowCounts).toEqual([]);
  });

  // The recorded dense rep 2 shape end to end: the agent ran no ES|QL of its
  // own, and the AD call it made carried an UNscoped `esql_query` whose rows the
  // pipeline reported back as 95. Those 95 rows are the shared index's, so they
  // cannot satisfy the fixture's exact-population assertion.
  it('excludes a pipeline retrieval whose AD query omits the declared scope', () => {
    const steps = [
      recordedAdStep({ esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100' }),
    ];
    const workflow = buildWorkflow({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 95, extraction_strategy: 'default_esql' }],
        combined_alerts: { alerts_context_count: 95 },
      },
      adToolResult: { status: 'completed', alertsContextCount: 95, discoveryCount: 4 },
      agentEsqlRowCounts: [],
      adToolEsqlQuery: extractAdToolEsqlQuery(steps),
      agentAlertRetrievalPopulation: extractAgentAlertRetrievalPopulation(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
      retrievalScope: AD2_SCENARIO_SEED_LABEL,
      unscopedAgentAlertRetrievalRowCounts: extractUnscopedAlertRetrievalRowCounts(
        steps,
        AD2_SCENARIO_SEED_LABEL
      ),
    });

    expect(workflow.retrievedAlertCount).toBe(0);
    expect(workflow.retrievedAlertCountSource).toBe('unscoped_retrieval');
    expect(workflow.retrievalEvidence.unscopedPipelineAlertRetrievalCounts).toEqual([95, 95]);
    expect(workflow.retrievalEvidence.pipelineAlertRetrieval).toEqual([
      { alertsContextCount: 95, extractionStrategy: 'default_esql', alertsCount: null },
    ]);
  });
});

describe('slow-path handoff (#293046): insights from pipeline validated discoveries', () => {
  it('maps snake_case validated discoveries into harness AttackDiscovery shape', () => {
    const insights = insightsFromValidatedDiscoveries([
      {
        title: 'LSASS credential access chain',
        summary_markdown: 'summary A',
        details_markdown: 'details A',
        alert_ids: ['a1', 'a2'],
      },
      {
        title: 'Cloud OAuth abuse',
        summary_markdown: 'summary B',
        details_markdown: 'details B',
        alert_ids: ['b1'],
        entity_summary_markdown: 'entities B',
      },
    ]);

    expect(insights).toEqual([
      {
        title: 'LSASS credential access chain',
        summaryMarkdown: 'summary A',
        detailsMarkdown: 'details A',
        alertIds: ['a1', 'a2'],
      },
      {
        title: 'Cloud OAuth abuse',
        summaryMarkdown: 'summary B',
        detailsMarkdown: 'details B',
        entitySummaryMarkdown: 'entities B',
        alertIds: ['b1'],
      },
    ]);
  });

  it('omits entitySummaryMarkdown when the pipeline entry has none', () => {
    const insights = insightsFromValidatedDiscoveries([
      { title: 't', summary_markdown: 's', details_markdown: 'd', alert_ids: [] },
    ]);
    expect(insights![0].entitySummaryMarkdown).toBeUndefined();
  });

  it('returns undefined for a non-array (no fabrication when the pipeline has none)', () => {
    expect(insightsFromValidatedDiscoveries(null)).toBeUndefined();
    expect(insightsFromValidatedDiscoveries(undefined)).toBeUndefined();
  });

  it('maps a hallucination-filtered run to an EMPTY array, not undefined', () => {
    // Empty array is a real measurement (all discoveries filtered); undefined
    // would fall through the ?? chain and hide it.
    expect(insightsFromValidatedDiscoveries([])).toEqual([]);
  });
});

describe('slow-path handoff (#293046): waitForValidationPhase', () => {
  const trackingWith = (validation: unknown) => ({
    generation: { workflow_id: 'wf-gen' },
    validation,
  });

  // A failed execution never reaches the validation phase, so waiting for it
  // burns the whole budget on a predicate that can never be satisfied.
  it('stops polling once the AD tool reported a terminal failure', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        // Tracking is available (generation only); validation never started.
        .mockResolvedValueOnce({ generation: { workflow_id: 'wf-gen' }, validation: null })
        // Any further poll is the stall this guards against.
        .mockImplementation(async () => {
          throw new Error('polled again after a terminal execution failure');
        });

      const settled = await waitForValidationPhase({
        fetch,
        executionId: 'exec-1',
        executionFailed: true,
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(settled.generation?.workflow_id).toBe('wf-gen');
    } finally {
      jest.useRealTimers();
    }
  });

  // The validation phase takes precedence: if it actually started, the run did
  // reach it and the AD tool's error status must not short-circuit the wait.
  it('still waits for validation when it already started despite a terminal failure', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-failed-exec' })
        )
        // validation run probe: terminal
        .mockResolvedValueOnce({ status: 'completed' })
        // tracking poll again: now reportable as finished
        .mockResolvedValueOnce(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-failed-exec' })
        );

      const pending = waitForValidationPhase({
        fetch,
        executionId: 'exec-1',
        executionFailed: true,
      });
      const settled = await jest.advanceTimersByTimeAsync(10_000).then(() => pending);

      expect(settled.validation?.workflow_run_id).toBe('run-failed-exec');
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns immediately when validation is already tracked', async () => {
    const fetch = jest.fn().mockResolvedValue(trackingWith({ workflow_id: 'wf-val' }));
    const tracking = await waitForValidationPhase({ fetch, executionId: 'exec-1' });

    expect(tracking.generation?.workflow_id).toBe('wf-gen');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // A non-null `tracking.validation` means the validation phase has STARTED,
  // not finished (the product writes the tracking before the workflow runs).
  // Returning at that point reads the pipeline mid-validation, where
  // `validated_discoveries` can be absent. The poller must hold until the
  // validation workflow run itself reports a terminal status.
  it('keeps polling while the validation workflow run is still in flight, then returns once it is terminal', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        // tracking polls: validation tracked, run still going
        .mockResolvedValueOnce(trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-1' }))
        // run status probe: still running
        .mockResolvedValueOnce({ status: 'running' })
        // tracking poll again
        .mockResolvedValueOnce(trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-1' }))
        // run status probe: terminal
        .mockResolvedValueOnce({ status: 'completed' })
        // final tracking poll returns the same snapshot
        .mockResolvedValue(trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-1' }));
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      const settled = await jest.advanceTimersByTimeAsync(15_000).then(() => pending);

      expect(settled.validation).toMatchObject({ workflow_run_id: 'run-1' });
      const trackingCalls = fetch.mock.calls.filter((c: unknown[]) =>
        String(c[0]).includes('/tracking')
      );
      expect(trackingCalls.length).toBeGreaterThanOrEqual(3);
      // The run-status endpoint was consulted, not just the tracking snapshot.
      expect(
        fetch.mock.calls.some((c: unknown[]) => String(c[0]).includes('/api/workflows/executions/'))
      ).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns a tracking snapshot whose validation has no run id (nothing beyond non-null is observable)', async () => {
    const fetch = jest.fn().mockResolvedValue(trackingWith({ workflow_id: 'wf-val' }));
    const tracking = await waitForValidationPhase({ fetch, executionId: 'exec-1' });

    expect(tracking.validation).toEqual({ workflow_id: 'wf-val' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('polls until validation appears (handoff race: generation still running)', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(trackingWith(null))
        .mockResolvedValueOnce(trackingWith(null))
        .mockResolvedValueOnce(trackingWith({ workflow_id: 'wf-val' }));
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      const settled = await jest.advanceTimersByTimeAsync(10_000).then(() => pending);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(settled.validation).toEqual({ workflow_id: 'wf-val' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps polling through 404s (execution not indexed into the event log yet)', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('404'), { response: { status: 404 } }))
        .mockResolvedValueOnce(trackingWith({ workflow_id: 'wf-val' }));
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' }).catch((e) => e);
      const settled = await jest.advanceTimersByTimeAsync(5_000).then(() => pending);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(settled.validation).toEqual({ workflow_id: 'wf-val' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns the last snapshot rather than throwing when the timeout wins', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn().mockResolvedValue(trackingWith(null));
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      const settled = await jest
        .advanceTimersByTimeAsync(WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS)
        .then(() => pending);

      expect(settled.validation).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  // A final failed GET (e.g. a transient 404 at the deadline) must not discard
  // an earlier usable snapshot: the loop retains the last successful response
  // across iterations, so the deadline path returns it instead of throwing
  // `never became trackable` and aborting the whole eval run.
  it('returns the earlier snapshot when the last tracking GET fails at the deadline', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(trackingWith(null))
        .mockImplementation(async () => {
          throw new Error('404 not indexed');
        });
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' }).catch(
        (error: Error) => error
      );
      await jest.advanceTimersByTimeAsync(WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS);
      const settled = await pending;

      expect(settled).not.toBeInstanceOf(Error);
      expect(settled).toMatchObject({ generation: { workflow_id: 'wf-gen' } });
    } finally {
      jest.useRealTimers();
    }
  });

  // A permanent HTTP error (401/403/…) can never succeed on retry, unlike the
  // expected not-yet-indexed 404 or a transient network error — surface it
  // immediately instead of looping the full 10-minute budget and reporting a
  // misleading `never became trackable`.
  it('fails fast on a permanent HTTP error when no snapshot has been taken yet', async () => {
    jest.useFakeTimers();
    try {
      const permanentError = Object.assign(new Error('Unauthorized'), {
        response: { status: 403 },
      });
      const fetch = jest.fn().mockImplementation(async () => {
        throw permanentError;
      });
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' }).catch(
        (error: Error) => error
      );
      const result = await pending;

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toMatch(/failed permanently/);
      expect((result as Error).cause).toBe(permanentError);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns the earlier snapshot when a permanent HTTP error hits after one was taken', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(trackingWith(null))
        .mockImplementation(async () => {
          throw Object.assign(new Error('Forbidden'), { response: { status: 403 } });
        });
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      // The first poll succeeds, the second throws a permanent error — but the
      // loop's `sleep` between them only advances under fake timers.
      const settled = await jest.advanceTimersByTimeAsync(5_000).then(() => pending);

      expect(settled).toMatchObject({ generation: { workflow_id: 'wf-gen' } });
    } finally {
      jest.useRealTimers();
    }
  });

  // The status probe can fail permanently too (401/403): the tracking GET is
  // still healthy, so no further poll can ever make the run look terminal.
  // Surface it immediately, exactly as the tracking GET does, instead of
  // looping the full budget and then scoring a possibly incomplete pipeline.
  it('fails fast when the validation status probe fails permanently', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        // tracking poll: validation started, workflow run still in flight
        .mockResolvedValueOnce(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-probe-403' })
        )
        // status probe: permanent authorization failure
        .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { response: { status: 403 } }))
        // anything past this point is the budget-burning bug under guard
        .mockImplementation(async () => {
          throw new Error('poller kept going after a permanent status-probe failure');
        });
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      const settled = await pending;

      // Exactly the tracking GET and the one failed probe — no sleep, no budget burn.
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(settled).toMatchObject({ generation: { workflow_id: 'wf-gen' } });
    } finally {
      jest.useRealTimers();
    }
  });

  // A not-yet-indexed 404 from the status probe is the expected transient
  // case and must keep polling (this is the classification the tracking-GET
  // regression test above no longer covers vacuously).
  it('keeps polling when the validation status probe returns the expected 404', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-probe-404' })
        )
        .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { response: { status: 404 } }))
        .mockResolvedValueOnce(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-probe-404' })
        )
        .mockResolvedValueOnce({ status: 'completed' })
        .mockResolvedValue(
          trackingWith({ workflow_id: 'wf-val', workflow_run_id: 'run-probe-404' })
        );
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' });
      const settled = await jest.advanceTimersByTimeAsync(10_000).then(() => pending);

      expect(fetch).toHaveBeenCalledTimes(5);
      expect(settled).toMatchObject({ generation: { workflow_id: 'wf-gen' } });
    } finally {
      jest.useRealTimers();
    }
  });

  it('throws when the execution never becomes trackable at all', async () => {
    jest.useFakeTimers();
    try {
      const fetch = jest.fn().mockImplementation(async () => {
        throw new Error('connection refused');
      });
      // Attach the catch handler immediately so the rejection is never
      // "unhandled" while fake timers advance — Node's process-level
      // PromiseRejectionHandledWarning kills the Kibana jest runner.
      const pending = waitForValidationPhase({ fetch, executionId: 'exec-1' }).catch(
        (error: Error) => error
      );
      await jest.advanceTimersByTimeAsync(WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS);
      const result = await pending;

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toMatch(/never became trackable/);
    } finally {
      jest.useRealTimers();
    }
  });

  // The budget is a safety valve, not a model-fit knob: the default must be
  // generous enough that slow models (OSS models on eval cells) are not
  // falsely truncated, and per-environment override must be honored when set
  // to a finite number (and ignored when set to garbage).
  it('defaults to a 10-minute safety valve', () => {
    expect(WAIT_FOR_VALIDATION_PHASE_TIMEOUT_MS).toBeGreaterThanOrEqual(600_000);
  });
});

describe('slow-path handoff (#293046): task-level backfill', () => {
  // Removing the `insights: response.insights ?? insightsFromValidatedDiscoveries(...)`
  // assignment in buildTask leaves every other test green while handoff runs
  // score as having no discoveries. This invokes the real task through the
  // dataset factory — the executor is the only thing mocked — and asserts the
  // output handed to evaluators carries the pipeline-validated insights.
  it('passes the pipeline-validated discoveries to evaluators when converse returns only the handoff', async () => {
    jest.useFakeTimers();
    try {
      const converseResponse = {
        steps: [
          {
            type: 'tool_call',
            tool_id: 'security.attack-discovery.run',
            results: [
              {
                // The 90s soft-deadline handoff: an execution id, no status,
                // no discoveries.
                data: { execution_uuid: 'exec-task-level' },
                tool_result_id: 'handoff',
                type: 'other',
              },
            ],
          },
        ],
        insights: undefined,
      };
      const chatClient = {
        converse: jest.fn().mockResolvedValue(converseResponse),
      };

      const fetch = jest.fn(async (url: string) => {
        if (url.endsWith('/tracking')) {
          return {
            generation: { workflow_id: 'wf-gen', workflow_run_id: 'run-gen-task-1' },
            validation: { workflow_id: 'wf-val', workflow_run_id: 'run-val-task-1' },
          };
        }
        if (url.startsWith('/api/workflows/executions/')) {
          return { status: 'completed' };
        }
        // Pipeline response: generation completed, discoveries validated.
        return {
          validated_discoveries: [
            {
              title: 'LSASS credential access chain',
              summary_markdown: 'summary A',
              details_markdown: 'details A',
              alert_ids: ['a1', 'a2'],
            },
          ],
        };
      });

      let taskOutput: unknown;
      const executorClient = {
        runExperiment: jest.fn(
          async ({
            datasets,
            task,
          }: {
            datasets: Array<{ examples: Array<{ question: string }> }>;
            task: (args: { input: { question: string } }) => Promise<unknown>;
          }) => {
            for (const example of datasets[0].examples) {
              taskOutput = await task({ input: example });
            }
          }
        ),
      };

      const run = createEvaluateAttackDiscoveryAgentBuilderDataset({
        chatClient: chatClient as never,
        fetch: fetch as never,
        evaluators: { traceBasedEvaluators: {} } as never,
        executorClient: executorClient as never,
        traceEsClient: {} as never,
      });

      const pending = run({
        dataset: {
          name: 'slow-path-task',
          description: '',
          examples: [
            {
              input: {
                question: 'q',
                triageType: 'provided-alerts',
                expectedSkills: [],
                expectedToolPath: [],
              },
            },
          ],
        },
      });
      await jest.advanceTimersByTimeAsync(60_000).then(() => pending);

      expect(fetch).toHaveBeenCalled();
      expect(converseResponse.insights).toBeUndefined(); // the fallback had to fire
      expect((taskOutput as { insights?: unknown }).insights).toEqual([
        {
          title: 'LSASS credential access chain',
          summaryMarkdown: 'summary A',
          detailsMarkdown: 'details A',
          alertIds: ['a1', 'a2'],
        },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
