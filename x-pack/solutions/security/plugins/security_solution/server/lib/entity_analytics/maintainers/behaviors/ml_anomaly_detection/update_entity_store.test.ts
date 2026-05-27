/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityAnomalies } from './fetch_anomalies';
import { updateEntityStore } from './update_entity_store';

const makeAnomalies = (jobIds: string[]): EntityAnomalies =>
  Object.fromEntries(jobIds.map((id) => [id, { anomalies: [], baselineBehaviors: [] }]));

let logger: ReturnType<typeof loggingSystemMock.createLogger>;
let updateClient: jest.Mocked<EntityUpdateClient>;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  updateClient = {
    bulkUpdateEntity: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EntityUpdateClient>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('updateEntityStore', () => {
  it('does nothing when anomaliesByEntity is empty', async () => {
    await updateEntityStore({
      anomaliesByEntity: new Map(),
      entityType: 'user',
      logger,
      updateClient,
    });

    expect(updateClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('does nothing when all entities have empty anomalies', async () => {
    await updateEntityStore({
      anomaliesByEntity: new Map([
        ['user:alice', {}],
        ['user:bob', {}],
      ]),
      entityType: 'user',
      logger,
      updateClient,
    });

    expect(updateClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('calls bulkUpdateEntity with the correct objects', async () => {
    await updateEntityStore({
      anomaliesByEntity: new Map([
        ['user:alice', makeAnomalies(['security-job-1', 'security-job-2'])],
        ['user:bob', makeAnomalies(['security-job-1'])],
      ]),
      entityType: 'user',
      logger,
      updateClient,
    });

    expect(updateClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
    expect(updateClient.bulkUpdateEntity).toHaveBeenCalledWith({
      objects: expect.arrayContaining([
        {
          type: 'user',
          doc: {
            entity: {
              id: 'user:alice',
              behaviors: { anomaly_job_ids: ['security-job-1', 'security-job-2'] },
            },
          },
        },
        {
          type: 'user',
          doc: {
            entity: {
              id: 'user:bob',
              behaviors: { anomaly_job_ids: ['security-job-1'] },
            },
          },
        },
      ]),
    });
  });

  it('skips entities with empty anomalies but includes entities with anomalies', async () => {
    await updateEntityStore({
      anomaliesByEntity: new Map([
        ['user:alice', makeAnomalies(['security-job-1'])],
        ['user:empty', {}],
      ]),
      entityType: 'user',
      logger,
      updateClient,
    });

    const { objects } = (updateClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.id).toBe('user:alice');
  });

  it('logs a warning when bulkUpdateEntity returns errors', async () => {
    const errors = [{ error: 'not found', id: 'user:alice' }];
    updateClient.bulkUpdateEntity.mockResolvedValueOnce(errors as never);

    await updateEntityStore({
      anomaliesByEntity: new Map([['user:alice', makeAnomalies(['security-job-1'])]]),
      entityType: 'user',
      logger,
      updateClient,
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 error(s)'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(errors)));
  });

  it('does not log a warning when bulkUpdateEntity returns no errors', async () => {
    await updateEntityStore({
      anomaliesByEntity: new Map([['user:alice', makeAnomalies(['security-job-1'])]]),
      entityType: 'user',
      logger,
      updateClient,
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
