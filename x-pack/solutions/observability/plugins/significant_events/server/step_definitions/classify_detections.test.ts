/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { BREACH_WINDOW_MINUTES } from './classify_batch';
import { classifyDetectionsStepDefinition } from './classify_detections';
import {
  COLUMNS,
  STORED_QUERY,
  NOW,
  HOUR_MS,
  detectionRow,
  heldRow,
  decided,
  agentBatchOf,
} from './classify_test_helpers';

describe('classifyDetectionsStepDefinition', () => {
  const settings = {
    columns: COLUMNS,
    space_id: 'default',
    max_skip_age_hours: 24,
    review_fresh_minutes: 240,
    live_lookback_days: 90,
  };

  const createDefinition = () => {
    const logger = loggerMock.create();
    return { definition: classifyDetectionsStepDefinition({ logger }), logger };
  };

  const membersResponse = {
    columns: [
      { name: '_source', type: 'object' },
      { name: 'data_json', type: 'keyword' },
      { name: 'created_at', type: 'date' },
    ],
    values: [
      [
        { group_hash: 'group-1', alert: { status: 'active' }, severity: 'high' },
        JSON.stringify({
          event_id: 'event-1',
          title: 'Checkout errors',
          summary: 'Checkout is failing',
          source_ids: ['logs.checkout'],
          confidence: 0.8,
          signals: [
            {
              type: 'detection',
              source_id: 'logs.checkout',
              description: 'Observed rows',
              verdict: 'confirms',
              metadata: { rule_uuid: 'rule-A' },
              evidence: { esql_query: STORED_QUERY, result: 'found' },
            },
          ],
        }),
        // The live series opened just now, so it is not too old whatever the clock of the run.
        new Date().toISOString(),
      ],
    ],
  };

  const breachesResponse = (ruleUuids: string[]) => ({
    columns: [
      { name: 'latest', type: 'date' },
      { name: 'rule.id', type: 'keyword' },
    ],
    values: ruleUuids.map((ruleUuid) => [new Date(Date.now() - 60_000).toISOString(), ruleUuid]),
  });

  /**
   * An ES client that answers the live-series lookup and the read of the rules' breaches, and fails
   * on any other query: the rule's own record is the only state the gate reads.
   */
  const esClientWith = (breaches: () => unknown = () => breachesResponse([])) => {
    const query = jest.fn(
      async (request: { query: string; params?: Array<Record<string, string>> }) => {
        if (request.query.includes('BY `rule.id`')) return breaches();
        if (request.query.includes('.rule-events')) return membersResponse;
        throw new Error(`unexpected query: ${request.query}`);
      }
    );
    return { query, esClient: { esql: { query } } };
  };

  const runHandler = async (
    definition: ReturnType<typeof createDefinition>['definition'],
    input: unknown,
    esClient: unknown
  ) => {
    const { output } = await definition.handler({
      input,
      rawInput: input,
      contextManager: { getScopedEsClient: jest.fn(() => esClient) },
      abortSignal: new AbortController().signal,
    } as never);
    if (!output) throw new Error('The step returned no output');
    return output;
  };

  it('bounds every input, and defaults the review and lookback inputs for an older workflow', () => {
    const { definition } = createDefinition();
    const parse = (override: object) =>
      definition.inputSchema.safeParse({ ...settings, rows: [], ...override }).success;
    const bounds = {
      max_skip_age_hours: [1, 720],
      live_lookback_days: [1, 90],
      review_fresh_minutes: [15, 1_440],
    };

    for (const [field, [min, max]] of Object.entries(bounds)) {
      expect([field, parse({ [field]: min - 1 }), parse({ [field]: max + 1 })]).toEqual([
        field,
        false,
        false,
      ]);
      expect([field, parse({ [field]: min }), parse({ [field]: max })]).toEqual([
        field,
        true,
        true,
      ]);
    }
    const { review_fresh_minutes: _fresh, live_lookback_days: _lookback, ...older } = settings;
    expect(definition.inputSchema.parse({ ...older, rows: [] })).toMatchObject({
      review_fresh_minutes: 240,
      live_lookback_days: 90,
    });
  });

  it('has no probe settings: a workflow that still passes them is read all the same', () => {
    const { definition } = createDefinition();

    expect(
      definition.inputSchema.safeParse({
        ...settings,
        rows: [],
        probe_window_minutes: 20,
        probe_timeout_ms: 8_000,
        probe_concurrency: 5,
        budget_ms: 20_000,
      }).success
    ).toBe(true);
  });

  it('classifies through the scoped ES client, reads the rule breach and logs once', async () => {
    const { definition, logger } = createDefinition();
    const { query, esClient } = esClientWith(() => breachesResponse(['rule-A']));

    const output = await runHandler(
      definition,
      { ...settings, rows: [detectionRow('rule-A')] },
      esClient
    );

    expect(definition.outputSchema.safeParse(output).success).toBe(true);
    expect(decided(output)).toMatchObject({
      'rule-A': {
        decision: 'skip',
        reason: 'still_breaching',
        breach_window_minutes: BREACH_WINDOW_MINUTES,
      },
    });
    expect(output).toMatchObject({ batch: [], skipped_rule_uuids: ['rule-A'], failed: false });
    // The live series and the breaches, and no other query.
    expect(query).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('classifyDetections'));
  });

  it('counts the confirming rules it sends as changed only because no breach was recorded', async () => {
    const { definition, logger } = createDefinition();
    const { esClient } = esClientWith();

    const output = await runHandler(
      definition,
      { ...settings, rows: [detectionRow('rule-A')] },
      esClient
    );

    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'needs_agent', reason: 'state_changed', rule_breached: false },
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"no_breach_state_changed":1')
    );
  });

  it('reads live memberships from a lookback, not from the last write of the event', async () => {
    const { definition } = createDefinition();
    const { query, esClient } = esClientWith();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(NOW);

    try {
      await runHandler(
        definition,
        { ...settings, live_lookback_days: 30, rows: [detectionRow('rule-A')] },
        esClient
      );
    } finally {
      clock.mockRestore();
    }

    const [{ query: members, params }] = query.mock.calls
      .map(([request]) => request)
      .filter((request) => request.query.includes('INLINE STATS created_at'));
    const lookback = '@timestamp >= TO_DATETIME(?lookbackIso)';
    expect(members.indexOf(lookback)).toBeGreaterThan(-1);
    expect(members.indexOf('INLINE STATS created_at')).toBeLessThan(members.indexOf(lookback));
    expect(members).not.toContain('?fromIso');
    expect(params).toContainEqual({ lookbackIso: new Date(NOW - 30 * 24 * HOUR_MS).toISOString() });
  });

  describe('when it cannot judge', () => {
    it('fails open on an error while classifying: the rows the agent may read go on unjudged', async () => {
      const { definition, logger } = createDefinition();
      const esClient = {
        esql: {
          query: jest.fn(async () => {
            throw new Error('the cluster is down');
          }),
        },
      };

      const output = await runHandler(
        definition,
        { ...settings, rows: [detectionRow('rule-A'), heldRow('rule-B'), detectionRow('rule-C')] },
        esClient
      );

      expect(definition.outputSchema.safeParse(output).success).toBe(true);
      expect(output).toMatchObject({
        failed: true,
        row_count: 2,
        held_back_count: 1,
        needs_agent_count: 2,
        skips: [],
        skipped_detection_ids: [],
      });
      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-C']);
      expect(output.batch.every((entry) => entry.classifier === undefined)).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('the cluster is down'));
    });

    it('fails open up to the batch limit, and leaves the rest pending', async () => {
      const { definition } = createDefinition();
      const esClient = {
        esql: {
          query: jest.fn(async () => {
            throw new Error('the cluster is down');
          }),
        },
      };

      const output = await runHandler(
        definition,
        {
          ...settings,
          batch_max: 2,
          rows: [detectionRow('rule-A'), detectionRow('rule-B'), detectionRow('rule-C')],
        },
        esClient
      );

      expect(output).toMatchObject({ failed: true, row_count: 2, held_back_count: 1 });
      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-B']);
    });

    it('fails open when the rules breaches cannot be read, rather than reading every rule as quiet', async () => {
      const { definition, logger } = createDefinition();
      const { esClient } = esClientWith(() => {
        throw new Error('search_phase_execution_exception');
      });

      const output = await runHandler(
        definition,
        { ...settings, rows: [detectionRow('rule-A')] },
        esClient
      );

      expect(output).toMatchObject({ failed: true, row_count: 1, skipped_count: 0 });
      expect(output.batch[0].classifier).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('search_phase_execution_exception')
      );
    });

    it('treats missing rows and columns as an empty batch', async () => {
      const { definition } = createDefinition();
      const { query, esClient } = esClientWith();
      const { columns: _columns, ...withoutColumns } = settings;

      for (const input of [settings, withoutColumns]) {
        expect(definition.inputSchema.safeParse(input).success).toBe(true);
        expect(await runHandler(definition, input, esClient)).toMatchObject({
          batch: [],
          row_count: 0,
        });
      }
      expect(query).not.toHaveBeenCalled();
    });
  });
});
