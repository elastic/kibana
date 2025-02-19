/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { type EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import { type InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getDataStreamTypes } from './get_data_stream_types';
import { getHasMetricsData } from './get_has_metrics_data';
import { getLatestEntity } from './get_latest_entity';
import { loggingSystemMock } from '@kbn/core/server/mocks';

jest.mock('./get_has_metrics_data', () => ({
  getHasMetricsData: jest.fn(),
}));

jest.mock('./get_latest_entity', () => ({
  getLatestEntity: jest.fn(),
}));

describe('getDataStreamTypes', () => {
  let infraMetricsClient: jest.Mocked<InfraMetricsClient>;
  let obsEsClient: jest.Mocked<TracedElasticsearchClient>;
  let entityManagerClient: jest.Mocked<EntityClient>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    infraMetricsClient = {} as jest.Mocked<InfraMetricsClient>;
    obsEsClient = {} as jest.Mocked<TracedElasticsearchClient>;
    entityManagerClient = {} as jest.Mocked<EntityClient>;
    jest.clearAllMocks();
  });

  it('should return only metrics when entityCentricExperienceEnabled is false and hasMetricsData is true', async () => {
    (getHasMetricsData as jest.Mock).mockResolvedValue(true);

    const params = {
      entityId: 'entity123',
      entityType: 'built_in_hosts_from_ecs_data',
      entityFilterType: 'host',
      entityCentricExperienceEnabled: false,
      infraMetricsClient,
      obsEsClient,
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    };

    const result = await getDataStreamTypes(params);

    expect(result).toEqual(['metrics']);
    expect(getHasMetricsData).toHaveBeenCalledWith({
      infraMetricsClient,
      entityId: 'entity123',
      field: 'host.name',
    });
  });

  it('should return an empty array when entityCentricExperienceEnabled is false and hasMetricsData is false', async () => {
    (getHasMetricsData as jest.Mock).mockResolvedValue(false);

    const params = {
      entityId: 'entity123',
      entityFilterType: 'container',
      entityType: 'built_in_containers_from_ecs_data',
      entityCentricExperienceEnabled: false,
      infraMetricsClient,
      obsEsClient,
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    };

    const result = await getDataStreamTypes(params);
    expect(result).toEqual([]);
  });

  it('should return metrics and entity source_data_stream types when entityCentricExperienceEnabled is true and has entity data', async () => {
    (getHasMetricsData as jest.Mock).mockResolvedValue(true);
    (getLatestEntity as jest.Mock).mockResolvedValue({
      sourceDataStreamType: ['logs', 'metrics'],
    });

    const params = {
      entityId: 'entity123',
      entityType: 'built_in_hosts_from_ecs_data',
      entityFilterType: 'host',
      entityCentricExperienceEnabled: true,
      infraMetricsClient,
      obsEsClient,
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    };

    const result = await getDataStreamTypes(params);

    expect(result).toEqual(['metrics', 'logs']);
    expect(getHasMetricsData).toHaveBeenCalled();
    expect(getLatestEntity).toHaveBeenCalledWith({
      entityId: 'entity123',
      entityType: 'built_in_hosts_from_ecs_data',
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    });
  });

  it('should return only metrics when entityCentricExperienceEnabled is true but entity data is undefined', async () => {
    (getHasMetricsData as jest.Mock).mockResolvedValue(true);
    (getLatestEntity as jest.Mock).mockResolvedValue(undefined);

    const params = {
      entityId: 'entity123',
      entityType: 'built_in_hosts_from_ecs_data',
      entityFilterType: 'host',
      entityCentricExperienceEnabled: true,
      infraMetricsClient,
      obsEsClient,
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    };

    const result = await getDataStreamTypes(params);
    expect(result).toEqual(['metrics']);
  });

  it('should return entity source_data_stream types when has no metrics', async () => {
    (getHasMetricsData as jest.Mock).mockResolvedValue(false);
    (getLatestEntity as jest.Mock).mockResolvedValue({
      sourceDataStreamType: ['logs', 'traces'],
    });

    const params = {
      entityId: 'entity123',
      entityType: 'built_in_hosts_from_ecs_data',
      entityFilterType: 'host',
      entityCentricExperienceEnabled: true,
      infraMetricsClient,
      obsEsClient,
      entityManagerClient,
      logger,
      from: '2024-12-09T10:49:15Z',
      to: '2024-12-10T10:49:15Z',
    };

    const result = await getDataStreamTypes(params);
    expect(result).toEqual(['logs', 'traces']);
  });
});
