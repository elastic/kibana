/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule, SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { publicAlertsClientMock } from '@kbn/alerting-plugin/server/alerts_client/alerts_client.mock';
import type {
  IBasePath,
  IUiSettingsClient,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_REASON,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { storedSloDefinitionSchema } from '@kbn/slo-schema';
import {
  getErrorSource,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running/errors';
import { get, omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  ALERT_ACTION,
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
  SUPPRESSED_PRIORITY_ACTION,
} from '../../../../common/constants';
import {
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
} from '../../../../common/burn_rate_rule/field_names';
import type { SLODefinition, StoredSLODefinition } from '../../../domain/models';
import { SLONotFound } from '../../../errors';
import { SO_SLO_TYPE } from '../../../saved_objects';
import { createSLO } from '../../../services/fixtures/slo';
import type { BurnRateAlert } from './executor';
import { getRuleExecutor } from './executor';
import {
  generateAboveThresholdKey,
  generateBurnRateKey,
  generateStatsKey,
  generateWindowId,
  LONG_WINDOW,
  SHORT_WINDOW,
} from './lib/build_query';
import type { EvaluationBucket } from './lib/evaluate';
import type {
  BurnRateAlertContext,
  BurnRateAlertState,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
} from './types';
import { AlertStates } from './types';

const commonEsResponse = {
  took: 100,
  timed_out: false,
  _shards: {
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
};

function createFindResponse(
  sloList: SLODefinition[]
): SavedObjectsFindResponse<StoredSLODefinition> {
  return {
    page: 1,
    per_page: 25,
    total: sloList.length,
    saved_objects: sloList.map((slo) => {
      return {
        id: slo.id,
        attributes: storedSloDefinitionSchema.encode(omit(slo, 'artifacts')),
        type: SO_SLO_TYPE,
        references: [],
        score: 1,
      };
    }),
  };
}

function createGetRuleResponse(
  ruleId: string,
  ruleParams: BurnRateRuleParams
): SavedObject<Rule<BurnRateRuleParams>> {
  return {
    id: ruleId,
    type: 'alert',
    references: [],
    attributes: {
      id: ruleId,
      enabled: true,
      name: 'Fake Parent Rule for SLO Burn Rate',
      alertTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
      consumer: 'observability',
      schedule: { interval: '1m' },
      params: ruleParams,
      tags: [],
      actions: [],
      createdBy: 'nobody',
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'nobody',
      apiKey: 'some-fake-key',
      apiKeyOwner: 'some-user',
      muteAll: false,
      mutedInstanceIds: [],
      revision: 1,
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
    },
  };
}

function getTimeRange() {
  const date = new Date(Date.now()).toISOString();
  return { dateStart: date, dateEnd: date };
}

describe('BurnRateRuleExecutor', () => {
  let esClientMock: ElasticsearchClientMock;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let loggerMock: jest.Mocked<MockedLogger>;
  const basePathMock = { publicBaseUrl: 'https://kibana.dev' } as IBasePath;

  let searchSourceClientMock: jest.Mocked<ISearchStartSearchSource>;
  let uiSettingsClientMock: jest.Mocked<IUiSettingsClient>;
  let servicesMock: jest.Mocked<
    RuleExecutorServices<
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups,
      BurnRateAlert
    >
  >;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    soClientMock = savedObjectsClientMock.create();
    loggerMock = loggingSystemMock.createLogger();
    searchSourceClientMock = jest.fn() as any;
    uiSettingsClientMock = jest.fn() as any;
    servicesMock = {
      savedObjectsClient: soClientMock,
      scopedClusterClient: {
        asCurrentUser: esClientMock,
        asInternalUser: esClientMock,
        asSecondaryAuthUser: esClientMock,
      },
      alertsClient: publicAlertsClientMock.create(),
      alertFactory: {
        create: jest.fn(),
        done: jest.fn(),
        alertLimit: { getValue: jest.fn(), setLimitReached: jest.fn() },
      },
      getSearchSourceClient: jest.fn().mockResolvedValue(searchSourceClientMock),
      uiSettingsClient: uiSettingsClientMock,
      shouldWriteAlerts: jest.fn(),
      shouldStopExecution: jest.fn(),
      share: {} as SharePluginStart,
      getDataViews: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
      getMaintenanceWindowIds: jest.fn().mockResolvedValue([]),
      getMaintenanceWindowNames: jest.fn().mockResolvedValue([]),
      getAsyncSearchClient: jest.fn().mockReturnValue({ search: jest.fn() }),
    };
  });

  describe('multi-window', () => {
    it('throws when the slo is not found', async () => {
      soClientMock.find.mockRejectedValue(new SLONotFound('SLO [non-existent] not found'));
      const executor = getRuleExecutor(basePathMock);

      try {
        await executor({
          params: someRuleParamsWithWindows({ sloId: 'non-existent' }),
          startedAt: new Date(),
          startedAtOverridden: false,
          services: servicesMock,
          executionId: 'irrelevant',
          logger: loggerMock,
          previousStartedAt: null,
          rule: {
            id: '123-456',
            name: 'an slo rule',
          } as SanitizedRuleConfig,
          spaceId: 'irrelevant',
          state: {},
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          getTimeRange,
          isServerless: false,
        });
        throw new Error('the executor ran successfully, but should not have');
      } catch (err) {
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
        expect(err.message).toBe(
          'Rule "an slo rule" 123-456 is referencing an SLO which cannot be found: "non-existent": SLO [non-existent] not found'
        );
      }
    });

    it('returns early when the slo is disabled', async () => {
      const slo = createSLO({ objective: { target: 0.9 }, enabled: false });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const executor = getRuleExecutor(basePathMock);

      const result = await executor({
        params: someRuleParamsWithWindows({ sloId: slo.id }),
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(esClientMock.search).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.report).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.setAlertData).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.getRecoveredAlerts).not.toHaveBeenCalled();
      expect(result).toEqual({ state: {} });
    });

    it('does not schedule an alert when long windows burn rates are below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 0.9 },
            { shortWindowBurnRate: 1.2, longWindowBurnRate: 0.9 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 0.9 },
            { shortWindowBurnRate: 1.2, longWindowBurnRate: 0.9 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      const executor = getRuleExecutor(basePathMock);
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient?.report).not.toBeCalled();
      expect(servicesMock.alertsClient?.setAlertData).not.toBeCalled();
    });

    it('does not schedule an alert when the short window burn rate is below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 2.1 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 2.1 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      const executor = getRuleExecutor(basePathMock);
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient?.report).not.toBeCalled();
      expect(servicesMock.alertsClient?.setAlertData).not.toBeCalled();
    });

    it('schedules an alert when both windows of first window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({
        objective: { target: 0.9 },
        groupBy: ['group.by.field', 'client.geo.continent_name'],
      });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo,asia',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 2.3 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
          groupings: {
            group: { by: { field: 'foo' } },
            client: { geo: { continent_name: 'asia' } },
          },
        },
        {
          instanceId: 'bar,asia',
          windows: [
            { shortWindowBurnRate: 2.2, longWindowBurnRate: 2.5 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
          groupings: {
            group: { by: { field: 'bar' } },
            client: { geo: { continent_name: 'asia' } },
          },
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor(basePathMock);

      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'foo,asia',
        actionGroup: ALERT_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo,asia. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.1,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'foo,asia',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'foo',
            },
            {
              field: 'client.geo.continent_name',
              value: 'asia',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'foo' } },
            client: { geo: { continent_name: 'asia' } },
          },
          'client.geo.continent_name': 'asia',
        },
      });
      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'bar,asia',
        actionGroup: ALERT_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar,asia. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'bar,asia',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'bar',
            },
            {
              field: 'client.geo.continent_name',
              value: 'asia',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'bar' } },
            client: { geo: { continent_name: 'asia' } },
          },
          'client.geo.continent_name': 'asia',
        },
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenCalledTimes(2);
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(1, {
        id: 'foo,asia',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.3, duration: '1h' },
          shortWindow: { burnRate: 2.1, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo,asia. Alert when above 2 for both windows',
          alertDetailsUrl: 'https://kibana.dev/s/irrelevant/app/observability/alerts/uuid-foo,asia',
        }),
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(2, {
        id: 'bar,asia',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.5, duration: '1h' },
          shortWindow: { burnRate: 2.2, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar,asia. Alert when above 2 for both windows',
          alertDetailsUrl: 'https://kibana.dev/s/irrelevant/app/observability/alerts/uuid-bar,asia',
        }),
      });
    });

    it('schedules a suppressed alert when both windows of first window definition burn rate have reached the threshold but the dependency matches', async () => {
      const slo = createSLO({
        objective: { target: 0.9 },
        groupBy: ['group.by.field'],
      });
      const dependencyRuleParams = someRuleParamsWithWindows({ sloId: slo.id });
      const ruleParams = someRuleParamsWithWindows({
        sloId: slo.id,
        dependencies: [{ ruleId: `partent-rule`, actionGroupsToSuppressOn: [ALERT_ACTION.id] }],
      });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 2.3 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
          groupings: {
            group: { by: { field: 'foo' } },
          },
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 2.2, longWindowBurnRate: 2.5 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
          groupings: {
            group: { by: { field: 'bar' } },
          },
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      // evaluateDependendes mocks
      soClientMock.get.mockResolvedValueOnce(
        createGetRuleResponse('parent-rule', dependencyRuleParams)
      );

      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));

      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor(basePathMock);

      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'foo',
        actionGroup: SUPPRESSED_PRIORITY_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'SUPPRESSED - CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.1,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'foo',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'foo',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'foo' } },
          },
        },
      });
      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'bar',
        actionGroup: SUPPRESSED_PRIORITY_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'SUPPRESSED - CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'bar',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'bar',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'bar' } },
          },
        },
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(1, {
        id: 'foo',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.3, duration: '1h' },
          shortWindow: { burnRate: 2.1, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'SUPPRESSED - CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo. Alert when above 2 for both windows',
          alertDetailsUrl: 'https://kibana.dev/s/irrelevant/app/observability/alerts/uuid-foo',
          grouping: {
            group: { by: { field: 'foo' } },
          },
        }),
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(2, {
        id: 'bar',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.5, duration: '1h' },
          shortWindow: { burnRate: 2.2, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'SUPPRESSED - CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar. Alert when above 2 for both windows',
          alertDetailsUrl: 'https://kibana.dev/s/irrelevant/app/observability/alerts/uuid-bar',
          grouping: {
            group: { by: { field: 'bar' } },
          },
        }),
      });
    });

    it('schedules an alert when both windows of second window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 }, groupBy: ['group.by.field'] });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 1.0, longWindowBurnRate: 2.0 },
            { shortWindowBurnRate: 1.9, longWindowBurnRate: 1.2 },
          ],
          groupings: {
            group: { by: { field: 'foo' } },
          },
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 1.0, longWindowBurnRate: 2.0 },
            { shortWindowBurnRate: 1.5, longWindowBurnRate: 1.1 },
          ],
          groupings: {
            group: { by: { field: 'bar' } },
          },
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );
      // Mock summary repository es searches
      esClientMock.search.mockResolvedValueOnce(generateEsSummaryResponse());
      esClientMock.search.mockResolvedValueOnce(generateEsSummaryResponse());

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor(basePathMock);
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient!.report).toBeCalledWith({
        id: 'foo',
        actionGroup: HIGH_PRIORITY_ACTION_ID,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'HIGH: The burn rate for the past 6h is 1.2 and for the past 30m is 1.9 for foo. Alert when above 1 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 1,
          [ALERT_EVALUATION_VALUE]: 1.2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'foo',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'foo',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'foo' } },
          },
        },
      });
      expect(servicesMock.alertsClient!.report).toBeCalledWith({
        id: 'bar',
        actionGroup: HIGH_PRIORITY_ACTION_ID,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'HIGH: The burn rate for the past 6h is 1.1 and for the past 30m is 1.5 for bar. Alert when above 1 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 1,
          [ALERT_EVALUATION_VALUE]: 1.1,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'bar',
          [ALERT_GROUP]: [
            {
              field: 'group.by.field',
              value: 'bar',
            },
          ],
          [ALERT_GROUPING]: {
            group: { by: { field: 'bar' } },
          },
        },
      });

      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(1, {
        id: 'foo',
        context: expect.objectContaining({
          longWindow: { burnRate: 1.2, duration: '6h' },
          shortWindow: { burnRate: 1.9, duration: '30m' },
          burnRateThreshold: 1,
          reason:
            'HIGH: The burn rate for the past 6h is 1.2 and for the past 30m is 1.9 for foo. Alert when above 1 for both windows',
          sloId: slo.id,
          sloName: slo.name,
          sloInstanceId: 'foo',
          sliValue: 0.9,
          sloStatus: 'HEALTHY',
          sloErrorBudgetRemaining: 0.4,
          sloErrorBudgetConsumed: 0.6,
        }),
      });

      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(2, {
        id: 'bar',
        context: expect.objectContaining({
          longWindow: { burnRate: 1.1, duration: '6h' },
          shortWindow: { burnRate: 1.5, duration: '30m' },
          burnRateThreshold: 1,
          reason:
            'HIGH: The burn rate for the past 6h is 1.1 and for the past 30m is 1.5 for bar. Alert when above 1 for both windows',
          sloId: slo.id,
          sloName: slo.name,
          sloInstanceId: 'bar',
          sliValue: 0.9,
          sloStatus: 'HEALTHY',
          sloErrorBudgetRemaining: 0.4,
          sloErrorBudgetConsumed: 0.6,
        }),
      });
    });

    it('includes APM service and transaction fields in alert when available in SLO summary', async () => {
      const slo = createSLO({
        objective: { target: 0.9 },
      });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: '*',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 2.3 },
            { shortWindowBurnRate: 1.2, longWindowBurnRate: 1.5 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: '*' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: '*' })
      );
      esClientMock.search.mockResolvedValueOnce(generateEsSummaryResponseWithApmFields());

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor(basePathMock);
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        startedAtOverridden: false,
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
        isServerless: false,
      });

      expect(servicesMock.alertsClient!.report).toBeCalledWith({
        id: '*',
        actionGroup: ALERT_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: expect.objectContaining({
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: '*',
          'service.name': 'my-service',
          'service.environment': 'production',
          'transaction.name': 'GET /api/endpoint',
          'transaction.type': 'request',
        }),
      });
    });
  });
});

function someRuleParamsWithWindows(params: Partial<BurnRateRuleParams> = {}): BurnRateRuleParams {
  return {
    sloId: uuidv4(),
    windows: [
      {
        id: uuidv4(),
        burnRateThreshold: 2,
        maxBurnRateThreshold: 720,
        longWindow: { value: 1, unit: 'h' },
        shortWindow: { value: 5, unit: 'm' },
        actionGroup: ALERT_ACTION_ID,
      },
      {
        id: uuidv4(),
        burnRateThreshold: 1,
        maxBurnRateThreshold: 720,
        longWindow: { value: 6, unit: 'h' },
        shortWindow: { value: 30, unit: 'm' },
        actionGroup: HIGH_PRIORITY_ACTION_ID,
      },
    ],
    ...params,
  };
}

interface ResponseBucket {
  instanceId: string;
  windows: Array<{
    shortWindowBurnRate: number;
    longWindowBurnRate: number;
  }>;
  groupings?: Record<string, unknown> | undefined;
}

interface AfterKey {
  instanceId: string;
}

function generateEsResponse(
  params: BurnRateRuleParams,
  buckets: ResponseBucket[],
  afterKey: AfterKey
) {
  return {
    ...commonEsResponse,
    aggregations: {
      instances: {
        after: afterKey,
        doc_count: buckets.length ? 100 : 0,
        buckets: buckets
          .map((bucket) => {
            return bucket.windows.reduce(
              (acc, win, index) => ({
                ...acc,
                [generateStatsKey(generateWindowId(index), SHORT_WINDOW)]: {
                  doc_count: 100,
                  good: { value: win.shortWindowBurnRate * 100 },
                  total: { value: 100 },
                },
                [generateStatsKey(generateWindowId(index), LONG_WINDOW)]: {
                  doc_count: 100,
                  good: { value: win.longWindowBurnRate * 100 },
                  total: { value: 100 },
                },
                [generateBurnRateKey(generateWindowId(index), SHORT_WINDOW)]: {
                  value: win.shortWindowBurnRate,
                },
                [generateBurnRateKey(generateWindowId(index), LONG_WINDOW)]: {
                  value: win.longWindowBurnRate,
                },
                [generateAboveThresholdKey(generateWindowId(index), SHORT_WINDOW)]: {
                  value: win.shortWindowBurnRate >= params.windows[index].burnRateThreshold ? 1 : 0,
                },
                [generateAboveThresholdKey(generateWindowId(index), LONG_WINDOW)]: {
                  value: win.longWindowBurnRate >= params.windows[index].burnRateThreshold ? 1 : 0,
                },
              }),
              {
                key: { instanceId: bucket.instanceId },
                doc_count: 100,
                groupings: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          slo: {
                            groupings: bucket.groupings,
                          },
                        },
                      },
                    ],
                  },
                },
              } as EvaluationBucket
            );
          })
          .filter((bucket: any) =>
            params.windows.some(
              (_win, index) =>
                get(
                  bucket,
                  [generateAboveThresholdKey(generateWindowId(index), SHORT_WINDOW), 'value'],
                  0
                ) === 1 &&
                get(
                  bucket,
                  [generateAboveThresholdKey(generateWindowId(index), LONG_WINDOW), 'value'],
                  0
                ) === 1
            )
          ),
      },
    },
  };
}

function generateEsSummaryResponse() {
  return {
    ...commonEsResponse,
    hits: {
      hits: [
        {
          _index: '.slo-observability.summary-v3.2',
          _id: 'X19fX19fJWJbqiqq1WN9x1e_kHkXpwAA',
          _source: {
            sliValue: 0.9,
            status: 'HEALTHY',
            errorBudgetConsumed: 0.6,
            errorBudgetRemaining: 0.4,
          },
        },
      ],
    },
  };
}

function generateEsSummaryResponseWithApmFields() {
  return {
    ...commonEsResponse,
    hits: {
      hits: [
        {
          _index: '.slo-observability.summary-v3.2',
          _id: 'X19fX19fJWJbqiqq1WN9x1e_kHkXpwAA',
          _source: {
            sliValue: 0.9,
            status: 'HEALTHY',
            errorBudgetConsumed: 0.6,
            errorBudgetRemaining: 0.4,
            service: {
              environment: 'production',
              name: 'my-service',
            },
            transaction: {
              name: 'GET /api/endpoint',
              type: 'request',
            },
          },
        },
      ],
    },
  };
}
