/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { AlertsClientError, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';

import { attackDiscoveryScheduleExecutor } from './executor';
import { findDocuments } from '../../../../ai_assistant_data_clients/find';
import { generateAttackDiscoveries } from '../../../../routes/attack_discovery/helpers/generate_discoveries';
import {
  mockAnonymizedAlerts,
  mockAnonymizedAlertsReplacements,
} from '../../evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../evaluation/__mocks__/mock_attack_discoveries';
import { getFindAnonymizationFieldsResultWithSingleHit } from '../../../../__mocks__/response';

jest.mock('../../../../ai_assistant_data_clients/find', () => ({
  ...jest.requireActual('../../../../ai_assistant_data_clients/find'),
  findDocuments: jest.fn(),
}));
jest.mock('../../../../routes/attack_discovery/helpers/generate_discoveries', () => ({
  ...jest.requireActual('../../../../routes/attack_discovery/helpers/generate_discoveries'),
  generateAttackDiscoveries: jest.fn(),
}));

describe('attackDiscoveryScheduleExecutor', () => {
  const mockLogger = loggerMock.create();
  const services = alertsMock.createRuleExecutorServices();
  const actionsClient = actionsClientMock.create();
  const spaceId = 'test-space';
  const params = {
    apiConfig: {
      connectorId: 'test-connector',
      actionTypeId: 'testing',
      model: 'model-1',
      name: 'Test Connector',
    },
  };
  const executorOptions = {
    params,
    services: {
      ...services,
      actionsClient,
    },
    spaceId,
    state: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (findDocuments as jest.Mock).mockResolvedValue(getFindAnonymizationFieldsResultWithSingleHit());
    (generateAttackDiscoveries as jest.Mock).mockResolvedValue({
      anonymizedAlerts: mockAnonymizedAlerts,
      attackDiscoveries: mockAttackDiscoveries,
      replacements: {
        ...mockAnonymizedAlertsReplacements,
        'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90': 'Test-Host-1',
        '039c15c5-3964-43e7-a891-42fe2ceeb9ff': 'Test-User-1',
      },
    });
  });

  it('should throw `AlertsClientError` error if alerts client is not available', async () => {
    const options = {
      services: { ...services, alertsClient: null },
    } as unknown as RuleExecutorOptions;

    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      logger: mockLogger,
      options,
    });
    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toBeInstanceOf(AlertsClientError);
  });

  it('should throw an error if actions client is not available', async () => {
    const options = {
      services: { ...services, actionsClient: undefined },
    } as unknown as RuleExecutorOptions;

    const attackDiscoveryScheduleExecutorPromise = attackDiscoveryScheduleExecutor({
      logger: mockLogger,
      options,
    });
    await expect(attackDiscoveryScheduleExecutorPromise).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Expected actionsClient not to be null!"'
    );
  });

  it('should call `findDocuments` with the correct arguments', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({ logger: mockLogger, options });

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

    await attackDiscoveryScheduleExecutor({ logger: mockLogger, options });
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

    expect(generateAttackDiscoveries).toHaveBeenCalledWith({
      actionsClient,
      config: { ...params, anonymizationFields, subAction: 'invokeAI' },
      esClient: services.scopedClusterClient.asCurrentUser,
      logger: mockLogger,
      savedObjectsClient: services.savedObjectsClient,
    });
  });

  it('should report generated attack discoveries as alerts', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await attackDiscoveryScheduleExecutor({ logger: mockLogger, options });

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      id: expect.anything(),
      actionGroup: 'default',
      payload: {
        'ecs.version': EcsVersion,
        'kibana.alert.attack_discovery.alerts_context_count': 2,
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
        'kibana.alert.attack_discovery.api_config': {
          action_type_id: 'testing',
          connector_id: 'test-connector',
          model: 'model-1',
          name: 'Test Connector',
          provider: undefined,
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
          { uuid: '42c4e419-c859-47a5-b1cb-f069d48fa509', value: 'Administrator' },
          { uuid: 'f5b69281-3e7e-4b52-9225-e5c30dc29c78', value: 'SRVWIN07' },
          { uuid: 'e1cb3cf0-30f3-4f99-a9c8-518b955c6f90', value: 'Test-Host-1' },
          { uuid: '039c15c5-3964-43e7-a891-42fe2ceeb9ff', value: 'Test-User-1' },
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
    });
  });
});
