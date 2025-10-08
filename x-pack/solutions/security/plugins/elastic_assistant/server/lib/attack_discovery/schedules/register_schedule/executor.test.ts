/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { analyticsServiceMock } from '@kbn/core/server/mocks';

import { attackDiscoveryScheduleExecutor } from './executor';
import { findDocuments } from '../../../../ai_assistant_data_clients/find';
import { generateAttackDiscoveries } from '../../../../routes/attack_discovery/helpers/generate_discoveries';
import {
  reportAttackDiscoveryGenerationFailure,
  reportAttackDiscoveryGenerationSuccess,
} from '../../../../routes/attack_discovery/helpers/telemetry';
import {
  mockAnonymizedAlerts,
  mockAnonymizedAlertsReplacements,
} from '../../evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../evaluation/__mocks__/mock_attack_discoveries';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../../../__mocks__/response';
import { deduplicateAttackDiscoveries } from '../../persistence/deduplication';
import * as transforms from '../../persistence/transforms/transform_to_alert_documents';

jest.mock('../../../../ai_assistant_data_clients/find', () => ({
  ...jest.requireActual('../../../../ai_assistant_data_clients/find'),
  findDocuments: jest.fn(),
}));
jest.mock('../../../../routes/attack_discovery/helpers/generate_discoveries', () => ({
  ...jest.requireActual('../../../../routes/attack_discovery/helpers/generate_discoveries'),
  generateAttackDiscoveries: jest.fn(),
}));
jest.mock('../../../../routes/attack_discovery/helpers/telemetry', () => ({
  ...jest.requireActual('../../../../routes/attack_discovery/helpers/telemetry'),
  reportAttackDiscoveryGenerationFailure: jest.fn(),
  reportAttackDiscoveryGenerationSuccess: jest.fn(),
}));
jest.mock('../../persistence/deduplication', () => ({
  ...jest.requireActual('../../persistence/deduplication'),
  deduplicateAttackDiscoveries: jest.fn(),
}));

describe('attackDiscoveryScheduleExecutor', () => {
  const date = '2025-05-20T15:18:21.000Z';
  const mockLogger = loggerMock.create();
  const mockTelemetry = analyticsServiceMock.createAnalyticsServiceSetup();
  const actionsClient = actionsClientMock.create();
  const ruleExecutorServices = alertsMock.createRuleExecutorServices();
  const services = {
    ...ruleExecutorServices,
    actionsClient,
  };
  const spaceId = 'test-space';
  const params = {
    alertsIndexPattern: 'test-index-*',
    apiConfig: {
      connectorId: 'test-connector',
      actionTypeId: 'testing',
      model: 'model-1',
      name: 'Test Connector',
    },
    query: 'host.name : *',
    filters: [
      {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          index: '530a0bfd-8996-441a-b788-c8bba251bdf3',
          key: '@timestamp',
          field: '@timestamp',
          value: 'exists',
          type: 'exists',
        },
        query: {
          exists: {
            field: '@timestamp',
          },
        },
        $state: {
          store: 'appState',
        },
      },
    ],
    combinedFilter: {
      bool: {
        must: [],
        filter: [
          {
            exists: {
              field: '@timestamp',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
    size: 123,
    start: 'now-24h',
  };
  const executorOptions = {
    params,
    rule: {
      id: 'rule-1',
      schedule: { interval: '12m' },
      actions: [{ actionTypeId: '.slack' }, { actionTypeId: '.jest' }],
    },
    services,
    spaceId,
    state: {},
  };
  const mockReplacements = {
    ...mockAnonymizedAlertsReplacements,
    'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90': 'Test-Host-1',
    '039c15c5-3964-43e7-a891-42fe2ceeb9ff': 'Test-User-1',
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date(date));

    (services.alertsClient.report as jest.Mock).mockReturnValue({ uuid: 'fake-alert' });

    (findDocuments as jest.Mock).mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit());
    (generateAttackDiscoveries as jest.Mock).mockResolvedValue({
      anonymizedAlerts: mockAnonymizedAlerts,
      attackDiscoveries: mockAttackDiscoveries,
      replacements: mockReplacements,
    });
    (deduplicateAttackDiscoveries as jest.Mock).mockResolvedValue(mockAttackDiscoveries);

    services.shouldStopExecution = () => false;
  });

  it('should throw `AlertsClientError` error if alerts client is not available', async () => {
    const options = {
      services: { ...services, alertsClient: null },
    } as unknown as RuleExecutorOptions;

    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });
    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toBeInstanceOf(AlertsClientError);
  });

  it('should throw an error if actions client is not available', async () => {
    const options = {
      services: { ...services, actionsClient: undefined },
    } as unknown as RuleExecutorOptions;

    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });
    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Expected actionsClient not to be null!"'
    );
  });

  it('should call `findDocuments` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(findDocuments).toHaveBeenCalledWith({
      esClient: services.scopedClusterClient.asCurrentUser,
      page: 1,
      perPage: 1000,
      index: '.kibana-elastic-ai-assistant-anonymization-fields-test-space',
      logger: mockLogger,
    });
  });

  it('should call `generateAttackDiscoveries` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });
    const anonymizationFields = [
      {
        timestamp: '2019-12-13T16:40:33.400Z',
        createdAt: '2019-12-13T16:40:33.400Z',
        field: 'testField',
        allowed: true,
        anonymized: false,
        updatedAt: '2019-12-13T16:40:33.400Z',
        namespace: 'default',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      },
    ];

    const { query, filters, combinedFilter, ...restParams } = params;
    expect(generateAttackDiscoveries).toHaveBeenCalledWith({
      actionsClient,
      config: { ...restParams, filter: combinedFilter, anonymizationFields, subAction: 'invokeAI' },
      esClient: services.scopedClusterClient.asCurrentUser,
      logger: mockLogger,
      savedObjectsClient: services.savedObjectsClient,
    });
  });

  it('should call `reportAttackDiscoveryGenerationFailure` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    (generateAttackDiscoveries as jest.Mock).mockRejectedValue(new Error('Big time failure'));

    await expect(async () => {
      await attackDiscoveryScheduleExecutor({
        options,
        logger: mockLogger,
        publicBaseUrl: undefined,
        telemetry: mockTelemetry,
      });
    }).rejects.toThrow();

    expect(reportAttackDiscoveryGenerationFailure).toHaveBeenCalledWith({
      apiConfig: params.apiConfig,
      errorMessage: 'Big time failure',
      scheduleInfo: { id: 'rule-1', interval: '12m', actions: ['.slack', '.jest'] },
      telemetry: mockTelemetry,
    });
  });

  it('should call `reportAttackDiscoveryGenerationSuccess` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(reportAttackDiscoveryGenerationSuccess).toHaveBeenCalledWith({
      alertsContextCount: 2,
      apiConfig: params.apiConfig,
      attackDiscoveries: mockAttackDiscoveries,
      durationMs: 0,
      hasFilter: true,
      scheduleInfo: { id: 'rule-1', interval: '12m', actions: ['.slack', '.jest'] },
      size: 123,
      start: 'now-24h',
      telemetry: mockTelemetry,
    });
  });

  it('should report generated attack discoveries as alerts', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    const { alertIds, timestamp, mitreAttackTactics } = mockAttackDiscoveries[0];
    expect(services.alertsClient.report).toHaveBeenCalledWith({
      id: 'c6f1252a8be68c4dc8d6181ef2c0b8da4288d7856ad7bbfccb888730023d9629',
      actionGroup: 'default',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      id: expect.anything(),
      payload: {
        'ecs.version': EcsVersion,
        'kibana.alert.instance.id':
          'c6f1252a8be68c4dc8d6181ef2c0b8da4288d7856ad7bbfccb888730023d9629',
        'kibana.alert.uuid': 'fake-alert',
        'kibana.alert.attack_discovery.alert_ids': [
          '4af5689eb58c2420efc0f7fad53c5bf9b8b6797e516d6ea87d6044ce25d54e16',
          'c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b',
          '021b27d6bee0650a843be1d511119a3b5c7c8fdaeff922471ce0248ad27bd26c',
          '6cc8d5f0e1c2b6c75219b001858f1be64194a97334be7a1e3572f8cfe6bae608',
          'f39a4013ed9609584a8a22dca902e896aa5b24d2da03e0eaab5556608fa682ac',
          '909968e926e08a974c7df1613d98ebf1e2422afcb58e4e994beb47b063e85080',
          '2c25a4dc31cd1ec254c2b19ea663fd0b09a16e239caa1218b4598801fb330da6',
          '3bf907becb3a4f8e39a3b673e0d50fc954a7febef30c12891744c603760e4998',
        ],
        'kibana.alert.attack_discovery.alerts_context_count': 2,
        'kibana.alert.attack_discovery.api_config': {
          action_type_id: 'testing',
          connector_id: 'test-connector',
          model: 'model-1',
          name: 'Test Connector',
        },
        'kibana.alert.attack_discovery.details_markdown':
          '- On `2023-06-19T00:28:38.061Z` a critical malware detection alert was triggered on host {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} running {{ host.os.name macOS }} version {{ host.os.version 13.4 }}.\n- The malware was identified as {{ file.name unix1 }} with SHA256 hash {{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}.\n- The process {{ process.name My Go Application.app }} was executed with command line {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}.\n- The process was not trusted as its code signature failed to satisfy specified code requirements.\n- The user involved was {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.\n- Another critical alert was triggered for potential credentials phishing via {{ process.name osascript }} on the same host.\n- The phishing attempt involved displaying a dialog to capture the user\'s password.\n- The process {{ process.name osascript }} was executed with command line {{ process.command_line osascript -e display dialog "MacOS wants to access System Preferences\\n\\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬ }}.\n- The MITRE ATT&CK tactics involved include Credential Access and Input Capture.',
        'kibana.alert.attack_discovery.details_markdown_with_replacements':
          '- On `2023-06-19T00:28:38.061Z` a critical malware detection alert was triggered on host {{ host.name Test-Host-1 }} running {{ host.os.name macOS }} version {{ host.os.version 13.4 }}.\n- The malware was identified as {{ file.name unix1 }} with SHA256 hash {{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}.\n- The process {{ process.name My Go Application.app }} was executed with command line {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}.\n- The process was not trusted as its code signature failed to satisfy specified code requirements.\n- The user involved was {{ user.name Test-User-1 }}.\n- Another critical alert was triggered for potential credentials phishing via {{ process.name osascript }} on the same host.\n- The phishing attempt involved displaying a dialog to capture the user\'s password.\n- The process {{ process.name osascript }} was executed with command line {{ process.command_line osascript -e display dialog "MacOS wants to access System Preferences\\n\\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬ }}.\n- The MITRE ATT&CK tactics involved include Credential Access and Input Capture.',
        'kibana.alert.attack_discovery.entity_summary_markdown':
          'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.',
        'kibana.alert.attack_discovery.entity_summary_markdown_with_replacements':
          'Critical malware and phishing alerts detected on {{ host.name Test-Host-1 }} involving user {{ user.name Test-User-1 }}.',
        'kibana.alert.attack_discovery.mitre_attack_tactics': [
          'Credential Access',
          'Input Capture',
        ],
        'kibana.alert.attack_discovery.replacements': [
          {
            uuid: '42c4e419-c859-47a5-b1cb-f069d48fa509',
            value: 'Administrator',
          },
          {
            uuid: 'f5b69281-3e7e-4b52-9225-e5c30dc29c78',
            value: 'SRVWIN07',
          },
          {
            uuid: 'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90',
            value: 'Test-Host-1',
          },
          {
            uuid: '039c15c5-3964-43e7-a891-42fe2ceeb9ff',
            value: 'Test-User-1',
          },
        ],
        'kibana.alert.attack_discovery.summary_markdown':
          'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}. Malware identified as {{ file.name unix1 }} and phishing attempt via {{ process.name osascript }}.',
        'kibana.alert.attack_discovery.summary_markdown_with_replacements':
          'Critical malware and phishing alerts detected on {{ host.name Test-Host-1 }} involving user {{ user.name Test-User-1 }}. Malware identified as {{ file.name unix1 }} and phishing attempt via {{ process.name osascript }}.',
        'kibana.alert.attack_discovery.title':
          'Critical Malware and Phishing Alerts on host e1cb3cf0-30f3-4f99-a9c8-518b955c6f90',
        'kibana.alert.attack_discovery.title_with_replacements':
          'Critical Malware and Phishing Alerts on host Test-Host-1',
      },
      context: {
        attack: {
          alertIds,
          detailsMarkdown:
            '- On `2023-06-19T00:28:38.061Z` a critical malware detection alert was triggered on host `Test-Host-1` running `macOS` version `13.4`.\n- The malware was identified as `unix1` with SHA256 hash `0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231`.\n- The process `My Go Application.app` was executed with command line `/private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app`.\n- The process was not trusted as its code signature failed to satisfy specified code requirements.\n- The user involved was `Test-User-1`.\n- Another critical alert was triggered for potential credentials phishing via `osascript` on the same host.\n- The phishing attempt involved displaying a dialog to capture the user\'s password.\n- The process `osascript` was executed with command line `osascript -e display dialog "MacOS wants to access System Preferences\\n\\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬`.\n- The MITRE ATT&CK tactics involved include Credential Access and Input Capture.',
          entitySummaryMarkdown:
            'Critical malware and phishing alerts detected on `Test-Host-1` involving user `Test-User-1`.',
          mitreAttackTactics,
          summaryMarkdown:
            'Critical malware and phishing alerts detected on `Test-Host-1` involving user `Test-User-1`. Malware identified as `unix1` and phishing attempt via `osascript`.',
          timestamp,
          title: 'Critical Malware and Phishing Alerts on host Test-Host-1',
        },
      },
    });
  });

  it('should generated attack discovery details url and pass via alerts context', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: 'http://fake-host.io/test',
      telemetry: mockTelemetry,
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      id: expect.anything(),
      payload: expect.anything(),
      context: {
        attack: expect.objectContaining({
          detailsUrl:
            'http://fake-host.io/test/s/test-space/app/security/attack_discovery?id=fake-alert',
        }),
      },
    });
  });

  it('should throw an error on execution timeout', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    options.services.shouldStopExecution = () => true;

    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });
    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Rule execution cancelled due to timeout"'
    );
  });

  it('should call `deduplicateAttackDiscoveries` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(deduplicateAttackDiscoveries).toHaveBeenCalledWith({
      attackDiscoveries: mockAttackDiscoveries,
      connectorId: params.apiConfig.connectorId,
      esClient: services.scopedClusterClient.asCurrentUser,
      indexPattern: '.alerts-security.attack.discovery.alerts-test-space',
      logger: mockLogger,
      ownerInfo: {
        id: executorOptions.rule.id,
        isSchedule: true,
      },
      replacements: mockReplacements,
      spaceId,
    });
  });

  it('should not report duplicate attack discoveries as alerts', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    (deduplicateAttackDiscoveries as jest.Mock).mockResolvedValue([]);

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(executorOptions.services.alertsClient.report).not.toHaveBeenCalled();
  });

  it('should report only non-duplicate attack discoveries as alerts and log correct duplicate count', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    (deduplicateAttackDiscoveries as jest.Mock).mockResolvedValue([
      ...mockAttackDiscoveries.slice(1),
    ]);

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    // Only the second and further discoveries should be reported
    expect(services.alertsClient.report).toHaveBeenCalledTimes(mockAttackDiscoveries.length - 1);

    // Check that the reported payloads are correct
    for (let i = 1; i < mockAttackDiscoveries.length; ++i) {
      const { alertIds, timestamp, mitreAttackTactics } = mockAttackDiscoveries[i];
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        id: expect.anything(),
        actionGroup: 'default',
      });

      expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
        id: expect.anything(),
        payload: expect.any(Object),
        context: { attack: expect.objectContaining({ alertIds, timestamp, mitreAttackTactics }) },
      });
    }
  });

  it('should report all attack discoveries as alerts if there are no duplicates', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    (deduplicateAttackDiscoveries as jest.Mock).mockResolvedValue(mockAttackDiscoveries);

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(mockAttackDiscoveries.length);

    // Check that the reported payloads are correct
    for (let i = 0; i < mockAttackDiscoveries.length; ++i) {
      const { alertIds, timestamp, mitreAttackTactics } = mockAttackDiscoveries[i];
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        id: expect.anything(),
        actionGroup: 'default',
      });

      expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
        id: expect.anything(),
        payload: expect.any(Object),
        context: { attack: expect.objectContaining({ alertIds, timestamp, mitreAttackTactics }) },
      });
    }
  });

  it('should call transformToBaseAlertDocument with alertsParams.withReplacements set to false', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    const spy = jest.spyOn(transforms, 'transformToBaseAlertDocument');

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    const firstCallArg = spy.mock.calls[0][0] as {
      alertsParams: { withReplacements?: boolean };
    };
    expect(firstCallArg.alertsParams.withReplacements).toBe(false);

    spy.mockRestore();
  });

  it('should call transformToBaseAlertDocument with alertsParams.enableFieldRendering set to true', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;
    const spy = jest.spyOn(transforms, 'transformToBaseAlertDocument');

    await attackDiscoveryScheduleExecutor({
      options,
      logger: mockLogger,
      publicBaseUrl: undefined,
      telemetry: mockTelemetry,
    });

    const firstCallArg = spy.mock.calls[0][0] as {
      alertsParams: { enableFieldRendering?: boolean };
    };
    expect(firstCallArg.alertsParams.enableFieldRendering).toBe(true);

    spy.mockRestore();
  });
});
