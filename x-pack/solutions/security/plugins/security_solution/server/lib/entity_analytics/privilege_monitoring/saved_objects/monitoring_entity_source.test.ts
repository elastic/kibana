/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  MonitoringEntitySource,
  MonitoringEntitySourceAttributes,
} from '../../../../../common/api/entity_analytics';
import type { PartialMonitoringEntitySource } from '../types';
import { MonitoringEntitySourceDescriptorClient } from './monitoring_entity_source';

describe('MonitoringEntitySourceDescriptorClient', () => {
  it('updateWithoutMatchers strips matchers before updating', async () => {
    const soClient = savedObjectsClientMock.create();
    const client = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: 'default',
    });

    const updateSpy = jest
      .spyOn(client, 'update')
      .mockResolvedValue({ id: 'source-id' } as MonitoringEntitySource);

    const input: PartialMonitoringEntitySource = {
      id: 'source-id',
      name: 'Test Source',
      matchers: [{ fields: ['user.roles'], values: ['admin'] }],
    };

    await client.updateWithoutMatchers(input);

    expect(updateSpy).toHaveBeenCalledWith({
      id: 'source-id',
      name: 'Test Source',
    });
  });

  it('bulkUpsert avoids matchers when matchersModifiedByUser is true', async () => {
    const soClient = savedObjectsClientMock.create();
    const client = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: 'default',
    });

    const existing = {
      id: 'source-id',
      name: 'Existing Source',
      matchersModifiedByUser: true,
    } as MonitoringEntitySource;

    jest.spyOn(client, 'find').mockResolvedValue({
      sources: [existing],
      page: 1,
      per_page: 10,
      total: 1,
    });

    const updateWithoutMatchersSpy = jest
      .spyOn(client, 'updateWithoutMatchers')
      .mockResolvedValue(existing);
    const updateSpy = jest.spyOn(client, 'update').mockResolvedValue(existing);

    const updateAttrs: MonitoringEntitySourceAttributes = {
      type: 'index',
      name: 'Existing Source',
      matchers: [{ fields: ['user.roles'], values: ['admin'] }],
    };

    const result = await client.bulkUpsert([updateAttrs]);

    expect(updateWithoutMatchersSpy).toHaveBeenCalledWith({
      id: 'source-id',
      ...updateAttrs,
    });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });

  it('bulkUpsert updates matchers when matchersModifiedByUser is false', async () => {
    const soClient = savedObjectsClientMock.create();
    const client = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: 'default',
    });

    const existing = {
      id: 'source-id',
      name: 'Existing Source',
      matchersModifiedByUser: false,
    } as MonitoringEntitySource;

    jest.spyOn(client, 'find').mockResolvedValue({
      sources: [existing],
      page: 1,
      per_page: 10,
      total: 1,
    });

    const updateWithoutMatchersSpy = jest
      .spyOn(client, 'updateWithoutMatchers')
      .mockResolvedValue(existing);
    const updateSpy = jest.spyOn(client, 'update').mockResolvedValue(existing);

    const updateAttrs: MonitoringEntitySourceAttributes = {
      type: 'index',
      name: 'Existing Source',
      matchers: [{ fields: ['user.roles'], values: ['admin'] }],
    };

    const result = await client.bulkUpsert([updateAttrs]);

    expect(updateSpy).toHaveBeenCalledWith({
      id: 'source-id',
      ...updateAttrs,
    });
    expect(updateWithoutMatchersSpy).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });
});
