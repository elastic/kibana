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
import { SyntheticsPrivateLocation } from './synthetics_private_location';
import { testMonitorPolicy } from './test_policy';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import { handleMultilineStringFormatter } from '../formatters/formatting_utils';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { SyntheticsServerSetup } from '../../types';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { agentIdCondition, assignAgentById } from './assign_by_condition';
import { PackagePolicyService } from './package_policy_service';
import * as getPrivateLocationsModule from '../get_private_locations';

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

  describe('generateNewPolicy condition sharding', () => {
    const conditionLocation = {
      id: 'condition-location',
      label: 'Condition location',
      agentPolicyId: 'single-agent-policy',
      isServiceManaged: false,
      isAgentSharding: true,
    } as unknown as PrivateLocationAttributes;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('keeps the single agent policy binding and assigns a new monitor to one enrolled agent', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const agentIds = ['agent-a', 'agent-b', 'agent-c'];

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds }
      );

      expect(policy?.policy_id).toBe('single-agent-policy');
      expect(policy?.policy_ids).toEqual(['single-agent-policy']);
      expect(policy?.condition).toBe(assignAgentById(testConfig.id, agentIds)?.condition);
    });

    it('preserves an edit pin while its assigned agent is still enrolled', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const agentIds = ['agent-a', 'agent-b', 'agent-c'];
      const assigned = assignAgentById(testConfig.id, agentIds)?.agentId;
      const existingAgentId = agentIds.find((agentId) => agentId !== assigned)!;
      const existingCondition = agentIdCondition(existingAgentId);

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds },
        existingCondition
      );

      expect(policy?.condition).toBe(existingCondition);
    });

    it('reassigns an edit when its pinned agent has left the location policy', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const agentIds = ['agent-a', 'agent-b'];

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds },
        agentIdCondition('departed-agent')
      );

      expect(policy?.condition).toBe(assignAgentById(testConfig.id, agentIds)?.condition);
    });

    it('omits condition when no agent is enrolled instead of stamping a sentinel pin', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds: [] }
      );

      expect(policy?.condition).toBeUndefined();
    });

    it('omits condition when shard rebalance is disabled, even with enrolled agents', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds: ['agent-a', 'agent-b'] },
        undefined,
        false
      );

      expect(policy?.condition).toBeUndefined();
    });

    it('clears an existing pin when shard rebalance is disabled', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const existingCondition = agentIdCondition('agent-a');

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        conditionLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds: ['agent-a', 'agent-b'] },
        existingCondition,
        false
      );

      expect(policy?.condition).toBeNull();
    });

    it('preserves the classic payload when no scalable-location condition exists', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        mockPrivateLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        { agentIds: ['agent-a'] }
      );

      expect(policy?.condition).toBeUndefined();
    });

    it('clears a scalable-location condition when the location switches back to classic', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);

      const policy = await syntheticsPrivateLocation.generateNewPolicy(
        testConfig,
        mockPrivateLocation,
        testMonitorPolicy,
        'default',
        {},
        [],
        undefined,
        undefined,
        undefined,
        agentIdCondition('agent-a')
      );

      expect(policy?.condition).toBeNull();
    });

    it('clears existing agent conditions when editing monitors on a location that is no longer sharded', async () => {
      const policyId = 'testId-policyId';
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [{ id: policyId, condition: agentIdCondition('agent-a') }],
        allSpaces: new Set(['default']),
      });
      const bulkUpdate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdate')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config: testConfig, globalParams: {} }],
        [mockPrivateLocation],
        'default',
        []
      );

      expect(bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          policiesToUpdate: [
            expect.objectContaining({
              id: policyId,
              condition: null,
            }),
          ],
        })
      );
    });

    it('stamps agent conditions when editing monitors onto a newly sharded location', async () => {
      const policyId = `testId-${conditionLocation.id}`;
      const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-a' }], total: 1 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const config = { ...testConfig, locations: [conditionLocation] };
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [{ id: policyId }],
        allSpaces: new Set(['default']),
      });
      const bulkUpdate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdate')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config, globalParams: {} }],
        [conditionLocation],
        'default',
        []
      );

      expect(bulkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          policiesToUpdate: [
            expect.objectContaining({
              id: policyId,
              condition: agentIdCondition('agent-a'),
            }),
          ],
        })
      );
    });

    it('does not stamp a sentinel condition when enabling sharding with no enrolled agents', async () => {
      const policyId = `testId-${conditionLocation.id}`;
      const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const config = { ...testConfig, locations: [conditionLocation] };
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [{ id: policyId }],
        allSpaces: new Set(['default']),
      });
      const bulkUpdate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdate')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config, globalParams: {} }],
        [conditionLocation],
        'default',
        []
      );

      const updated = bulkUpdate.mock.calls[0][0].policiesToUpdate[0];
      expect(updated.id).toBe(policyId);
      expect(updated.condition).toBeUndefined();
    });

    it('does not add a condition when shard rebalance is disabled in settings', async () => {
      const policyId = `testId-${conditionLocation.id}`;
      const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-a' }], total: 1 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
        pluginsStart: {
          taskManager: {
            get: jest.fn().mockResolvedValue({
              state: { rebalancePrivateLocationShardsEnabled: false },
            }),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const config = { ...testConfig, locations: [conditionLocation] };
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [{ id: policyId }],
        allSpaces: new Set(['default']),
      });
      const bulkUpdate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdate')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config, globalParams: {} }],
        [conditionLocation],
        'default',
        []
      );

      const updated = bulkUpdate.mock.calls[0][0].policiesToUpdate[0];
      expect(updated.id).toBe(policyId);
      expect(updated.condition).toBeUndefined();
      expect(listAgents).not.toHaveBeenCalled();
    });

    it('clears an existing pin on edit when shard rebalance is disabled in settings', async () => {
      const policyId = `testId-${conditionLocation.id}`;
      const existingCondition = agentIdCondition('agent-a');
      const listAgents = jest.fn().mockResolvedValue({
        agents: [{ id: 'agent-a' }, { id: 'agent-b' }],
        total: 2,
      });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
        pluginsStart: {
          taskManager: {
            get: jest.fn().mockResolvedValue({
              state: { rebalancePrivateLocationShardsEnabled: false },
            }),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const config = { ...testConfig, locations: [conditionLocation] };
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [{ id: policyId, condition: existingCondition }],
        allSpaces: new Set(['default']),
      });
      const bulkUpdate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdate')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config, globalParams: {} }],
        [conditionLocation],
        'default',
        []
      );

      const updated = bulkUpdate.mock.calls[0][0].policiesToUpdate[0];
      expect(updated.condition).toBeNull();
      expect(listAgents).not.toHaveBeenCalled();
    });

    it('does not add a condition on create when shard rebalance is disabled in settings', async () => {
      const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-a' }], total: 1 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
        pluginsStart: {
          taskManager: {
            get: jest.fn().mockResolvedValue({
              state: { rebalancePrivateLocationShardsEnabled: false },
            }),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const bulkCreate = jest
        .spyOn(PackagePolicyService.prototype, 'bulkCreate')
        .mockResolvedValue({
          created: [],
          failed: [],
        });

      await syntheticsPrivateLocation.createPackagePolicies(
        [{ config: { ...testConfig, locations: [conditionLocation] }, globalParams: {} }],
        [conditionLocation],
        'default',
        []
      );

      const created = bulkCreate.mock.calls[0][0].newPolicies[0];
      expect(created.condition).toBeUndefined();
      expect(listAgents).not.toHaveBeenCalled();
    });

    it('resolves a scalable location once per batch and paginates its enrolled agents', async () => {
      // A full first page (matching the implementation's internal perPage) must
      // trigger a second request regardless of `total`, since `total` isn't
      // always trustworthy - see the pagination fix this test guards.
      const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: `agent-${i}` }));
      const listAgents = jest
        .fn()
        .mockResolvedValueOnce({ agents: firstPage, total: 1001 })
        .mockResolvedValueOnce({ agents: [{ id: 'agent-1000' }], total: 1001 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
        },
      } as unknown as SyntheticsServerSetup);
      const getScalableAgentsByLocation = (
        syntheticsPrivateLocation as unknown as {
          getScalableAgentsByLocation: (
            locations: Array<{ id: string; agentPolicyId: string; isAgentSharding?: boolean }>
          ) => Promise<Map<string, { agentIds: string[] }>>;
        }
      ).getScalableAgentsByLocation.bind(syntheticsPrivateLocation);

      const result = await getScalableAgentsByLocation([
        { id: 'condition-location', agentPolicyId: 'single-agent-policy', isAgentSharding: true },
        { id: 'condition-location', agentPolicyId: 'single-agent-policy', isAgentSharding: true },
      ]);

      expect(listAgents).toHaveBeenCalledTimes(2);
      const agentIds = result.get('condition-location')?.agentIds ?? [];
      expect(agentIds).toHaveLength(1001);
      expect(agentIds).toEqual(expect.arrayContaining(['agent-0', 'agent-999', 'agent-1000']));
    });

    it('escapes quotes in the agent policy id before building the agents kuery', async () => {
      const listAgents = jest.fn().mockResolvedValue({ agents: [], total: 0 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
        },
      } as unknown as SyntheticsServerSetup);
      const getScalableAgentsByLocation = (
        syntheticsPrivateLocation as unknown as {
          getScalableAgentsByLocation: (
            locations: Array<{ id: string; agentPolicyId: string; isAgentSharding?: boolean }>
          ) => Promise<Map<string, { agentIds: string[] }>>;
        }
      ).getScalableAgentsByLocation.bind(syntheticsPrivateLocation);

      await getScalableAgentsByLocation([
        {
          id: 'condition-location',
          agentPolicyId: `agent-policy" or true or "`,
          isAgentSharding: true,
        },
      ]);

      expect(listAgents).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: `policy_id:"agent-policy\\" or true or \\""` })
      );
    });
    it('does not resolve agents for scalable locations unused by monitor creation', async () => {
      const listAgents = jest.fn();
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });

      await syntheticsPrivateLocation.createPackagePolicies(
        [{ config: testConfig, globalParams: {} }],
        [mockPrivateLocation, conditionLocation],
        'default',
        []
      );

      expect(listAgents).not.toHaveBeenCalled();
    });

    it('does not resolve agents for scalable locations unused by monitor edits', async () => {
      const listAgents = jest.fn();
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      jest.spyOn(syntheticsPrivateLocation, 'getExistingPolicies').mockResolvedValue({
        policies: [],
        allSpaces: new Set(['default']),
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkCreate').mockResolvedValue({
        created: [],
        failed: [],
      });
      jest.spyOn(PackagePolicyService.prototype, 'bulkUpdate').mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkDelete').mockResolvedValue(undefined);

      await syntheticsPrivateLocation.editMonitors(
        [{ config: testConfig, globalParams: {} }],
        [mockPrivateLocation, conditionLocation],
        'default',
        []
      );

      expect(listAgents).not.toHaveBeenCalled();
    });

    it('uses an enrolled agent condition when inspecting a scalable location', async () => {
      const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-a' }], total: 1 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const inspect = jest
        .spyOn(PackagePolicyService.prototype, 'inspect')
        .mockResolvedValue(testMonitorPolicy);

      await syntheticsPrivateLocation.inspectPackagePolicy({
        privateConfig: {
          config: { ...testConfig, locations: [conditionLocation] },
          globalParams: {},
        },
        allPrivateLocations: [conditionLocation],
        maintenanceWindows: [],
        spaceId: 'default',
      });

      expect(inspect).toHaveBeenCalledWith(
        expect.objectContaining({
          packagePolicy: expect.objectContaining({ condition: agentIdCondition('agent-a') }),
        })
      );
    });

    it('omits condition when inspecting while shard rebalance is disabled', async () => {
      const listAgents = jest.fn().mockResolvedValue({ agents: [{ id: 'agent-a' }], total: 1 });
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
          agentService: { asInternalUser: { listAgents } },
          packagePolicyService: {
            ...serverMock.fleet.packagePolicyService,
            buildPackagePolicyFromPackage: jest.fn().mockResolvedValue(testMonitorPolicy),
          },
        },
        pluginsStart: {
          taskManager: {
            get: jest.fn().mockResolvedValue({
              state: { rebalancePrivateLocationShardsEnabled: false },
            }),
          },
        },
      } as unknown as SyntheticsServerSetup);
      const inspect = jest
        .spyOn(PackagePolicyService.prototype, 'inspect')
        .mockResolvedValue(testMonitorPolicy);

      await syntheticsPrivateLocation.inspectPackagePolicy({
        privateConfig: {
          config: { ...testConfig, locations: [conditionLocation] },
          globalParams: {},
        },
        allPrivateLocations: [conditionLocation],
        maintenanceWindows: [],
        spaceId: 'default',
      });

      expect(inspect.mock.calls[0][0].packagePolicy.condition).toBeUndefined();
      expect(listAgents).not.toHaveBeenCalled();
    });

    it('clears agent pins only on scalable private-location package policies', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        { id: 'loc-1', agentPolicyId: 'ap-1', isAgentSharding: true },
        { id: 'loc-2', agentPolicyId: 'ap-1', isAgentSharding: true },
        { id: 'loc-3', agentPolicyId: 'ap-2', isAgentSharding: true },
      ] as never);
      const listByAgentPolicy = jest
        .spyOn(PackagePolicyService.prototype, 'listByAgentPolicy')
        .mockResolvedValueOnce([
          {
            id: 'm1-loc-1',
            condition: agentIdCondition('agent-a'),
            spaceIds: ['default'],
            version: 'WzAsMV0=',
            revision: 1,
          },
          { id: 'm2-loc-1', spaceIds: ['default'], version: 'WzAsMV0=', revision: 1 },
        ] as never)
        .mockResolvedValueOnce([]);
      const bulkUpdateInSpace = jest
        .spyOn(PackagePolicyService.prototype, 'bulkUpdateInSpace')
        .mockResolvedValue([]);

      const result = await new SyntheticsPrivateLocation(serverMock).clearShardConditions();

      expect(listByAgentPolicy).toHaveBeenCalledTimes(2);
      expect(listByAgentPolicy).toHaveBeenCalledWith({ agentPolicyId: 'ap-1' });
      expect(listByAgentPolicy).toHaveBeenCalledWith({ agentPolicyId: 'ap-2' });
      expect(bulkUpdateInSpace).toHaveBeenCalledWith({
        spaceId: 'default',
        policiesToUpdate: [
          expect.objectContaining({
            update: expect.objectContaining({
              id: 'm1-loc-1',
              attributes: expect.objectContaining({ condition: null }),
            }),
          }),
        ],
      });
      expect(result.cleared).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('does not list Fleet policies for classic private locations', async () => {
      jest.spyOn(getPrivateLocationsModule, 'getPrivateLocations').mockResolvedValue([
        { id: 'classic', agentPolicyId: 'ap-classic' },
        { id: 'sharded', agentPolicyId: 'ap-sharded', isAgentSharding: true },
      ] as never);
      const listByAgentPolicy = jest
        .spyOn(PackagePolicyService.prototype, 'listByAgentPolicy')
        .mockResolvedValue([]);
      jest.spyOn(PackagePolicyService.prototype, 'bulkUpdateInSpace').mockResolvedValue([]);

      const result = await new SyntheticsPrivateLocation(serverMock).clearShardConditions();

      expect(listByAgentPolicy).toHaveBeenCalledTimes(1);
      expect(listByAgentPolicy).toHaveBeenCalledWith({ agentPolicyId: 'ap-sharded' });
      expect(listByAgentPolicy).not.toHaveBeenCalledWith({ agentPolicyId: 'ap-classic' });
      expect(result.cleared).toBe(0);
      expect(result.failed).toBe(0);
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

    expect(test.formattedPolicy.inputs[0].streams[1]).toStrictEqual({
      data_stream: {
        dataset: 'browser',
        type: 'synthetics',
      },
      enabled: true,
      vars: {
        __ui: {
          type: 'yaml',
          value: null,
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
        certificate_error_spki_allowlist: {
          type: 'yaml',
          value: null,
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
          value: null,
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

    expect(test.formattedPolicy.inputs[0].streams[1].vars?.timeout).toStrictEqual({
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
  certificate_error_spki_allowlist: [],
  throttling: { value: { download: '5', upload: '3', latency: '20' }, label: 'test', id: 'test' },
  id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  config_id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  fields: { config_id: '75cdd125-5b62-4459-870c-46f59bf37e89', run_once: true },
  fields_under_root: true,
  max_redirects: '0',
};
