/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { QueryLink, SignificantEventResponse } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  MAX_LIVE_REEVALUATIONS_PER_RUN,
  reconcileEventStatus,
  type ReconcileEventStatusResult,
} from './reconcile_event_status';
import { RECOVERING_COUNT } from './status_transition';

const NOW = new Date('2026-10-08T12:00:00.000Z');
const WINDOW_MINUTES = 15;

interface SeriesSpec {
  eventId: string;
  status?: 'active' | 'recovering';
  /** One member rule per entry; its stored query reads `FROM <source>`. */
  sources?: string[];
  severityScore?: number;
  timestamp?: string;
  groupHash?: string;
  /** Evaluations already spent in `recovering`, as stored on the version. */
  evaluations?: number;
}

const ruleFor = (source: string) => `rule-${source}`;

const makeEvent = ({
  eventId,
  status = 'active',
  sources = ['logs-a'],
  severityScore = 50,
  timestamp = '2026-10-08T11:00:00.000Z',
  evaluations,
}: SeriesSpec): SignificantEventResponse =>
  ({
    '@timestamp': timestamp,
    created_at: '2026-10-08T09:00:00.000Z',
    event_id: eventId,
    status,
    ...(evaluations !== undefined ? { status_evaluations: evaluations } : {}),
    severity: 'high',
    title: eventId,
    summary: eventId,
    stream_names: ['logs'],
    signals: sources.map((source) => ({
      type: 'detection',
      stream_name: 'logs',
      description: 'Found: x. Impact: y.',
      verdict: 'confirms',
      metadata: {
        detection_id: `det-${source}`,
        rule_uuid: ruleFor(source),
        rule_name: source,
        change_point_type: 'spike',
        p_value: 0.01,
        severity_score: severityScore,
      },
    })),
  } as unknown as SignificantEventResponse);

const makeLink = (source: string): QueryLink => ({
  stream_name: 'logs',
  rule_backed: true,
  rule_id: ruleFor(source),
  query: {
    id: `q-${source}`,
    title: source,
    description: '',
    type: 'match',
    esql: { query: `FROM ${source} METADATA _id, _source | WHERE MATCH(body.text, "refused")` },
  },
});

const rows = (count: number) => ({ columns: [], values: Array.from({ length: count }, () => []) });

type SourceBehavior = 'clean' | 'breaching' | 'no_data';

const setup = ({
  series,
  behavior = {},
  held = [],
  maxEvaluations,
  maxMemberProbes,
  lookbackMinutes,
  links,
}: {
  series: SeriesSpec[];
  behavior?: Record<string, SourceBehavior>;
  held?: string[];
  maxEvaluations?: number;
  maxMemberProbes?: number;
  lookbackMinutes?: number;
  links?: QueryLink[];
}) => {
  const groupHashes = series.map(({ groupHash }, index) => groupHash ?? `hash-${index}`);
  const events = new Map(series.map((spec) => [spec.eventId, makeEvent(spec)]));

  const eventSearchClient = {
    // Pages like the real client: `afterGroupHash` cursor, `batchSize` rows.
    findLatestByCurrentStateBatch: jest.fn(
      async ({ afterGroupHash, batchSize }: { afterGroupHash?: string; batchSize: number }) => {
        const start = afterGroupHash === undefined ? 0 : groupHashes.indexOf(afterGroupHash) + 1;
        const page = series.slice(start, start + batchSize);
        return {
          hits: page.map((spec) => events.get(spec.eventId)),
          groupHashes: groupHashes.slice(start, start + page.length),
          lastGroupHash: groupHashes[start + page.length - 1],
        };
      }
    ),
    findLatestByEventId: jest.fn(async (eventId: string) => events.get(eventId)),
    findOperatorHeldGroupHashes: jest.fn().mockResolvedValue(new Set(held)),
  };

  const sources = [...new Set(series.flatMap((spec) => spec.sources ?? ['logs-a']))];
  const knowledgeIndicatorClient = {
    getQueryLinks: jest.fn().mockResolvedValue(links ?? sources.map(makeLink)),
  };

  const streamDataEsClient = elasticsearchServiceMock.createElasticsearchClient();
  streamDataEsClient.esql.query.mockImplementation((async ({ query }: { query: string }) => {
    const source = /FROM (\S+)/.exec(query)?.[1] ?? '';
    const isPresence = !query.includes('WHERE');
    const kind = behavior[source] ?? 'clean';
    if (kind === 'breaching') return rows(isPresence ? 1 : 1);
    if (kind === 'no_data') return rows(0);
    return rows(isPresence ? 1 : 0);
  }) as never);

  const alertEventsClient = {
    createAlertEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AlertEventsClientApi>;
  const emitTrigger = jest.fn();
  const logger = loggingSystemMock.createLogger();

  const run = (now: Date = NOW): Promise<ReconcileEventStatusResult> =>
    reconcileEventStatus({
      eventSearchClient: eventSearchClient as never,
      knowledgeIndicatorClient: knowledgeIndicatorClient as never,
      streamDataEsClient,
      alertEventsClient,
      emitTrigger,
      logger,
      windowMinutes: WINDOW_MINUTES,
      lookbackMinutes,
      now,
      maxEvaluations,
      maxMemberProbes,
    });

  return {
    run,
    eventSearchClient,
    knowledgeIndicatorClient,
    streamDataEsClient,
    alertEventsClient,
    emitTrigger,
    logger,
  };
};

const writtenStatuses = (client: jest.Mocked<AlertEventsClientApi>) =>
  client.createAlertEvent.mock.calls.map(([event]) => [
    event.fingerprint,
    (event as { alert_status?: string }).alert_status,
  ]);

describe('reconcileEventStatus', () => {
  it('does nothing when there are no live series', async () => {
    const { run, streamDataEsClient, eventSearchClient } = setup({ series: [] });

    await expect(run()).resolves.toEqual(
      expect.objectContaining({ scanned: 0, evaluated: 0, deferred: 0, held: 0 })
    );
    expect(streamDataEsClient.esql.query).not.toHaveBeenCalled();
    expect(eventSearchClient.findOperatorHeldGroupHashes).not.toHaveBeenCalled();
  });

  it('moves an active series whose members are all clean to recovering', async () => {
    const { run, alertEventsClient } = setup({ series: [{ eventId: 'e1', sources: ['a', 'b'] }] });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ evaluated: 1, recovering: 1 }));
    expect(writtenStatuses(alertEventsClient)).toEqual([['e1', 'recovering']]);
  });

  it('records each member rule outcome in the assessment note', async () => {
    const { run, alertEventsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
    });

    await run();

    const { data } = alertEventsClient.createAlertEvent.mock.calls[0][0] as unknown as {
      data: { assessment_note: string };
    };
    expect(data.assessment_note).toContain(`after ${RECOVERING_COUNT} evaluations in recovering`);
    expect(data.assessment_note).toContain('logs-a: clean');
  });

  it('caps the members listed in the note', async () => {
    const sources = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const { run, alertEventsClient } = setup({ series: [{ eventId: 'e1', sources }] });

    await run();

    const { data } = alertEventsClient.createAlertEvent.mock.calls[0][0] as unknown as {
      data: { assessment_note: string };
    };
    expect(data.assessment_note).toContain('+2 more');
    expect(data.assessment_note.length).toBeLessThanOrEqual(400);
  });

  it('drops the transition when the series was written after it was read', async () => {
    const { run, alertEventsClient, eventSearchClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
    });
    // Every read sees a newer version than the last, as under a writer that keeps appending.
    let reads = 0;
    eventSearchClient.findLatestByEventId.mockImplementation(async () => ({
      ...makeEvent({ eventId: 'e1', status: 'active' }),
      '@timestamp': `2026-10-08T11:5${(reads += 1) % 10}:00.000Z`,
    }));

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ superseded: 1, inactivated: 0, failed: 0 }));
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('re-runs the evaluation once against the fresh version when the series was superseded', async () => {
    const { run, alertEventsClient, eventSearchClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: 1 }],
    });
    // The reads see a version a discovery write appended after the scan; it is stable from then
    // on, so the retry's timestamp check passes.
    eventSearchClient.findLatestByEventId.mockResolvedValue({
      ...makeEvent({ eventId: 'e1', status: 'recovering', evaluations: 1 }),
      '@timestamp': '2026-10-08T11:59:00.000Z',
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ superseded: 0, recovering: 1, failed: 0 }));
    expect(writtenStatuses(alertEventsClient)).toEqual([['e1', 'recovering']]);
  });

  it('does not evaluate a live event that has no members, so it cannot take capacity', async () => {
    const chatCreated = makeEvent({ eventId: 'chat' });
    chatCreated.signals = [];
    const { run, eventSearchClient, alertEventsClient } = setup({
      series: [{ eventId: 'real' }],
    });
    eventSearchClient.findLatestByCurrentStateBatch.mockResolvedValue({
      hits: [chatCreated, makeEvent({ eventId: 'real' })],
      groupHashes: ['hash-chat', 'hash-real'],
      lastGroupHash: 'hash-real',
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ scanned: 1, evaluated: 1 }));
    expect(writtenStatuses(alertEventsClient)).toEqual([['real', 'recovering']]);
  });

  it('counts an off-topic signal with an observed error as a member, so an event backed only by one can still close', async () => {
    const event = makeEvent({ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT });
    (event.signals ?? []).forEach((signal) => {
      (signal as { verdict: string }).verdict = 'off_topic';
      (signal as { effect: string }).effect = 'degradation';
    });
    const { run, eventSearchClient, alertEventsClient, streamDataEsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
    });
    eventSearchClient.findLatestByCurrentStateBatch.mockResolvedValue({
      hits: [event],
      groupHashes: ['hash-0'],
      lastGroupHash: 'hash-0',
    });
    eventSearchClient.findLatestByEventId.mockResolvedValue(event);

    const result = await run();

    expect(streamDataEsClient.esql.query).toHaveBeenCalled();
    expect(result.inactivated).toBe(1);
    expect(writtenStatuses(alertEventsClient)).toEqual([['e1', 'inactive']]);
  });

  it.each<[string, string]>([
    ['a benign off-topic signal', 'off_topic'],
    ['a healthy signal', 'refutes'],
  ])('does not count %s as a member, so it is never evaluated', async (_label, verdict) => {
    const event = makeEvent({ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT });
    (event.signals ?? []).forEach((signal) => {
      (signal as { verdict: string }).verdict = verdict;
    });
    const { run, eventSearchClient, alertEventsClient, streamDataEsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
    });
    eventSearchClient.findLatestByCurrentStateBatch.mockResolvedValue({
      hits: [event],
      groupHashes: ['hash-0'],
      lastGroupHash: 'hash-0',
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ scanned: 0, evaluated: 0 }));
    expect(streamDataEsClient.esql.query).not.toHaveBeenCalled();
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('writes nothing for an active series while any member is still breaching', async () => {
    const { run, alertEventsClient } = setup({
      series: [{ eventId: 'e1', sources: ['a', 'b'] }],
      behavior: { b: 'breaching' },
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ evaluated: 1, unchanged: 1, noData: 0 }));
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('appends another recovering version while the recovering count is not spent', async () => {
    const { run, alertEventsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT - 1 }],
    });

    const result = await run();

    expect(result.recovering).toBe(1);
    expect(writtenStatuses(alertEventsClient)).toEqual([['e1', 'recovering']]);
  });

  it('writes inactive, keeping the stored severity, once the recovering count is spent', async () => {
    const { run, alertEventsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
    });

    const result = await run();

    expect(result.inactivated).toBe(1);
    expect(alertEventsClient.createAlertEvent.mock.calls[0][0]).toMatchObject({
      fingerprint: 'e1',
      alert_status: 'inactive',
      severity: 'high',
    });
  });

  it('returns a recovering series to active when a member breaches again', async () => {
    const { run, alertEventsClient } = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: 1 }],
      behavior: { 'logs-a': 'breaching' },
    });

    const result = await run();

    expect(result.reactivated).toBe(1);
    expect(writtenStatuses(alertEventsClient)).toEqual([['e1', 'active']]);
  });

  it('holds the status when a member cannot be judged (empty source, or no stored query)', async () => {
    const empty = setup({
      series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
      behavior: { 'logs-a': 'no_data' },
    });
    await expect(empty.run()).resolves.toEqual(
      expect.objectContaining({ unchanged: 1, noData: 1, inactivated: 0 })
    );
    expect(empty.alertEventsClient.createAlertEvent).not.toHaveBeenCalled();

    const noQuery = setup({ series: [{ eventId: 'e2', status: 'recovering' }], links: [] });
    await expect(noQuery.run()).resolves.toEqual(
      expect.objectContaining({ unchanged: 1, noData: 1 })
    );
    expect(noQuery.alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('does not evaluate a series an operator pinned active', async () => {
    const { run, streamDataEsClient, alertEventsClient } = setup({
      series: [
        { eventId: 'pinned', groupHash: 'hash-pinned' },
        { eventId: 'free', groupHash: 'hash-free', sources: ['b'] },
      ],
      held: ['hash-pinned'],
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ scanned: 2, held: 1, evaluated: 1 }));
    expect(writtenStatuses(alertEventsClient)).toEqual([['free', 'recovering']]);
    for (const [{ query }] of streamDataEsClient.esql.query.mock.calls as Array<
      [{ query: string }]
    >) {
      expect(query).not.toContain('FROM logs-a');
    }
  });

  it('propagates a failed hold lookup instead of letting the engine override an operator', async () => {
    const { run, eventSearchClient, alertEventsClient } = setup({ series: [{ eventId: 'e1' }] });
    eventSearchClient.findOperatorHeldGroupHashes.mockRejectedValueOnce(
      new Error('security_exception')
    );

    await expect(run()).rejects.toThrow('security_exception');
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  describe('per-run cap', () => {
    it('defers a whole series that would push the stored queries past the probe budget', async () => {
      const { run, alertEventsClient, streamDataEsClient } = setup({
        maxMemberProbes: 3,
        series: [
          { eventId: 'small', sources: ['a'], severityScore: 90 },
          { eventId: 'mass', sources: ['b', 'c', 'd', 'e'], severityScore: 80 },
          { eventId: 'next', sources: ['f', 'g'], severityScore: 70 },
        ],
      });

      const result = await run();

      expect(result).toEqual(expect.objectContaining({ evaluated: 2, deferred: 1 }));
      expect(
        writtenStatuses(alertEventsClient)
          .map(([eventId]) => eventId)
          .sort()
      ).toEqual(['next', 'small']);
      expect(streamDataEsClient.esql.query.mock.calls.length).toBeLessThanOrEqual(6);
    });

    it('still evaluates a single series larger than the budget, so it is never stuck', async () => {
      const { run } = setup({
        maxMemberProbes: 2,
        series: [{ eventId: 'mass', sources: ['a', 'b', 'c'] }],
      });

      await expect(run()).resolves.toEqual(expect.objectContaining({ evaluated: 1, deferred: 0 }));
    });

    it('writes nothing for a deferred series, so it neither recovers nor re-tiers', async () => {
      const { run, alertEventsClient } = setup({
        maxEvaluations: 0,
        series: [{ eventId: 'e1', status: 'recovering', evaluations: RECOVERING_COUNT }],
      });

      await expect(run()).resolves.toEqual(expect.objectContaining({ deferred: 1, evaluated: 0 }));
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });
  });

  it('does bounded work however many series are live', async () => {
    const series = Array.from({ length: 1200 }, (_, i) => ({
      eventId: `e-${i}`,
      sources: [`s-${i}`, `t-${i}`],
      severityScore: i % 4 === 0 ? 90 : 40,
    }));
    const { run, eventSearchClient, knowledgeIndicatorClient, streamDataEsClient } = setup({
      series,
    });

    const result = await run();

    expect(result).toEqual(
      expect.objectContaining({
        scanned: 1200,
        evaluated: MAX_LIVE_REEVALUATIONS_PER_RUN,
        deferred: 1200 - MAX_LIVE_REEVALUATIONS_PER_RUN,
      })
    );
    // Two members each, and a presence query only when a probe finds nothing: at most 2 per member.
    expect(streamDataEsClient.esql.query.mock.calls.length).toBeLessThanOrEqual(
      MAX_LIVE_REEVALUATIONS_PER_RUN * 2 * 2
    );
    expect(eventSearchClient.findOperatorHeldGroupHashes).toHaveBeenCalledTimes(1);
    expect(knowledgeIndicatorClient.getQueryLinks).toHaveBeenCalledTimes(1);
  });

  it.each<[string, number, string]>([
    ['widens the probe window to the detector lookback', 40, '2026-10-08T11:20:00.000Z'],
    ['never narrows the probe window below the interval', 5, '2026-10-08T11:45:00.000Z'],
  ])('%s', async (_label, lookbackMinutes, gte) => {
    const { run, streamDataEsClient } = setup({ series: [{ eventId: 'e1' }], lookbackMinutes });

    await run();

    for (const [request] of streamDataEsClient.esql.query.mock.calls as unknown as Array<
      [{ filter: { range: { '@timestamp': { gte: string; lt: string } } } }]
    >) {
      expect(request.filter.range['@timestamp']).toEqual({ gte, lt: '2026-10-08T12:00:00.000Z' });
    }
  });

  it('keeps going and reports the failure when one series cannot be written', async () => {
    const { run, alertEventsClient, logger } = setup({
      series: [
        { eventId: 'bad', sources: ['a'] },
        { eventId: 'good', sources: ['b'] },
      ],
    });
    alertEventsClient.createAlertEvent.mockImplementation(async (event) => {
      if (event.fingerprint === 'bad') {
        throw new Error('write rejected');
      }
      return undefined as never;
    });

    const result = await run();

    expect(result).toEqual(expect.objectContaining({ evaluated: 2, recovering: 1, failed: 1 }));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('bad'));
  });
});
