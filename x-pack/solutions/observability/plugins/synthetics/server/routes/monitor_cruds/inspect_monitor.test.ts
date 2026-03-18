/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { buildPackagePolicyLinks } from './inspect_monitor';

const makePrivateLocation = (
  overrides: Partial<PrivateLocationAttributes> = {}
): PrivateLocationAttributes => ({
  id: 'loc-1',
  label: 'My Private Location',
  agentPolicyId: 'agent-policy-1',
  isServiceManaged: false,
  ...overrides,
});

const makeMockRepository = (
  references: Array<{ id: string; name: string; type: string }> = []
) => ({
  get: jest.fn().mockResolvedValue({ references }),
});

describe('buildPackagePolicyLinks', () => {
  it('returns empty links when monitorId is undefined (new monitor)', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: undefined,
      monitorPrivateLocations: [{ id: 'loc-1', label: 'Loc 1' }],
      privateLocations: [makePrivateLocation()],
      monitorConfigRepository: makeMockRepository(),
    });

    expect(result).toEqual({ packagePolicyLinks: [], hasMissingReferences: false });
  });

  it('returns empty links when there are no private locations', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [],
      privateLocations: [makePrivateLocation()],
      monitorConfigRepository: makeMockRepository(),
    });

    expect(result).toEqual({ packagePolicyLinks: [], hasMissingReferences: false });
  });

  it('builds links with references present', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [{ id: 'loc-1', label: 'My Location' }],
      privateLocations: [makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1' })],
      monitorConfigRepository: makeMockRepository([
        { id: 'monitor-1-loc-1', name: 'monitor-1-loc-1', type: 'ingest-package-policies' },
      ]),
    });

    expect(result.hasMissingReferences).toBe(false);
    expect(result.packagePolicyLinks).toEqual([
      {
        locationId: 'loc-1',
        locationLabel: 'My Location',
        agentPolicyId: 'ap-1',
        packagePolicyId: 'monitor-1-loc-1',
      },
    ]);
  });

  it('sets hasMissingReferences when references are empty', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [{ id: 'loc-1', label: 'My Location' }],
      privateLocations: [makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1' })],
      monitorConfigRepository: makeMockRepository([]),
    });

    expect(result.hasMissingReferences).toBe(true);
    expect(result.packagePolicyLinks).toHaveLength(1);
    expect(result.packagePolicyLinks[0].packagePolicyId).toBe('monitor-1-loc-1');
  });

  it('handles multiple private locations with partial references', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [
        { id: 'loc-1', label: 'Location 1' },
        { id: 'loc-2', label: 'Location 2' },
      ],
      privateLocations: [
        makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1', label: 'Location 1' }),
        makePrivateLocation({ id: 'loc-2', agentPolicyId: 'ap-2', label: 'Location 2' }),
      ],
      monitorConfigRepository: makeMockRepository([
        { id: 'monitor-1-loc-1', name: 'monitor-1-loc-1', type: 'ingest-package-policies' },
      ]),
    });

    expect(result.hasMissingReferences).toBe(true);
    expect(result.packagePolicyLinks).toHaveLength(2);
    expect(result.packagePolicyLinks[0]).toEqual({
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      agentPolicyId: 'ap-1',
      packagePolicyId: 'monitor-1-loc-1',
    });
    expect(result.packagePolicyLinks[1]).toEqual({
      locationId: 'loc-2',
      locationLabel: 'Location 2',
      agentPolicyId: 'ap-2',
      packagePolicyId: 'monitor-1-loc-2',
    });
  });

  it('skips locations without a matching private location definition', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [
        { id: 'loc-1', label: 'Location 1' },
        { id: 'loc-unknown', label: 'Unknown' },
      ],
      privateLocations: [
        makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1', label: 'Location 1' }),
      ],
      monitorConfigRepository: makeMockRepository([
        { id: 'monitor-1-loc-1', name: 'monitor-1-loc-1', type: 'ingest-package-policies' },
      ]),
    });

    expect(result.packagePolicyLinks).toHaveLength(1);
    expect(result.packagePolicyLinks[0].locationId).toBe('loc-1');
  });

  it('falls back to locationId when label is empty', async () => {
    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [{ id: 'loc-1', label: '' }],
      privateLocations: [makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1' })],
      monitorConfigRepository: makeMockRepository([
        { id: 'monitor-1-loc-1', name: 'monitor-1-loc-1', type: 'ingest-package-policies' },
      ]),
    });

    expect(result.packagePolicyLinks[0].locationLabel).toBe('loc-1');
  });

  it('handles monitorConfigRepository.get throwing (new monitor not saved yet)', async () => {
    const mockRepo = {
      get: jest.fn().mockRejectedValue(new Error('Not found')),
    };

    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [{ id: 'loc-1', label: 'My Location' }],
      privateLocations: [makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1' })],
      monitorConfigRepository: mockRepo,
    });

    expect(result.hasMissingReferences).toBe(true);
    expect(result.packagePolicyLinks).toHaveLength(1);
    expect(result.packagePolicyLinks[0].packagePolicyId).toBe('monitor-1-loc-1');
  });

  it('handles saved object with no references field', async () => {
    const mockRepo = {
      get: jest.fn().mockResolvedValue({}),
    };

    const result = await buildPackagePolicyLinks({
      monitorId: 'monitor-1',
      monitorPrivateLocations: [{ id: 'loc-1', label: 'My Location' }],
      privateLocations: [makePrivateLocation({ id: 'loc-1', agentPolicyId: 'ap-1' })],
      monitorConfigRepository: mockRepo,
    });

    expect(result.hasMissingReferences).toBe(true);
    expect(result.packagePolicyLinks).toHaveLength(1);
  });
});
