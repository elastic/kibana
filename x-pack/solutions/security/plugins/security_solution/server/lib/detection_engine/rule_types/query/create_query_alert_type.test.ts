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
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { docLinksServiceMock } from '@kbn/core/server/mocks';
import { hasTimestampFields } from '../utils/utils';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine';

const actualHasTimestampFields = jest.requireActual('../utils/utils').hasTimestampFields;
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  getExceptions: () => [],
  hasTimestampFields: jest.fn(async () => {
    return {
      foundNoIndices: false,
      warningMessage: undefined,
    };
  }),
  hasReadIndexPrivileges: jest.fn(async () => undefined),
  checkForFrozenIndices: jest.fn(async () => []),
}));

jest.mock('@kbn/alerting-plugin/server', () => ({
  ...jest.requireActual('@kbn/alerting-plugin/server'),
  shouldCreateAlertsInAllSpaces: jest.fn().mockReturnValue(false),
}));

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

  const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
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
  });

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
    (hasTimestampFields as jest.Mock).mockImplementationOnce(actualHasTimestampFields); // default behavior will produce a 'no indices found' result from this helper
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
    expect(mockedStatusLogger.logStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        newStatus: RuleExecutionStatusEnum['partial failure'],
        message:
          'This rule is attempting to query data from Elasticsearch indices listed in the "Index patterns" section of the rule definition, however no index matching: ["auditbeat-*","filebeat-*","packetbeat-*","winlogbeat-*"] was found. This warning will continue to appear until a matching index is created or this rule is disabled.',
      })
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

    // mock field caps so as not to short-circuit on "no indices found"
    services.scopedClusterClient.asInternalUser.fieldCaps.mockResolvedValueOnce({
      // @ts-expect-error our fieldCaps mock only seems to use the last value of the overloaded FieldCapsApi
      body: {
        indices: params.index!,
        fields: {
          _id: {
            _id: {
              type: '_id',
              metadata_field: true,
              searchable: true,
              aggregatable: false,
            },
          },
        },
      },
    });

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

  it('sends an alert when events are found and logs a warning when hasTimestampFields throws an error', async () => {
    (hasTimestampFields as jest.Mock).mockImplementationOnce(async () => {
      throw Error('hastTimestampFields test error');
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
    // ensures that the last status written is a warning status
    // and that status contains the error message
    expect(mockedStatusLogger.logStatusChange).lastCalledWith(
      expect.objectContaining({
        newStatus: RuleExecutionStatusEnum['partial failure'],
        message:
          'Timestamp fields check failed to execute Error: hastTimestampFields test error\n' +
          '\n' +
          "The rule's max alerts per run setting (10000) is greater than the Kibana alerting limit (1000). The rule will only write a maximum of 1000 alerts per rule run.",
      })
    );
  });
});
