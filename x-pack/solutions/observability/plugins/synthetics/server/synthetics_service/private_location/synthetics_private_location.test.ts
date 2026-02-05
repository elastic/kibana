/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { MonitorFields, HeartbeatConfig } from '../../../common/runtime_types';
import { MonitorTypeEnum, ScheduleUnit, SourceType } from '../../../common/runtime_types';
import { SyntheticsPrivateLocation } from './synthetics_private_location';
import { testMonitorPolicy } from './test_policy';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { SyntheticsServerSetup } from '../../types';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

describe('SyntheticsPrivateLocation', () => {
  const newPackagePolicyTemplate = {
    name: 'synthetics-1',
    namespace: '',
    package: { name: 'synthetics', title: 'Elastic Synthetics', version: '1.4.2' },
    enabled: true,
    policy_id: '',
    policy_ids: [''],
    inputs: [
      {
        type: 'synthetics/http',
        policy_template: 'synthetics',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: { type: 'synthetics', dataset: 'http' },
            vars: {
              __ui: { type: 'yaml' },
              enabled: { value: true, type: 'bool' },
              type: { value: 'http', type: 'text' },
              name: { type: 'text' },
              schedule: { value: '"@every 3m"', type: 'text' },
              urls: { type: 'text' },
              'service.name': { type: 'text' },
              timeout: { type: 'text' },
              max_redirects: { type: 'integer' },
              proxy_url: { type: 'text' },
              proxy_headers: { type: 'yaml' },
              tags: { type: 'yaml' },
              username: { type: 'text' },
              password: { type: 'password' },
              'response.include_headers': { type: 'bool' },
              'response.include_body': { type: 'text' },
              'response.include_body_max_bytes': { type: 'text' },
              'check.request.method': { type: 'text' },
              'check.request.headers': { type: 'yaml' },
              'check.request.body': { type: 'yaml' },
              'check.response.status': { type: 'yaml' },
              'check.response.headers': { type: 'yaml' },
              'check.response.body.positive': { type: 'yaml' },
              'check.response.body.negative': { type: 'yaml' },
              'check.response.json': { type: 'yaml' },
              'ssl.certificate_authorities': { type: 'yaml' },
              'ssl.certificate': { type: 'yaml' },
              'ssl.key': { type: 'yaml' },
              'ssl.key_passphrase': { type: 'text' },
              'ssl.verification_mode': { type: 'text' },
              'ssl.supported_protocols': { type: 'yaml' },
              location_name: { value: 'Fleet managed', type: 'text' },
              location_id: { value: 'fleet_managed', type: 'text' },
              id: { type: 'text' },
              origin: { type: 'text' },
              mode: { type: 'text' },
              ipv4: { value: true, type: 'bool' },
              ipv6: { value: true, type: 'bool' },
              processors: { type: 'yaml' },
              max_attempts: { value: 2, type: 'integer' },
              maintenance_windows: { type: 'yaml' },
            },
          },
        ],
      },
      {
        type: 'synthetics/tcp',
        policy_template: 'synthetics',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: { type: 'synthetics', dataset: 'tcp' },
            vars: {
              __ui: { type: 'yaml' },
              enabled: { value: true, type: 'bool' },
              type: { value: 'tcp', type: 'text' },
              name: { type: 'text' },
              schedule: { value: '"@every 3m"', type: 'text' },
              hosts: { type: 'text' },
              'service.name': { type: 'text' },
              timeout: { type: 'text' },
              proxy_url: { type: 'text' },
              proxy_use_local_resolver: { value: false, type: 'bool' },
              tags: { type: 'yaml' },
              'check.send': { type: 'text' },
              'check.receive': { type: 'text' },
              'ssl.certificate_authorities': { type: 'yaml' },
              'ssl.certificate': { type: 'yaml' },
              'ssl.key': { type: 'yaml' },
              'ssl.key_passphrase': { type: 'text' },
              'ssl.verification_mode': { type: 'text' },
              'ssl.supported_protocols': { type: 'yaml' },
              location_name: { value: 'Fleet managed', type: 'text' },
              location_id: { value: 'fleet_managed', type: 'text' },
              id: { type: 'text' },
              origin: { type: 'text' },
              mode: { type: 'text' },
              ipv4: { value: true, type: 'bool' },
              ipv6: { value: true, type: 'bool' },
              processors: { type: 'yaml' },
              max_attempts: { value: 2, type: 'integer' },
              maintenance_windows: { type: 'yaml' },
            },
          },
        ],
      },
      {
        type: 'synthetics/icmp',
        policy_template: 'synthetics',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: { type: 'synthetics', dataset: 'icmp' },
            vars: {
              __ui: { type: 'yaml' },
              enabled: { value: true, type: 'bool' },
              type: { value: 'icmp', type: 'text' },
              name: { type: 'text' },
              schedule: { value: '"@every 3m"', type: 'text' },
              wait: { value: '1s', type: 'text' },
              hosts: { type: 'text' },
              'service.name': { type: 'text' },
              timeout: { type: 'text' },
              tags: { type: 'yaml' },
              location_name: { value: 'Fleet managed', type: 'text' },
              location_id: { value: 'fleet_managed', type: 'text' },
              id: { type: 'text' },
              origin: { type: 'text' },
              mode: { type: 'text' },
              ipv4: { value: true, type: 'bool' },
              ipv6: { value: true, type: 'bool' },
              processors: { type: 'yaml' },
              max_attempts: { value: 2, type: 'integer' },
              maintenance_windows: { type: 'yaml' },
            },
          },
        ],
      },
      {
        type: 'synthetics/browser',
        policy_template: 'synthetics',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'synthetics', dataset: 'browser' },
            vars: {
              __ui: { type: 'yaml' },
              enabled: { value: true, type: 'bool' },
              type: { value: 'browser', type: 'text' },
              name: { type: 'text' },
              schedule: { value: '"@every 3m"', type: 'text' },
              'service.name': { type: 'text' },
              timeout: { type: 'text' },
              tags: { type: 'yaml' },
              'source.inline.script': { type: 'yaml' },
              'source.project.content': { type: 'text' },
              params: { type: 'yaml' },
              playwright_options: { type: 'yaml' },
              screenshots: { type: 'text' },
              synthetics_args: { type: 'text' },
              ignore_https_errors: { type: 'bool' },
              'throttling.config': { type: 'text' },
              'filter_journeys.tags': { type: 'yaml' },
              'filter_journeys.match': { type: 'text' },
              location_name: { value: 'Fleet managed', type: 'text' },
              location_id: { value: 'fleet_managed', type: 'text' },
              id: { type: 'text' },
              origin: { type: 'text' },
              processors: { type: 'yaml' },
              max_attempts: { value: 2, type: 'integer' },
              maintenance_windows: { type: 'yaml' },
            },
          },
          { enabled: true, data_stream: { type: 'synthetics', dataset: 'browser.network' } },
          { enabled: true, data_stream: { type: 'synthetics', dataset: 'browser.screenshot' } },
        ],
      },
    ],
  };

  const mockPrivateLocation: PrivateLocationAttributes = {
    id: 'testLocationId',
    label: 'Test Location',
    agentPolicyId: 'policyId',
    isServiceManaged: false,
  };
  const testConfig = {
    id: 'testId',
    type: 'http',
    enabled: true,
    schedule: '@every 3m',
    'service.name': 'test service',
    locations: [mockPrivateLocation],
    tags: [],
    timeout: '16',
    name: 'Test Monitor',
    urls: 'https://www.google.com',
    max_redirects: '0',
    password: '12345678',
    proxy_url: '',
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'response.include_body': 'on_error',
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text', value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
  } as unknown as HeartbeatConfig;
  const mockBuildPackagePolicy = jest.fn().mockReturnValue(newPackagePolicyTemplate);

  const serverMock: SyntheticsServerSetup = {
    syntheticsEsClient: { search: jest.fn() },
    logger: loggerMock.create(),
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    fleet: {
      packagePolicyService: {
        get: jest.fn().mockReturnValue({}),
        buildPackagePolicyFromPackage: mockBuildPackagePolicy,
        bulkCreate: jest.fn(),
        getByIDs: jest.fn(),
      },
      runWithCache: async (cb: any) => await cb(),
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('nonDefaultSpace'),
      },
    },
    coreStart: {
      savedObjects: savedObjectsServiceMock.createStartContract(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    },
  } as unknown as SyntheticsServerSetup;
  beforeEach(() => {
    mockBuildPackagePolicy.mockReturnValue(undefined);
  });

  describe('getPolicyNamespace', () => {
    it('prioritizes config namespace', async () => {
      const configNamespace = 'nonDefaultSpace';
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const result = await syntheticsPrivateLocation.getPolicyNamespace(configNamespace);
      expect(result).toEqual(configNamespace);
    });

    it('falls back to undefined when config namespace and private location namespace are not defined', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const result = await syntheticsPrivateLocation.getPolicyNamespace('default');
      expect(result).toEqual(undefined);
    });
  });

  describe('error handling', () => {
    it.each([['Unable to create Synthetics package policy template for private location']])(
      'throws errors for create monitor',
      async (error) => {
        const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
          ...serverMock,
          fleet: {
            ...serverMock.fleet,
          },
        });

        try {
          await syntheticsPrivateLocation.createPackagePolicies(
            [{ config: testConfig, globalParams: {} }],
            [mockPrivateLocation],
            'test-space',
            []
          );
        } catch (e) {
          expect(e).toEqual(new Error(error));
        }
      }
    );

    it.each([['Unable to create Synthetics package policy template for private location']])(
      'throws errors for edit monitor',
      async (error) => {
        const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
          ...serverMock,
          fleet: {
            ...serverMock.fleet,
          },
        });

        try {
          await syntheticsPrivateLocation.updatePackagePolicies(
            [{ config: testConfig, globalParams: {} }],
            [mockPrivateLocation],
            'test-space',
            []
          );
        } catch (e) {
          expect(e).toEqual(new Error(error));
        }
      }
    );

    it.each([
      [
        'Unable to delete Synthetics package policy for monitor Test Monitor with private location Test Location',
      ],
      [
        'Unable to delete Synthetics package policy for monitor Test Monitor. Fleet write permissions are needed to use Synthetics private locations.',
      ],
    ])('throws errors for delete monitor', async (error) => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            delete(): any {
              throw new Error(error);
            },
          },
        },
      });
      try {
        await syntheticsPrivateLocation.deleteMonitors([testConfig], {
          [testConfig.id]: [`${testConfig.id}-${mockPrivateLocation.id}`],
        });
      } catch (e) {
        expect(e).toEqual(new Error(error));
      }
    });
  });

  describe('stream formatting', () => {
    it('formats monitors stream properly', () => {
      const test = formatSyntheticsPolicy(
        testMonitorPolicy,
        MonitorTypeEnum.BROWSER,
        dummyBrowserConfig,
        {},
        []
      );

      expect(test.formattedPolicy.inputs[3].streams[1]).toStrictEqual({
        data_stream: {
          dataset: 'browser',
          type: 'synthetics',
        },
        enabled: true,
        vars: {
          __ui: {
            type: 'yaml',
            value:
              '{"script_source":{"is_generated_script":false,"file_name":""},"is_tls_enabled":true}',
          },
          config_id: {
            type: 'text',
            value: '75cdd125-5b62-4459-870c-46f59bf37e89',
          },
          enabled: {
            type: 'bool',
            value: true,
          },
          'filter_journeys.match': {
            type: 'text',
            value: null,
          },
          'filter_journeys.tags': {
            type: 'yaml',
            value: null,
          },
          ignore_https_errors: {
            type: 'bool',
            value: false,
          },
          location_name: {
            type: 'text',
            value: 'Fleet managed',
          },
          name: {
            type: 'text',
            value: '"Browser monitor"',
          },
          params: {
            type: 'yaml',
            value: '',
          },
          run_once: {
            type: 'bool',
            value: false,
          },
          schedule: {
            type: 'text',
            value: '"@every 10m"',
          },
          screenshots: {
            type: 'text',
            value: 'on',
          },
          'service.name': {
            type: 'text',
            value: '"test service"',
          },
          'source.inline.script': {
            type: 'yaml',
            value:
              "\"step('Go to https://www.elastic.co/', async () => {\\n  await page.goto('https://www.elastic.co/');\\n});\"",
          },
          synthetics_args: {
            type: 'text',
            value: null,
          },
          tags: {
            type: 'yaml',
            value: null,
          },
          'throttling.config': {
            type: 'text',
            value: JSON.stringify({ download: 5, upload: 3, latency: 20 }),
          },
          timeout: {
            type: 'text',
            value: null,
          },
          type: {
            type: 'text',
            value: 'browser',
          },
        },
      });
    });
  });

  describe('create monitors', () => {
    it('uses the correct policy id format when creating monitors', async () => {
      const createMock = jest.fn().mockResolvedValue({
        items: [],
      });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockReturnValue(newPackagePolicyTemplate),
            bulkCreate: createMock,
          },
        },
      });

      await syntheticsPrivateLocation.createPackagePolicies(
        [{ config: testConfig, globalParams: {} }],
        [mockPrivateLocation],
        'test-space',
        []
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            id: `${testConfig.id}-${mockPrivateLocation.id}`,
          }),
        ]),
        expect.anything()
      );
    });
  });

  describe.only('update monitors', () => {
    it('uses the policy ids from the map for fetching existing policies and updating existing policies', async () => {
      // using a slightly different format to ensure it's picked up from the map
      const testPolicyId = `${testConfig.id}-${mockPrivateLocation.id}-randomSuffix`;
      const getByIdMock = jest.fn().mockReturnValue([
        {
          id: testPolicyId,
        },
      ]);
      const bulkUpdateMock = jest.fn().mockResolvedValue({ items: [{ id: testPolicyId }] });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockReturnValue(newPackagePolicyTemplate),
            getByIDs: getByIdMock,
            bulkUpdate: bulkUpdateMock,
          },
        },
      });

      await syntheticsPrivateLocation.updatePackagePolicies(
        [{ config: testConfig, globalParams: {} }],
        [mockPrivateLocation],
        'test-space',
        [],
        {
          [testConfig.id]: [testPolicyId],
        }
      );

      // fetches the correct existing policy based on the map
      expect(getByIdMock).toHaveBeenCalledWith(
        expect.anything(),
        [testPolicyId],
        expect.anything()
      );

      expect(bulkUpdateMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            id: testPolicyId,
          }),
        ]),
        expect.anything()
      );
    });
  });

  it('uses the policy ids from the map when deleting monitors', async () => {
    const deleteMock = jest.fn();
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          delete: deleteMock,
        },
      },
    });

    await syntheticsPrivateLocation.deleteMonitors([testConfig], {
      [testConfig.id]: ['policyIdFromMap'],
    });

    expect(deleteMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['policyIdFromMap'],
      expect.anything()
    );
  });

  describe.skip('deleteMonitors', () => {
    it('should delete legacy policies if no package policy is referenced on the monitor', async () => {
      const soClient = savedObjectsServiceMock.createStartContract().createInternalRepository();
      const testSpaces = ['space1', 'space2'];
      soClient.find = jest.fn().mockResolvedValue({
        aggregations: {
          spaces: {
            buckets: testSpaces.map((s) => ({ key: s, doc_count: 1 })),
          },
        },
      });
      serverMock.coreStart.savedObjects.createInternalRepository = jest
        .fn()
        .mockReturnValue(soClient);

      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            delete(
              savedObjectsClient: SavedObjectsClientContract,
              esClient: any,
              ids: string[],
              options?: any
            ): any {
              throw new Error(error);
            },
          },
        },
      });
      const deleteMock = jest.fn();
      syntheticsPrivateLocation.deletePolicyBulk = deleteMock;

      await syntheticsPrivateLocation.deleteMonitors([testConfig], {});

      const expectedPolicyIds = [
        'testId-policyId',
        'testId-policyId-space1',
        'testId-policyId-space2',
      ];
      expect(deleteMock).toHaveBeenCalledWith(expect.arrayContaining(expectedPolicyIds));
    });
  });
});

const dummyBrowserConfig: Partial<MonitorFields> & {
  id: string;
  fields: Record<string, string | boolean>;
  fields_under_root: boolean;
} = {
  type: MonitorTypeEnum.BROWSER,
  enabled: true,
  schedule: { unit: ScheduleUnit.MINUTES, number: '10' },
  'service.name': 'test service',
  tags: [],
  timeout: null,
  name: 'Browser monitor',
  locations: [{ isServiceManaged: false, id: '1', label: 'Fleet managed' }],
  namespace: 'default',
  origin: SourceType.UI,
  journey_id: '',
  project_id: '',
  playwright_options: '',
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_tls_enabled: true,
  },
  params: '',
  'url.port': 443,
  'source.inline.script':
    "step('Go to https://www.elastic.co/', async () => {\n  await page.goto('https://www.elastic.co/');\n});",
  'source.project.content': '',
  urls: 'https://www.elastic.co/',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  throttling: { value: { download: '5', upload: '3', latency: '20' }, label: 'test', id: 'test' },
  id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  config_id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  fields: { config_id: '75cdd125-5b62-4459-870c-46f59bf37e89', run_once: true },
  fields_under_root: true,
  max_redirects: '0',
};
