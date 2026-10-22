/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY } from '@kbn/entity-inventory-app-plugin/public';
import { useInfraEntitiesInventoryExperience } from './use_infra_entities_inventory_experience';

jest.mock('./use_kibana', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

const { useKibanaContextForPlugin } = jest.requireMock('./use_kibana');

const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(true);

const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('useInfraEntitiesInventoryExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaContextForPlugin.mockReturnValue({
      services: { uiSettings: { get: mockGet, set: mockSet } },
    });
  });

  it('returns false by default when the setting is not set', () => {
    mockGet.mockReturnValue(false);

    const { result } = renderHook(() => useInfraEntitiesInventoryExperience());

    expect(result.current[0]).toBe(false);
    expect(mockGet).toHaveBeenCalledWith(INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY, false);
  });

  it('returns true when the setting is enabled', () => {
    mockGet.mockReturnValue(true);

    const { result } = renderHook(() => useInfraEntitiesInventoryExperience());

    expect(result.current[0]).toBe(true);
  });

  it('calls uiSettings.set and reloads when save succeeds', async () => {
    mockGet.mockReturnValue(false);
    mockSet.mockResolvedValue(true);

    const { result } = renderHook(() => useInfraEntitiesInventoryExperience());

    await act(async () => {
      await result.current[1](true);
    });

    expect(mockSet).toHaveBeenCalledWith(INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY, true);
    expect(mockReload).toHaveBeenCalled();
  });

  it('does not reload when save fails', async () => {
    mockGet.mockReturnValue(false);
    mockSet.mockResolvedValue(false);

    const { result } = renderHook(() => useInfraEntitiesInventoryExperience());

    await act(async () => {
      await result.current[1](true);
    });

    expect(mockSet).toHaveBeenCalledWith(INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY, true);
    expect(mockReload).not.toHaveBeenCalled();
  });
});
