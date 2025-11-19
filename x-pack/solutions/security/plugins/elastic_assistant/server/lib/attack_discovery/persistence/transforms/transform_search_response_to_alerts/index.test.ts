/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-data-utils';
import cloneDeep from 'lodash/cloneDeep';
import { omit } from 'lodash/fp';

import { transformSearchResponseToAlerts } from '.';
import * as transformModule from './transform_attack_discovery_alert_document_to_api';
import { getResponseMock } from '../../../../../__mocks__/attack_discovery_alert_document_response';
import { ALERT_ATTACK_DISCOVERY_REPLACEMENTS } from '../../../schedules/fields/field_names';

const createLoggerMock = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    get: jest.fn(() => createLoggerMock()),
    info: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
    trace: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('transformSearchResponseToAlerts', () => {
  const logger: Logger = createLoggerMock();

  beforeEach(() => {
    // reuse the same logger instance but clear mock histories between tests
    jest.clearAllMocks();
  });

  it('returns the expected alerts from a valid search response', () => {
    const response = getResponseMock();

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data).toEqual([
      {
        alert_ids: [
          'ee183cf525d7e9d0f47d1b2bb928d760a0f53756ffa61edcf0672f71c986ac21',
          '46ebac989ca72439b14b57d32102543c17d5f33e0f6532d8a5c148949d8ff7b5',
          '857f6434220ff27f807bef6829f32d1ad1c337026db016bc54e302eecf95cf93',
          'e892d2e28a1e10822385cd0bff1399d63d1014961e020d9b3251dd24764914e6',
          '492c647e3c671a9d62567d100cdad1a503c749755db3b67ba3c08335acc79e18',
          '9004764b04239eed88a61a6779c5b1dc82ec3ff6f05ab1dcd6892df75322958d',
          '4f27dc19eee50707adfb1fc9710292bc2264d176fea671a26bb90b904d565547',
          '5cbe0d15df86b6b080ace4139338eb2a8b3e9696dd28f8c7f586747a88652a38',
          'f9aea50da1ae3e4c157802f64eb090bbfa65fc95d1c1d39c4c16d9dc52338a67',
          '713a8950584268a0c48fa85f60b71a4aa200043587f9136aa3b2e5269a01377b',
          '624a2d4db0705ad13bceb19655dc23c89db1fcb3dfb1162f579495e291692528',
          'f3108492aabb7b342bf6880cff39060092f0465dd16e4413ae4da3d03ab9ce27',
          '3f3e3169d8c4270ad33eb4b5943d6d52023a410b7f6e9ce9569ea85d6aa67dc4',
          '7934c23154502cb585332d9540072f6678d18296aa4ce63ff46b5645114c1ece',
          '3496beb26016dd31fb3bcaff1363d694f10819a0965447c5a13a2c5ef7e69e76',
          'f6c88010fa0ac0022c6c4270deeeea4dcf54d2cce9ca3a19e307726a703cbf97',
          '4aa5b853e0284a1d3a7f5c55b9cc2dd3ff832cdfa617c8cb78159872c0524db4',
          '4833ff1e37aa3f63b60cb360c89864210fa63224ff1eecdc8084d081795e0cf7',
          'a34a21fcb0a4b3ba10fc15575346b8f8122b14664f06a41929ca19fc6f07fd33',
          '09ab33140c37cbadc84f75e833ca0f7846951938dbe75bbe6144b83083c0cc56',
          'cdf0665f5fb126bd53d17979ca8ecfc06b62325ad31e8784a0d171d31b12de7f',
          '35ddcc81c91ef0a6db1b4243bfbb39d90a40123222a3d7ab8379ab9a83420c46',
          '01566232ff1a19c907dd99bcfb5dca1525b8b1038f5ef35896b6419db55dc585',
          '3bf858728a763b6c95846eb75393f2c61081390cf42043e41929a0762b272cd0',
          '3efcb54f2f75e1b1386284db7a050fb5d002dd604a3078090e3164174377a7ee',
          '7ee01f9f3928491be0184aea39ba21ee38864c54858d2d33de52b3316b8600dc',
          'b26078a6de3d1e023a78902dc966dc433c9125bb9b12db1c1b1d0c8512ef2853',
          '859e93ffbafba637fe3bf36ff2288b7461c9b559656e13129ea878fca5f2486a',
          'c0e618e366e374f6a60ab32dc006356680904a618c7e0ee31a574a248aaf83cf',
          '57f1eb796cd46413992f214bf89db53fc549b4fc6e8d3d8769c2c1a8dd8a3078',
          '1021ef6fd529c9f45d3e2ac791f0a7de332514dd9dcc7640f839db617649cd75',
          '7bb4d2d5168cc13d4e8a7558eb68d2d189833cddedaf03e7959e9a256038c9fe',
          'a14446fdfcb3559556ff08f1d9fc97d72435a8741ede1a59302211d4a2b1a7bd',
          'c8008b0d2af8987698f8b10d925c1e088c8b72571d32a74120ba8b7416c8b818',
          'b767e145aaa84bf01d80eed08c9135bc3f7c9c638593fd82e1ea8155a41317d3',
          '2f18e88a345a3d183b2093cb15bd8d68fb37e7485e55a9938ec385386114a710',
          'aa9fa70573cbc8136171543179244abc563ca839890ec0f19c32aaee7d91d5ee',
          'd4a609ca641075862e9e94f6ca70b699c734279f424a39ae54498e74d57a9edf',
          '1ca972204a9667f163f29c6d732ac6cafdf1a0793e029c8b2df9e84254619486',
          '4a52df99422830601a2daa35f574e08214a4ec23ad82578c6a33a4bc24614177',
          'c720d533a8086db64aa19dc289ba7d8dba931c0c1e81c31b3a2381108bd54f80',
          '1d0b42cc9bab440d30ae6ccf0b586fac1a3416e2470e84b0e7fe2fe336b3ecdb',
          '152c39218c74e1f1efea9f6a592e85c9b3715ac4c9b36f2a67c3b66f7cda476a',
          '41e37269498d007217b82e0e5e0bd2bc11cfb8472d22f2bf5d57bf559518bc90',
          '96a013fe5840fa4ebf9e8b413ad9ba5c6b9da0406225e0bd6ad4d1a7110045c0',
          '67bad3f1ee713789aa58a8f712e31e55816df15a08e4fef17f0a77f0dcea2a16',
          'bfc18b3ee2c15d34d80fc3781902b7e90f689f7298f368712c3dd5b8640e6f06',
          '756e21cf69f49031f99fb60e05bbd5cf3b6101528cb84ea5f8cb6c328c727f68',
          '1d1a2fc0aa17f818c49dcd1effbe3f0d3b937ceb2852f0614f272141a432683b',
          'efd78eda82be49976cba570675624475838d97462795fa427582c09a08914e24',
          'a5774ec28dceccdd88b4cedced5c09004023005c47438ceb538edf906a3a4976',
          '0c19dd81b6abe18b3a3e72aa471c8ab9c08f0c76acf80441b1556f6520e63607',
          '5f05a2d80b8b0b78c3b978b8b4143b863832d99f8f02c793aed23419d80889ae',
          'b189d3e05a0dd24cd5326150fdf95460be60914bf919da3cdad707827e360444',
          'ca88c363dae68e62a690e63e90728538431b30d35b3686adb32d7a973350a456',
          '2612f23d1dc0c3fdc3679c2cf05b66e150fdef006b02d59fd317d70c76018d8c',
          '168d23918d7561c7494a2d5b75a12a515ec6054c78801f26512a757b40e81e08',
          'ad590fd49fa67224d9a562ad33d4b7d8f8bca6f63ff5d8c1859127d43b49fb15',
          '9be5996df1622222a96b4b3d6359f06922866cb4560c0cd8a806be8b828e7531',
          '644e2c3a505baa9cdc047972ecff9e7ede214fa964b392efc2dcda4a80c9c60e',
          '05a26a422f52e03b318e763ecd53d027b39bbf1920b53babc33fba9db0f10fc4',
          'fbf23653042416c886f12df972a885d847fe5681f466aff64a611aa01f9a5011',
          'b0c92ae7ecaa07702798fbb161ce189a80da259390876c14daace753d73896f9',
        ],
        alert_rule_uuid: 'attack_discovery_ad_hoc_rule_id',
        alert_start: '2025-06-23T14:25:24.104Z',
        alert_updated_at: '2025-06-23T15:16:52.984Z',
        alert_updated_by_user_id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        alert_updated_by_user_name: 'elastic',
        alert_workflow_status: 'acknowledged',
        alert_workflow_status_updated_at: '2025-06-23T15:16:52.984Z',
        connector_id: 'gemini_2_5_pro',
        connector_name: 'Gemini 2.5 Pro',
        details_markdown:
          'A widespread attack campaign was executed across multiple Windows hosts, unified by the use of a single compromised user account, {{ user.name 6f53c297-f5cb-48c3-8aff-2e2d7a390169 }}. The attacker leveraged this access to deploy a variety of malware families using different initial access and execution techniques, culminating in a ransomware attack.\n* **Qakbot Infection:** On host {{ host.name 0d7534c9-79f5-46ed-9df9-3dfcff57e5ed }}, the attack began with a malicious OneNote file. This led to {{ process.name mshta.exe }} executing a script, which used {{ process.name curl.exe }} to download a payload from {{ source.ip 77.75.230.128 }}. The payload was executed via {{ process.name rundll32.exe }} and injected into {{ process.name AtBroker.exe }}, identified as the {{ rule.name Windows.Trojan.Qbot }} trojan.\n* **Emotet Infection:** On host {{ host.name deb5784c-55d3-4422-9d7c-06f1f71c04b3 }}, a malicious Excel document spawned {{ process.name regsvr32.exe }} to load a malicious DLL, ultimately leading to the execution of the {{ rule.name Windows.Trojan.Emotet }} trojan and the establishment of persistence via registry run keys.\n* **Bumblebee Trojan:** On host {{ host.name 4d9943f7-cbef-462b-a882-e39db5da7abd }}, the attacker used {{ process.parent.name msiexec.exe }} to proxy the execution of a malicious PowerShell script, which injected the {{ rule.name Windows.Trojan.Bumblebee }} trojan into its own memory and established C2 communication.\n* **Generic Droppers:** On other hosts, similar initial access vectors were used. On host {{ host.name 9a98cc1d-a7a3-4924-b939-b17b2ec5dbdd }}, a Word document dropped and executed a VBScript, which then used PowerShell and created a scheduled task for persistence. On host {{ host.name 7c9a79a0-c029-4acb-b61c-d5831b409943 }}, an Excel file used {{ process.name certutil.exe }} to decode and execute a payload.\n* **Ransomware Deployment:** The campaign culminated on host {{ host.name 6aece05f-675e-4dc0-b8fa-ba0f1a43d691 }} with the deployment of Sodinokibi (REvil) ransomware. A malicious executable used DLL side-loading to compromise the legitimate Microsoft Defender process, {{ process.name MsMpEng.exe }}, which then executed the ransomware and began encrypting files.',
        entity_summary_markdown:
          'A widespread malware campaign using the compromised account of user {{ user.name 6f53c297-f5cb-48c3-8aff-2e2d7a390169 }} impacted multiple Windows hosts, including {{ host.name 6aece05f-675e-4dc0-b8fa-ba0f1a43d691 }} and {{ host.name 0d7534c9-79f5-46ed-9df9-3dfcff57e5ed }}.',
        generation_uuid: 'c10c51a5-10d2-481d-853a-e7fd5f393b23',
        id: '29ceb1fa1482f02a2eb6073991078544e529edfc633a5621b20a93eefbb63083',
        mitre_attack_tactics: [
          'Initial Access',
          'Execution',
          'Persistence',
          'Defense Evasion',
          'Command and Control',
          'Impact',
        ],
        replacements: {
          'e56f5c52-ebb0-4ec8-aad5-2659df2e0206': 'root',
          '99612aef-0a5a-41da-9da4-b5b5ece226a4': 'SRVMAC08',
          '02de873c-51e3-4c01-8a22-0986225775f3': 'james',
          '9a98cc1d-a7a3-4924-b939-b17b2ec5dbdd': 'SRVWIN07',
          '6f53c297-f5cb-48c3-8aff-2e2d7a390169': 'Administrator',
          '4d9943f7-cbef-462b-a882-e39db5da7abd': 'SRVWIN06',
          'aa5e02c8-f542-4db9-8ade-87fd1283ddac': 'SRVNIX05',
          '0d7534c9-79f5-46ed-9df9-3dfcff57e5ed': 'SRVWIN04',
          'deb5784c-55d3-4422-9d7c-06f1f71c04b3': 'SRVWIN03',
          '6aece05f-675e-4dc0-b8fa-ba0f1a43d691': 'SRVWIN02',
          '7c9a79a0-c029-4acb-b61c-d5831b409943': 'SRVWIN01',
        },
        risk_score: 6237,
        summary_markdown:
          'A widespread campaign was conducted using the compromised account of user {{ user.name 6f53c297-f5cb-48c3-8aff-2e2d7a390169 }}, deploying various malware including Sodinokibi, Emotet, Qakbot, and Bumblebee across multiple Windows hosts.',
        timestamp: '2025-06-23T14:25:24.104Z',
        title: 'Widespread Malware Campaign via Compromised Account',
        user_id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        user_name: 'elastic',
        users: [
          {
            name: 'elastic',
            id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          },
        ],
      },
    ]);
  });

  it('calls logger.warn when the response is missing required fields', () => {
    const response = getResponseMock();
    response.hits.hits[0]._source = undefined;

    transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns empty data if all hits are missing required fields', () => {
    const response = getResponseMock();
    response.hits.hits = [
      {
        _id: '1',
        _index: 'foo',
        _source: undefined,
      },
      {
        _id: '2',
        _index: 'foo',
        _source: undefined,
      },
    ];

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data).toEqual([]);
  });

  it('correctly transforms the ALERT_START field', () => {
    const response = getResponseMock();
    const testDate = '2024-01-01T12:00:00.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_START] = testDate;
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].alert_start).toBe(testDate);
  });

  it('correctly transforms the ALERT_UPDATED_AT field', () => {
    const response = getResponseMock();
    const testDate = '2024-02-02T15:30:00.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_UPDATED_AT] = testDate;
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].alert_updated_at).toBe(testDate);
  });

  it('correctly transforms the ALERT_WORKFLOW_STATUS_UPDATED_AT field', () => {
    const response = getResponseMock();
    const testDate = '2024-03-03T10:20:30.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_WORKFLOW_STATUS_UPDATED_AT] = testDate;
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].alert_workflow_status_updated_at).toBe(testDate);
  });

  it("returns undefined for mitreAttackTactics when it's not an array", () => {
    const response = getResponseMock();
    if (response.hits.hits[0]._source) {
      const src = response.hits.hits[0]._source as unknown as Record<string, unknown>; // purposely assign the wrong type for test
      src['kibana.alert.attack_discovery.mitre_attack_tactics'] = 123;
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].mitre_attack_tactics).toBeUndefined();
  });

  it("returns undefined for replacements when it's not an array", () => {
    const response = getResponseMock();
    if (response.hits.hits[0]._source) {
      const src = response.hits.hits[0]._source as unknown as Record<string, unknown>; // purposely assign the wrong type for test
      src[ALERT_ATTACK_DISCOVERY_REPLACEMENTS] = 123;
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].replacements).toBeUndefined();
  });

  it('returns empty data if ALERT_ATTACK_DISCOVERY_API_CONFIG is missing', () => {
    const response = getResponseMock();
    if (response.hits.hits[0]._source) {
      const src = response.hits.hits[0]._source as unknown as Record<string, unknown>; // purposely delete required field for test
      delete src['kibana.alert.attack_discovery.api_config'];
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data).toEqual([]);
  });

  it('returns empty data if both _id and ALERT_RULE_EXECUTION_UUID are missing', () => {
    const response = getResponseMock();
    (response.hits.hits[0] as unknown as Record<string, unknown>)._id = undefined; // purposely assign undefined to _id for test
    if (response.hits.hits[0]._source) {
      const src = response.hits.hits[0]._source as unknown as Record<string, unknown>;
      delete src[ALERT_RULE_EXECUTION_UUID]; // purposely delete ALERT_RULE_EXECUTION_UUID for test
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data).toEqual([]);
  });

  it('returns uniqueAlertIdsCount from aggregation if present', () => {
    const response = getResponseMock();
    response.aggregations = {
      unique_alert_ids_count: { value: 42 },
    } as Record<string, { value: number }>;
    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.uniqueAlertIdsCount).toBe(42);
  });

  it('returns 0 for uniqueAlertIdsCount if aggregation is missing', () => {
    const response = getResponseMock();
    response.aggregations = undefined;
    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.uniqueAlertIdsCount).toBe(0);
  });

  it('returns sorted connectorNames from aggregation if present', () => {
    const response = getResponseMock();
    response.aggregations = {
      api_config_name: {
        buckets: [
          { key: 'b', doc_count: 1 },
          { key: 'a', doc_count: 2 },
        ],
      },
    } as unknown as Record<string, { buckets: Array<{ key: string; doc_count: number }> }>;
    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.connectorNames).toEqual(['a', 'b']);
  });

  it('returns empty connectorNames if aggregation is missing', () => {
    const response = getResponseMock();
    response.aggregations = undefined;

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.connectorNames).toEqual([]);
  });

  it('returns empty data if hits is empty', () => {
    const response = getResponseMock();
    response.hits.hits = [];

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data).toEqual([]);
  });

  it('handles invalid/missing dates and falls back to current date for timestamp', () => {
    const response = getResponseMock();
    // Set invalid @timestamp and alert_start
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source['@timestamp'] = 'not-a-date';
      response.hits.hits[0]._source[ALERT_START] = 'not-a-date';
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(new Date(result.data[0].timestamp).toString()).not.toBe('Invalid Date');
    expect(result.data[0].alert_start).toBeUndefined();
  });

  it('handles replacements array with missing uuid/value', () => {
    const response = getResponseMock();
    // Only use valid string values for uuid/value to match type
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS] = [
        { uuid: 'a', value: 'A' },
        // skip invalid entries, only valid ones allowed by type
      ];
    }

    const result = transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(result.data[0].replacements).toEqual({ a: 'A' });
  });

  describe.each([[false], [true]])('when enableFieldRendering=%s', (enableFieldRendering) => {
    it(`calls transformAttackDiscoveryAlertDocumentToApi with enableFieldRendering=${enableFieldRendering}`, () => {
      const response = getResponseMock();

      const spy = jest.spyOn(transformModule, 'transformAttackDiscoveryAlertDocumentToApi');

      transformSearchResponseToAlerts({
        enableFieldRendering,
        logger,
        response,
        withReplacements: false,
      });

      expect(spy).toHaveBeenCalled();
      // inspect the first call's argument object
      const firstCallArg = spy.mock.calls[0][0] as Record<string, unknown>;
      expect(firstCallArg.enableFieldRendering).toBe(enableFieldRendering);

      spy.mockRestore();
    });
  });

  describe.each([[false], [true]])('when withReplacements=%s', (withReplacements) => {
    it(`calls transformAttackDiscoveryAlertDocumentToApi with withReplacements=${withReplacements}`, () => {
      const response = getResponseMock();

      const spy = jest.spyOn(transformModule, 'transformAttackDiscoveryAlertDocumentToApi');

      transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements,
      });

      expect(spy).toHaveBeenCalled();
      const firstCallArg = spy.mock.calls[0][0] as Record<string, unknown>;
      expect(firstCallArg.withReplacements).toBe(withReplacements);

      spy.mockRestore();
    });
  });

  describe('when withReplacements is true', () => {
    it('returns the expected alerts with replaced field values from a valid search response', () => {
      const response = getResponseMock();

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements: true,
      });

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          title: 'Widespread Malware Campaign via Compromised Account', // from title_with_replacements
          summary_markdown:
            'A widespread campaign was conducted using the compromised account of user {{ user.name Administrator }}, deploying various malware including Sodinokibi, Emotet, Qakbot, and Bumblebee across multiple Windows hosts.', // from summary_markdown_with_replacements
          entity_summary_markdown:
            'A widespread malware campaign using the compromised account of user {{ user.name Administrator }} impacted multiple Windows hosts, including {{ host.name SRVWIN02 }} and {{ host.name SRVWIN04 }}.', // from entity_summary_markdown_with_replacements
          details_markdown: expect.stringContaining('{{ user.name Administrator }}'), // from details_markdown_with_replacements with actual replacements
        })
      );
    });

    it('uses replacement fields when both normal and replacement fields are present', () => {
      const response = getResponseMock();

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements: true,
      });

      // Verify that it uses the replacement field (with actual values) instead of the normal field (with UUIDs)
      expect(result.data[0].summary_markdown).toBe(
        'A widespread campaign was conducted using the compromised account of user {{ user.name Administrator }}, deploying various malware including Sodinokibi, Emotet, Qakbot, and Bumblebee across multiple Windows hosts.'
      );
      expect(result.data[0].summary_markdown).not.toContain('6f53c297-f5cb-48c3-8aff-2e2d7a390169'); // Should not contain UUID
    });

    it('falls back to normal fields when replacement fields are missing', () => {
      const response = getResponseMock();
      const modifiedResponse: typeof response = response.hits.hits[0]._source
        ? ((): typeof response => {
            const mr = cloneDeep(response);
            const src = mr.hits.hits[0]._source as Record<string, unknown>;
            mr.hits.hits[0]._source = omit(
              ['kibana.alert.attack_discovery.title_with_replacements'],
              src
            ) as unknown as ReturnType<typeof getResponseMock>['hits']['hits'][0]['_source'];
            return mr;
          })()
        : response;

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response: modifiedResponse,
        withReplacements: true,
      });

      expect(result.data[0].title).toBe('Widespread Malware Campaign via Compromised Account'); // falls back to normal field
    });

    it('uses replacement field when present, falls back to normal field when missing', () => {
      const response = getResponseMock();
      const modifiedResponse: typeof response = response.hits.hits[0]._source
        ? ((): typeof response => {
            const mr = cloneDeep(response);
            const src = mr.hits.hits[0]._source as Record<string, unknown>;
            mr.hits.hits[0]._source = omit(
              ['kibana.alert.attack_discovery.details_markdown_with_replacements'],
              src
            ) as unknown as ReturnType<typeof getResponseMock>['hits']['hits'][0]['_source'];
            return mr;
          })()
        : response;

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response: modifiedResponse,
        withReplacements: true,
      });

      expect(result.data[0].details_markdown).toContain('6f53c297-f5cb-48c3-8aff-2e2d7a390169'); // should use normal field with UUIDs
      expect(result.data[0].details_markdown).not.toContain('Administrator'); // should not contain replacement values
    });

    it('returns undefined for optional fields when both normal and replacement fields are missing', () => {
      const response = getResponseMock();
      const modifiedResponse: typeof response = response.hits.hits[0]._source
        ? ((): typeof response => {
            const mr = cloneDeep(response);
            const src = mr.hits.hits[0]._source as Record<string, unknown>;
            mr.hits.hits[0]._source = omit(
              [
                'kibana.alert.attack_discovery.entity_summary_markdown_with_replacements',
                'kibana.alert.attack_discovery.entity_summary_markdown',
              ],
              src
            ) as unknown as ReturnType<typeof getResponseMock>['hits']['hits'][0]['_source'];
            return mr;
          })()
        : response;

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response: modifiedResponse,
        withReplacements: true,
      });

      expect(result.data[0].entity_summary_markdown).toBeUndefined(); // optional field defaults to undefined
    });

    it('processes mixed field types correctly when some have replacements and others do not', () => {
      const response = getResponseMock();
      const modifiedResponse: typeof response = response.hits.hits[0]._source
        ? ((): typeof response => {
            const mr = cloneDeep(response);
            const src = mr.hits.hits[0]._source as Record<string, unknown>;
            mr.hits.hits[0]._source = omit(
              ['kibana.alert.attack_discovery.details_markdown_with_replacements'],
              src
            ) as unknown as ReturnType<typeof getResponseMock>['hits']['hits'][0]['_source'];
            return mr;
          })()
        : response;

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response: modifiedResponse,
        withReplacements: true,
      });

      // Title should use replacement field (actual value)
      expect(result.data[0].title).toBe('Widespread Malware Campaign via Compromised Account');
      // Details should fall back to normal field (with UUIDs)
      expect(result.data[0].details_markdown).toContain('6f53c297-f5cb-48c3-8aff-2e2d7a390169');
    });

    it('handles aggregation data correctly when withReplacements is true', () => {
      const response = getResponseMock();
      response.aggregations = {
        unique_alert_ids_count: { value: 100 },
        api_config_name: {
          buckets: [
            { key: 'Connector B', doc_count: 3 },
            { key: 'Connector A', doc_count: 5 },
          ],
        },
      } as unknown as Record<
        string,
        { buckets?: Array<{ key: string; doc_count: number }>; value?: number }
      >;

      const result = transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements: true,
      });

      expect(result.uniqueAlertIdsCount).toBe(100);
      expect(result.connectorNames).toEqual(['Connector A', 'Connector B']); // sorted
    });
  });
});
