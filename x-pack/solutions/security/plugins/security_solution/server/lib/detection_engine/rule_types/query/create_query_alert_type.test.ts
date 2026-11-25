/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createQueryAlertType } from './create_query_alert_type';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { createSecurityRuleTypeWrapper } from '../create_security_rule_type_wrapper';
import { createMockConfig } from '../../routes/__mocks__';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { sampleDocNoSortId } from '../__mocks__/es_results';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { BehaviorSubject } from 'rxjs';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { docLinksServiceMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import type { IRuleDataWriter } from '@kbn/rule-registry-plugin/server';
import { fromKueryExpression } from '@kbn/es-query';
import { hasTimestampFields } from '../utils/utils';
import { getFilter } from '../utils/get_filter';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';

jest.mock('@kbn/data-views-plugin/server', () => ({
  ...jest.requireActual('@kbn/data-views-plugin/server'),
  IndexPatternsFetcher: jest.fn().mockImplementation(() => ({
    getIndexPatternMatches: jest.fn().mockResolvedValue({ matchedIndexPatterns: ['some-index'] }),
  })),
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  getExceptions: () => [],
  hasTimestampFields: jest.fn(async () => {
    return {
      foundNoIndices: false,
      warningMessage: undefined,
    };
  }),
  checkForFrozenIndices: jest.fn(async () => []),
}));

jest.mock('@kbn/alerting-plugin/server', () => ({
  ...jest.requireActual('@kbn/alerting-plugin/server'),
  shouldCreateAlertsInAllSpaces: jest.fn().mockReturnValue(false),
}));

jest.mock('../utils/get_filter', () => {
  const actual = jest.requireActual('../utils/get_filter');
  return { ...actual, getFilter: jest.fn(actual.getFilter) };
});

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: jest.fn(),
    exceptionsClient: jest.fn(),
  }),
}));

describe('Custom Query Alerts', () => {
  const mocks = createRuleTypeMocks();
  const licensing = licensingMock.createSetup();
  const docLinks = docLinksServiceMock.createSetupContract();
  const publicBaseUrl = 'http://somekibanabaseurl.com';
  const mockedStatusLogger = ruleExecutionLogMock.forExecutors.create();
  const ruleStatusLogger = () => Promise.resolve(mockedStatusLogger);

  const { dependencies, executor, services } = mocks;
  const { actions, alerting, lists, logger, ruleDataClient } = dependencies;

  const eventsTelemetry = createMockTelemetryEventsSender(true);

  const wrapperOptions = {
    actions,
    docLinks,
    lists,
    logger,
    config: createMockConfig(),
    ruleDataClient,
    ruleExecutionLoggerFactory: ruleStatusLogger,
    version: '8.3',
    experimentalFeatures: allowedExperimentalValues,
    publicBaseUrl,
    alerting,
    eventsTelemetry,
    licensing,
    scheduleNotificationResponseActionsService: () => null,
    endpointAppContextService: createMockEndpointAppContextService(),
    getEntityStore: jest.fn().mockResolvedValue({
      createCRUDClient: jest.fn().mockReturnValue({ listEntities: jest.fn() }),
    }),
    getRulesAuthz: jest.fn().mockResolvedValue({}),
  };

  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper(wrapperOptions);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not send an alert when no events found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
      })
    );

    alerting.registerType(queryAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = getQueryRuleParams();

    await executor({
      params,
    });

    expect((await ruleDataClient.getWriter()).bulk).not.toHaveBeenCalled();
    expect(eventsTelemetry.queueTelemetryEvents).not.toHaveBeenCalled();
  });

  it('short-circuits and writes a warning if no indices are found', async () => {
    (IndexPatternsFetcher as jest.Mock).mockImplementationOnce(() => ({
      getIndexPatternMatches: jest.fn().mockResolvedValue({ matchedIndexPatterns: [] }),
    }));
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
      })
    );

    alerting.registerType(queryAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: [sampleDocNoSortId()],
        total: {
          relation: 'eq',
          value: 1,
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = getQueryRuleParams();

    await executor({ params });

    expect((await ruleDataClient.getWriter()).bulk).not.toHaveBeenCalled();
    expect(eventsTelemetry.sendAsync).not.toHaveBeenCalled();
    expect(mockedStatusLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Unable to find matching indices for rule ALERT_RULE_NAME. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.'
      )
    );
  });

  it('sends an alert when events are found', async () => {
    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
      })
    );

    alerting.registerType(queryAlertType);

    const params = getQueryRuleParams();

    services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: [sampleDocNoSortId()],
        total: {
          relation: 'eq',
          value: 1,
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    await executor({ params });

    expect((await ruleDataClient.getWriter()).bulk).toHaveBeenCalled();
    expect(eventsTelemetry.sendAsync).toHaveBeenCalled();
  });

  describe('gaps', () => {
    const gapNoticeMatcher = expect.stringContaining(
      'were not queried between this rule execution and the last execution'
    );

    // The execution logger buffers metrics and the last written gap wins, so the gap the
    // framework will see is the one from the last `logMetrics` call.
    const getLastLoggedGap = () => {
      const metrics = mockedStatusLogger.logMetrics.mock.lastCall?.[0];
      if (metrics?.gap_range == null) {
        throw new Error('Expected a gap to be logged with the last metrics');
      }
      return { ...metrics, gap_range: metrics.gap_range };
    };

    // A 5-minute rule querying a 6-minute window (the params mock uses `from: now-6m`).
    const interval = '5m';

    const registerAndRun = async ({
      previousStartedAt,
      rule,
      params,
    }: {
      previousStartedAt?: Date;
      rule?: { lastEnabledAt?: Date };
      params?: Parameters<typeof getQueryRuleParams>[0];
    } = {}) => {
      const queryAlertType = securityRuleTypeWrapper(
        createQueryAlertType({
          id: QUERY_RULE_TYPE_ID,
          name: 'Custom Query Rule',
        })
      );

      alerting.registerType(queryAlertType);

      return executor({
        params: getQueryRuleParams(params),
        previousStartedAt,
        rule: { schedule: { interval }, ...rule },
      });
    };

    const shardFailure = {
      shard: 0,
      index: 'auditbeat-1',
      node: 'node-1',
      reason: { type: 'no_shard_available_action_exception', reason: 'shard not available' },
    };

    const mockEmptySearch = () =>
      services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
      });

    it('reports a gap left behind by an earlier run as a warning, not as an error', async () => {
      mockEmptySearch();

      await registerAndRun({ previousStartedAt: new Date(Date.now() - 60 * 60 * 1000) });

      expect(mockedStatusLogger.warn).toHaveBeenCalledWith(gapNoticeMatcher);
      expect(mockedStatusLogger.error).not.toHaveBeenCalledWith(
        gapNoticeMatcher,
        expect.anything()
      );
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          gap_range: { gte: expect.any(String), lte: expect.any(String) },
          gap_reason: { type: 'rule_did_not_run' },
        })
      );
    });

    it('does not record a gap when the search succeeds and there is no drift gap', async () => {
      mockEmptySearch();

      await registerAndRun();

      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledTimes(1);
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ gap_range: undefined })
      );
    });

    it('records a gap for the window of a run whose search failed and still completes the run', async () => {
      services.scopedClusterClient.asCurrentUser.search.mockRejectedValue(
        new Error('no_shard_available_action_exception')
      );

      const result = await registerAndRun();

      // The run completed and returned its state, so the framework advances the anchor as before.
      expect(result).toEqual(expect.objectContaining({ state: expect.any(Object) }));
      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('no_shard_available_action_exception'),
        expect.anything()
      );

      // The execution slice the failed search was scheduled for (one 5-minute interval ending at
      // the run's start, not the full 6-minute query window) is recorded as a gap, so that gap
      // fill replays it with the original query window.
      const gapMetrics = getLastLoggedGap();
      expect(gapMetrics).toEqual(
        expect.objectContaining({
          gap_duration_s: 5 * 60,
          gap_range: { gte: expect.any(String), lte: expect.any(String) },
          gap_reason: { type: 'rule_did_not_run' },
        })
      );
      const { gte, lte } = gapMetrics.gap_range;
      expect(Date.parse(lte) - Date.parse(gte)).toEqual(5 * 60 * 1000);
      expect(Math.abs(Date.now() - Date.parse(lte))).toBeLessThan(10 * 1000);
    });

    it('records a gap when the search returns partial results because a shard failed', async () => {
      services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        took: 0,
        timed_out: false,
        _shards: { failed: 1, skipped: 0, successful: 1, total: 2, failures: [shardFailure] },
      });

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('shard not available'),
        expect.anything()
      );
      expect(getLastLoggedGap()).toEqual(
        expect.objectContaining({
          gap_duration_s: 5 * 60,
          gap_reason: { type: 'rule_did_not_run' },
        })
      );
    });

    it('records a gap for a suppression rule whose search reports success alongside a failed shard', async () => {
      // The grouped search takes the aggregations of the healthy shards and reports success, with
      // the shard failure only listed among the errors. The window was still not fully searched.
      licensing.license$ = new BehaviorSubject(
        licensingMock.createLicense({ license: { type: 'platinum' } })
      );
      services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { relation: 'eq', value: 0 },
        },
        aggregations: { eventGroups: { buckets: [] } },
        took: 0,
        timed_out: false,
        _shards: { failed: 1, skipped: 0, successful: 1, total: 2, failures: [shardFailure] },
      });

      await registerAndRun({ params: { alertSuppression: { groupBy: ['host.name'] } } });

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('shard not available'),
        expect.anything()
      );
      expect(getLastLoggedGap()).toEqual(
        expect.objectContaining({
          gap_duration_s: 5 * 60,
          gap_reason: { type: 'rule_did_not_run' },
        })
      );
    });

    it('does not record a gap when the search fails for a user error', async () => {
      // An invalid query fails identically on every run and on every gap fill attempt, so a
      // gap would only add noise to the gaps UI and keep auto fill retrying.
      services.scopedClusterClient.asCurrentUser.search.mockRejectedValue(
        new Error('verification_exception: Unknown column [foo]')
      );

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('verification_exception'),
        expect.anything()
      );
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledTimes(1);
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ gap_range: undefined })
      );
    });

    it('merges the drift gap with the window of a failed search into a single gap', async () => {
      services.scopedClusterClient.asCurrentUser.search.mockRejectedValue(
        new Error('cluster_block_exception')
      );
      const previousStartedAt = new Date(Date.now() - 60 * 60 * 1000);

      await registerAndRun({ previousStartedAt });

      const gapMetrics = getLastLoggedGap();
      expect(gapMetrics.gap_range.gte).toEqual(previousStartedAt.toISOString());
      expect(Math.abs(Date.now() - Date.parse(gapMetrics.gap_range.lte))).toBeLessThan(10 * 1000);
      expect(gapMetrics.gap_reason).toEqual({ type: 'rule_did_not_run' });
    });

    it('records the failed window on its own as `rule_did_not_run` when the drift gap is `rule_disabled`', async () => {
      services.scopedClusterClient.asCurrentUser.search.mockRejectedValue(
        new Error('no_shard_available_action_exception')
      );
      // The rule was re-enabled just before this run, so the drift gap is attributed to the rule
      // having been disabled. Auto fill excludes that reason by default, so folding the failed
      // window into it would leave the failed window unfilled, and widening it to
      // `rule_did_not_run` would auto fill the period the operator chose to stop the rule. The
      // framework records one gap per run, so the failed slice is recorded on its own.
      const previousStartedAt = new Date(Date.now() - 60 * 60 * 1000);
      const lastEnabledAt = new Date(Date.now() - 60 * 1000);

      await registerAndRun({ previousStartedAt, rule: { lastEnabledAt } });

      // The run searched its own window plus four catch-up intervals and every search failed, so
      // the gap spans those five 5-minute slices and not the hour back to `previousStartedAt`.
      const gapMetrics = getLastLoggedGap();
      expect(gapMetrics.gap_duration_s).toEqual(5 * 5 * 60);
      expect(Math.abs(Date.now() - Date.parse(gapMetrics.gap_range.lte))).toBeLessThan(10 * 1000);
      expect(gapMetrics.gap_reason).toEqual({ type: 'rule_did_not_run' });
    });

    it('does not record a gap when the search succeeds but indexing the alerts fails', async () => {
      // The window was searched and the events found. Replaying it through gap fill is not safe
      // for every rule type (a suppression rule would regroup the events without the original
      // run's suppression state), so a failed alert write is an execution error, not a gap.
      services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [sampleDocNoSortId()],
          total: { relation: 'eq', value: 1 },
        },
        took: 0,
        timed_out: false,
        _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
      });
      jest.mocked((await ruleDataClient.getWriter()).bulk).mockResolvedValueOnce({
        body: {
          errors: true,
          took: 1,
          items: [
            {
              create: {
                _index: '.alerts-security.alerts-default',
                status: 500,
                error: { type: 'es_rejected_execution_exception', reason: 'queue full' },
              },
            },
          ],
        },
      } as unknown as Awaited<ReturnType<IRuleDataWriter['bulk']>>);

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('queue full'),
        expect.anything()
      );
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledTimes(1);
      expect(mockedStatusLogger.logMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ gap_range: undefined })
      );
    });
  });

  it('sends an alert when events are found and logs a warning when hasTimestampFields throws an error', async () => {
    (hasTimestampFields as jest.Mock).mockImplementationOnce(async () => {
      throw Error('hastTimestampFields test error');
    });

    services.scopedClusterClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['some-index'],
      fields: {},
      // @ts-expect-error body does not exist on FieldCapsResponse but is needed for TransportResult shape used by hasTimestampFields
      body: { indices: ['some-index'], fields: {} },
    });

    const queryAlertType = securityRuleTypeWrapper(
      createQueryAlertType({
        id: QUERY_RULE_TYPE_ID,
        name: 'Custom Query Rule',
      })
    );

    alerting.registerType(queryAlertType);

    services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
      hits: {
        hits: [sampleDocNoSortId()],
        total: {
          relation: 'eq',
          value: 1,
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = getQueryRuleParams();

    await executor({ params });

    expect((await ruleDataClient.getWriter()).bulk).toHaveBeenCalled();
    expect(eventsTelemetry.sendAsync).toHaveBeenCalled();
    expect(mockedStatusLogger.warn).toHaveBeenCalledWith(
      'Timestamp fields check failed to execute Error: hastTimestampFields test error'
    );
    expect(mockedStatusLogger.warn).toHaveBeenCalledWith(
      "The rule's max alerts per run setting (10000) is greater than the Kibana alerting limit (1000). The rule will only write a maximum of 1000 alerts per rule run."
    );
  });

  describe('response actions', () => {
    const buildWrapper = (isPreview: boolean, scheduleService: jest.Mock) =>
      createSecurityRuleTypeWrapper({
        ...wrapperOptions,
        isPreview,
        scheduleNotificationResponseActionsService: scheduleService,
      });

    const runRule = async ({ isPreview }: { isPreview: boolean }) => {
      const scheduleService = jest.fn();
      const queryAlertType = buildWrapper(
        isPreview,
        scheduleService
      )(createQueryAlertType({ id: QUERY_RULE_TYPE_ID, name: 'Custom Query Rule' }));
      alerting.registerType(queryAlertType);

      services.scopedClusterClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [sampleDocNoSortId()],
          total: { relation: 'eq', value: 1 },
        },
        took: 0,
        timed_out: false,
        _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
      });

      await executor({ params: getQueryRuleParams() });
      return scheduleService;
    };

    it('dispatches response actions on a normal rule run', async () => {
      const scheduleService = await runRule({ isPreview: false });
      expect(scheduleService).toHaveBeenCalled();
    });

    it('never dispatches response actions during preview', async () => {
      const scheduleService = await runRule({ isPreview: true });
      expect(scheduleService).not.toHaveBeenCalled();
    });
  });

  describe('when exiting early due to an error resolving the input index', () => {
    const dataViewId = 'missing-data-view-id';

    const registerAndRun = async () => {
      const queryAlertType = securityRuleTypeWrapper(
        createQueryAlertType({
          id: QUERY_RULE_TYPE_ID,
          name: 'Custom Query Rule',
        })
      );

      alerting.registerType(queryAlertType);

      await executor({ params: getQueryRuleParams({ dataViewId }) });
    };

    it('closes the rule execution logger when the data view is not found, so the last run object is updated', async () => {
      services.savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', dataViewId)
      );

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Data view is not found.'),
        expect.objectContaining({ userError: true })
      );
      expect(mockedStatusLogger.close).toHaveBeenCalledTimes(1);
    });

    it('closes the rule execution logger when resolving the input index fails unexpectedly, so the last run object is updated', async () => {
      services.savedObjectsClient.get.mockRejectedValueOnce(new Error('Unexpected failure'));

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Check for indices to search failed.')
      );
      expect(mockedStatusLogger.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the rule query fails to parse', () => {
    const registerAndRun = async () => {
      const queryAlertType = securityRuleTypeWrapper(
        createQueryAlertType({
          id: QUERY_RULE_TYPE_ID,
          name: 'Custom Query Rule',
        })
      );

      alerting.registerType(queryAlertType);

      await executor({ params: getQueryRuleParams() });
    };

    it('reports a KQL syntax error as a user error', async () => {
      (getFilter as jest.Mock).mockImplementationOnce(() =>
        fromKueryExpression('host.name: (a or')
      );

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Expected'),
        expect.objectContaining({ userError: true })
      );
    });

    it('does not report other errors thrown while running the rule as user errors', async () => {
      (getFilter as jest.Mock).mockRejectedValueOnce(new Error('Unexpected failure'));

      await registerAndRun();

      expect(mockedStatusLogger.error).toHaveBeenCalledWith(
        'Unexpected failure',
        expect.objectContaining({ userError: false })
      );
    });
  });
});
