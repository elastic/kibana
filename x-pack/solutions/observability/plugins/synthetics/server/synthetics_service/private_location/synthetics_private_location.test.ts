/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { MonitorFields, HeartbeatConfig } from '../../../common/runtime_types';
import {
  ConfigKey,
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { SyntheticsPrivateLocation } from './synthetics_private_location';
import { assignShard } from './assign_shards';
import { testMonitorPolicy } from './test_policy';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import { handleMultilineStringFormatter } from '../formatters/formatting_utils';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { SyntheticsServerSetup } from '../../types';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

describe('SyntheticsPrivateLocation', () => {
  const mockPrivateLocation: PrivateLocationAttributes = {
    id: 'policyId',
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
  const mockBuildPackagePolicy = jest.fn().mockReturnValue(undefined);

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
        getByIDs: jest.fn().mockReturnValue([{ policy_ids: ['policyId'] }]),
      },
      agentPolicyService: { getByIds: jest.fn().mockReturnValue([]) },
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
    (serverMock.fleet.packagePolicyService.getByIDs as jest.Mock).mockResolvedValue([]);
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

  describe('getPolicyId', () => {
    it('returns space-agnostic policy ID format', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-123', origin: SourceType.UI };
      const result = syntheticsPrivateLocation.getPolicyId(config, 'location-456');
      expect(result).toEqual('monitor-123-location-456');
    });

    it('returns same format for project monitors', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'project-monitor-123', origin: SourceType.PROJECT };
      const result = syntheticsPrivateLocation.getPolicyId(config, 'location-456');
      expect(result).toEqual('project-monitor-123-location-456');
    });

    it('does not include spaceId in policy ID (space-agnostic)', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-123', origin: SourceType.UI };
      const result = syntheticsPrivateLocation.getPolicyId(config, 'location-456');
      expect(result).toEqual('monitor-123-location-456');
    });
  });

  describe('getLegacyPolicyId', () => {
    it('returns legacy policy ID format with spaceId', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const result = syntheticsPrivateLocation.getLegacyPolicyId(
        'monitor-123',
        'location-456',
        'space-789'
      );
      expect(result).toEqual('monitor-123-location-456-space-789');
    });
  });

  describe('getPolicyName', () => {
    it('returns correct policy name for UI monitors', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = {
        ...testConfig,
        [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
        [ConfigKey.NAME]: 'My Monitor',
      } as unknown as HeartbeatConfig;
      const result = syntheticsPrivateLocation.getPolicyName(config, 'US East');
      expect(result).toEqual('My Monitor-US East');
    });

    it('returns correct policy name for project monitors', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = {
        ...testConfig,
        id: 'project-monitor-123',
        [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
        [ConfigKey.NAME]: 'My Monitor',
      } as unknown as HeartbeatConfig;
      const result = syntheticsPrivateLocation.getPolicyName(config, 'US East');
      expect(result).toEqual('project-monitor-123-US East');
    });
  });

  describe('getPolicyIdFormatInfo', () => {
    it('detects new format policy', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-1' };
      const existingPolicies = [{ id: 'monitor-1-loc-1' }];
      const allSpaces = new Set(['default']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-1',
        existingPolicies,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(true);
      expect(result.hasAnyLegacyPolicyId).toBe(false);
      expect(result.legacyPolicyIds).toEqual([]);
    });

    it('detects legacy format policy for known space', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-1' };
      const existingPolicies = [{ id: 'monitor-1-loc-1-space-a' }];
      const allSpaces = new Set(['default', 'space-a']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-1',
        existingPolicies,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(false);
      expect(result.hasAnyLegacyPolicyId).toBe(true);
      expect(result.legacyPolicyIds).toEqual(['monitor-1-loc-1-space-a']);
    });

    it('does not match legacy policies from unknown spaces', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-1' };
      const existingPolicies = [{ id: 'monitor-1-loc-1-unknown-space' }];
      const allSpaces = new Set(['default', 'space-a']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-1',
        existingPolicies,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(false);
      expect(result.hasAnyLegacyPolicyId).toBe(false);
      expect(result.legacyPolicyIds).toEqual([]);
    });

    it('avoids false positives from prefix collisions', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-a' };
      const existingPolicies = [{ id: 'monitor-a-loc-b-default' }];
      const allSpaces = new Set(['default']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-b',
        existingPolicies,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(false);
      expect(result.hasAnyLegacyPolicyId).toBe(true);
      expect(result.legacyPolicyIds).toEqual(['monitor-a-loc-b-default']);

      // Monitor "monitor-a-loc-b" should NOT match the same policy
      const otherConfig = { id: 'monitor-a-loc-b' };
      const otherResult = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        otherConfig,
        'default',
        existingPolicies,
        allSpaces
      );

      expect(otherResult.hasAnyLegacyPolicyId).toBe(false);
      expect(otherResult.legacyPolicyIds).toEqual([]);
    });

    it('detects both new and legacy format policies', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-1' };
      const existingPolicies = [
        { id: 'monitor-1-loc-1' },
        { id: 'monitor-1-loc-1-default' },
        { id: 'monitor-1-loc-1-space-a' },
      ];
      const allSpaces = new Set(['default', 'space-a']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-1',
        existingPolicies,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(true);
      expect(result.hasAnyLegacyPolicyId).toBe(true);
      expect(result.legacyPolicyIds).toEqual([
        'monitor-1-loc-1-default',
        'monitor-1-loc-1-space-a',
      ]);
    });

    it('handles undefined existingPolicies', () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const config = { id: 'monitor-1' };
      const allSpaces = new Set(['default']);

      const result = syntheticsPrivateLocation.getPolicyIdFormatInfo(
        config,
        'loc-1',
        undefined,
        allSpaces
      );

      expect(result.hasNewFormatPolicyId).toBe(false);
      expect(result.hasAnyLegacyPolicyId).toBe(false);
      expect(result.legacyPolicyIds).toEqual([]);
    });
  });

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
        await syntheticsPrivateLocation.editMonitors(
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
          getByIDs: jest.fn().mockResolvedValue([{ id: 'testId-policyId' }]),
          delete(
            soClient: SavedObjectsClientContract,
            esClient: any,
            ids: string[],
            options?: any
          ): any {
            throw new Error(error);
          },
        },
      },
    });
    try {
      await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');
    } catch (e) {
      expect(e).toEqual(new Error(error));
    }
  });

  it('deleteMonitors only deletes legacy package policy ids that exist', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const getByIDsMock = jest.fn().mockResolvedValue([{ id: 'testId-policyId' }]);
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          getByIDs: getByIDsMock,
          delete: deleteMock,
        },
      },
    });

    await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');

    expect(deleteMock).toHaveBeenCalledTimes(1);
    const deletedIds = deleteMock.mock.calls[0][2] as string[];
    expect(deletedIds).toContain('testId-policyId');
    expect(deletedIds).not.toContain('testId-policyId-test-space');
    expect(deletedIds.length).toBe(1);
  });

  it('deleteMonitors deletes legacy package policy ids when they exist', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const getByIDsMock = jest
      .fn()
      .mockResolvedValue([{ id: 'testId-policyId' }, { id: 'testId-policyId-test-space' }]);
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          getByIDs: getByIDsMock,
          delete: deleteMock,
        },
      },
    });

    await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');

    const deletedIds = deleteMock.mock.calls[0][2] as string[];
    expect(deletedIds).toContain('testId-policyId');
    expect(deletedIds).toContain('testId-policyId-test-space');
  });

  it('deleteMonitors only deletes new-format id when that policy exists', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const getByIDsMock = jest.fn().mockResolvedValue([{ id: 'testId-policyId-test-space' }]);
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          getByIDs: getByIDsMock,
          delete: deleteMock,
        },
      },
    });

    await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');

    const deletedIds = deleteMock.mock.calls[0][2] as string[];
    expect(deletedIds).toEqual(['testId-policyId-test-space']);
    expect(deletedIds).not.toContain('testId-policyId');
  });

  it('deleteMonitors does not call delete when no matching policies exist', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          getByIDs: jest.fn().mockResolvedValue([]),
          delete: deleteMock,
        },
      },
    });

    await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');

    expect(deleteMock).not.toHaveBeenCalled();
  });

  describe('rebalanceShards', () => {
    const LOCATION_ID = 'loc1';
    const makePkgPolicy = (monitorId: string, shardId: string): PackagePolicy =>
      ({
        id: `${monitorId}-${LOCATION_ID}`,
        name: monitorId,
        namespace: 'default',
        enabled: true,
        is_managed: true,
        policy_id: shardId,
        policy_ids: [shardId],
        spaceIds: ['default'],
        inputs: [],
        package: { name: 'synthetics', version: '1.0.0', title: 'Synthetics' },
      } as unknown as PackagePolicy);

    // Mimics fleet's package policy list: honours the `policy_ids` kuery so the
    // rebalance's counts-only snapshot and targeted (per-shard) fetches behave
    // like the real service instead of always returning every item.
    const makeServer = (items: PackagePolicy[], bulkUpdate: jest.Mock) => {
      const list = jest.fn(
        async (_soClient: unknown, { kuery, perPage }: { kuery: string; perPage: number }) => {
          const multi = kuery.match(/policy_ids:\(([^)]+)\)/);
          const single = kuery.match(/policy_ids:"([^"]+)"/);
          let filtered = items;
          if (multi) {
            const shards = multi[1].split(' or ').map((s) => s.replace(/"/g, '').trim());
            filtered = items.filter((it) => shards.includes((it.policy_ids ?? [])[0]));
          } else if (single) {
            filtered = items.filter((it) => (it.policy_ids ?? [])[0] === single[1]);
          }
          return { items: filtered, total: filtered.length, page: 1, perPage };
        }
      );

      return {
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            list,
            bulkUpdate,
          },
        },
      } as unknown as SyntheticsServerSetup;
    };

    const monitorIds = Array.from({ length: 20 }, (_, i) => `m${i + 1}`);

    it('performs zero writes when every monitor is already on its assigned healthy shard', async () => {
      const shards = ['s1', 's2', 's3'];
      const items = monitorIds.map((m) => makePkgPolicy(m, assignShard(m, shards)!));
      const bulkUpdate = jest.fn().mockResolvedValue({ failedPolicies: [] });

      const spl = new SyntheticsPrivateLocation(makeServer(items, bulkUpdate));
      const result = await spl.rebalanceShards({
        location: { id: LOCATION_ID, agentPolicyIds: shards },
        healthyShards: shards,
      });

      expect(result).toEqual({ total: monitorIds.length, moved: 0 });
      expect(bulkUpdate).not.toHaveBeenCalled();
    });

    it('moves only monitors whose assigned shard changed when a shard goes offline', async () => {
      const allShards = ['s1', 's2', 's3'];
      const healthyShards = ['s1', 's2']; // s3 offline
      const items = monitorIds.map((m) => makePkgPolicy(m, assignShard(m, allShards)!));
      const bulkUpdate = jest.fn().mockResolvedValue({ failedPolicies: [] });

      const expectedMovers = monitorIds.filter(
        (m) => assignShard(m, allShards) !== assignShard(m, healthyShards)
      );
      expect(expectedMovers.length).toBeGreaterThan(0); // sanity: the scenario actually moves work

      const spl = new SyntheticsPrivateLocation(makeServer(items, bulkUpdate));
      const result = await spl.rebalanceShards({
        location: { id: LOCATION_ID, label: 'Test Location', agentPolicyIds: allShards },
        healthyShards,
      });

      expect(result).toEqual({ total: monitorIds.length, moved: expectedMovers.length });

      // Only the movers were written, each re-targeted to its rendezvous shard.
      const updated = bulkUpdate.mock.calls.flatMap((call) => call[2] as PackagePolicy[]);
      expect(updated.map((p) => p.id).sort()).toEqual(
        expectedMovers.map((m) => `${m}-${LOCATION_ID}`).sort()
      );
      updated.forEach((p) => {
        const monitorId = p.name;
        expect(p.policy_ids).toEqual([assignShard(monitorId, healthyShards)]);
        expect(p.policy_id).toEqual(assignShard(monitorId, healthyShards));
      });
    });

    it('re-targets every monitor when its shard is offline and the healthy shards are empty', async () => {
      const allShards = ['s1', 's2', 's3'];
      const healthyShards = ['s1', 's2'];
      // All monitors currently pinned to the offline shard; healthy shards empty
      // → recovery path (full scan) pulls work back onto them.
      const items = monitorIds.map((m) => makePkgPolicy(m, 's3'));
      const bulkUpdate = jest.fn().mockResolvedValue({ failedPolicies: [] });

      const spl = new SyntheticsPrivateLocation(makeServer(items, bulkUpdate));
      const result = await spl.rebalanceShards({
        location: { id: LOCATION_ID, agentPolicyIds: allShards },
        healthyShards,
      });

      expect(result.moved).toBe(monitorIds.length);
      const updated = bulkUpdate.mock.calls.flatMap((call) => call[2] as PackagePolicy[]);
      updated.forEach((p) => {
        expect(healthyShards).toContain(p.policy_ids![0]);
      });
    });

    it('fetches only the offline shard when healthy shards already hold work', async () => {
      const allShards = ['s1', 's2', 's3'];
      const healthyShards = ['s1', 's2'];
      const items = monitorIds.map((m) => makePkgPolicy(m, assignShard(m, allShards)!));
      const bulkUpdate = jest.fn().mockResolvedValue({ failedPolicies: [] });

      const server = makeServer(items, bulkUpdate);
      const spl = new SyntheticsPrivateLocation(server);
      await spl.rebalanceShards({
        location: { id: LOCATION_ID, agentPolicyIds: allShards },
        healthyShards,
      });

      // Failover path must never do the full-location scan (a kuery without a
      // policy_ids filter); it only queries per-shard counts + the stale shard.
      const listCalls = (server.fleet.packagePolicyService.list as jest.Mock).mock.calls;
      expect(listCalls.every(([, { kuery }]) => kuery.includes('policy_ids'))).toBe(true);
    });
  });

  it('formats monitors stream properly', () => {
    const expectedInlineSource = Buffer.from(
      handleMultilineStringFormatter(dummyBrowserConfig['source.inline.script'] as string)
    ).toString('base64');
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
          value: expectedInlineSource,
        },
        'source.inline.encoding': {
          type: 'text',
          value: 'base64',
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

  it('formats browser timeout for private locations', () => {
    const test = formatSyntheticsPolicy(
      testMonitorPolicy,
      MonitorTypeEnum.BROWSER,
      {
        ...dummyBrowserConfig,
        timeout: '60',
      },
      {},
      []
    );

    expect(test.formattedPolicy.inputs[3].streams[1].vars?.timeout).toStrictEqual({
      type: 'text',
      value: '30s',
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
