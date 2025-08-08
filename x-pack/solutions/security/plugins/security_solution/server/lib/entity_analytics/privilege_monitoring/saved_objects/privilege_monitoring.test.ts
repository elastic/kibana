/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { PrivilegeMonitoringEngineDescriptorClient } from './privilege_monitoring';
import { privilegeMonitoringTypeName } from './privilege_monitoring_type';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';

describe('PrivilegeMonitoringEngineDescriptorClient', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let client: PrivilegeMonitoringEngineDescriptorClient;
  const namespace = 'test-namespace';

  beforeEach(() => {
    soClient = {
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    client = new PrivilegeMonitoringEngineDescriptorClient({ soClient, namespace });
  });

  it('should return the correct saved object ID', () => {
    expect(client.getSavedObjectId()).toBe(`privilege-monitoring-${namespace}`);
  });

  it('should initialize a new descriptor if none exists', async () => {
    soClient.find.mockResolvedValue({
      total: 0,
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse<unknown, unknown>);
    soClient.create.mockResolvedValue({
      id: `privilege-monitoring-${namespace}`,
      type: privilegeMonitoringTypeName,
      attributes: { status: 'installing' as unknown },
      references: [],
    });

    const result = await client.init();

    expect(soClient.create).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      { status: PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED },
      { id: `privilege-monitoring-${namespace}` }
    );
    expect(result).toEqual({ status: 'installing' });
  });

  it('should update an existing descriptor if one exists', async () => {
    const existingDescriptor = {
      total: 1,
      saved_objects: [{ attributes: { status: 'started', apiKey: 'old-key' } }],
    } as SavedObjectsFindResponse<unknown, unknown>;

    soClient.find.mockResolvedValue(
      existingDescriptor as unknown as SavedObjectsFindResponse<unknown, unknown>
    );
    soClient.update.mockResolvedValue({
      id: `privilege-monitoring-${namespace}`,
      type: privilegeMonitoringTypeName,
      attributes: { status: 'installing' as unknown, apiKey: '' as unknown },
      references: [],
    });

    const result = await client.init();

    expect(soClient.update).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      `privilege-monitoring-${namespace}`,
      { status: PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED, apiKey: '', error: undefined },
      { refresh: 'wait_for' }
    );
    expect(result).toEqual({ status: 'started', apiKey: '', error: undefined });
  });

  it('should update the descriptor', async () => {
    soClient.update.mockResolvedValue({
      id: `privilege-monitoring-${namespace}`,
      type: privilegeMonitoringTypeName,
      attributes: { status: 'started' as unknown },
      references: [],
    });

    const result = await client.update({ status: 'started' });

    expect(soClient.update).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      `privilege-monitoring-${namespace}`,
      { status: 'started' },
      { refresh: 'wait_for' }
    );
    expect(result).toEqual({ status: 'started' });
  });

  it('should update the status', async () => {
    soClient.update.mockResolvedValue({
      id: `privilege-monitoring-${namespace}`,
      type: privilegeMonitoringTypeName,
      attributes: { status: 'started' as unknown },
      references: [],
    });

    const result = await client.updateStatus('started');

    expect(soClient.update).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      `privilege-monitoring-${namespace}`,
      { status: 'started' },
      { refresh: 'wait_for' }
    );
    expect(result).toEqual({ status: 'started' });
  });

  it('should find descriptors', async () => {
    const findResponse = {
      total: 1,
      saved_objects: [{ attributes: { status: 'started', apiKey: 'key' } }],
    };
    soClient.find.mockResolvedValue(findResponse as SavedObjectsFindResponse<unknown, unknown>);

    const result = await client.find();

    expect(soClient.find).toHaveBeenCalledWith({
      type: privilegeMonitoringTypeName,
      namespaces: [namespace],
    });
    expect(result).toEqual(findResponse);
  });

  it('should get a descriptor', async () => {
    const getResponse = {
      id: `privilege-monitoring-${namespace}`,
      type: privilegeMonitoringTypeName,
      attributes: { status: 'started' as unknown, apiKey: 'key' as unknown },
      references: [],
    };
    soClient.get.mockResolvedValue(getResponse as unknown as SavedObject<unknown>);

    const result = await client.get();

    expect(soClient.get).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      `privilege-monitoring-${namespace}`
    );
    expect(result).toEqual(getResponse.attributes);
  });

  it('should delete a descriptor', async () => {
    await client.delete();

    expect(soClient.delete).toHaveBeenCalledWith(
      privilegeMonitoringTypeName,
      `privilege-monitoring-${namespace}`
    );
  });
});
