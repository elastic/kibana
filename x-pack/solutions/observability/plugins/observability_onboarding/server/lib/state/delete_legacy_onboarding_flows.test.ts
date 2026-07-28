/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { deleteLegacyOnboardingFlows } from './delete_legacy_onboarding_flows';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../saved_objects/observability_onboarding_status';

const TYPE = OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE;

const createMocks = () => {
  const repository = savedObjectsRepositoryMock.create();
  const coreStart = {
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(repository),
    },
  } as unknown as CoreStart;
  const logger = loggerMock.create();
  return { repository, coreStart, logger };
};

const findPage = (ids: string[]) =>
  ({
    saved_objects: ids.map((id) => ({ id, type: TYPE })),
    total: ids.length,
    per_page: 1000,
    page: 1,
  } as never);

const deleteResponse = (
  statuses: Array<{ id: string; success: boolean; statusCode?: number; message?: string }>
) =>
  ({
    statuses: statuses.map(({ id, success, statusCode, message }) => ({
      id,
      type: TYPE,
      success,
      ...(statusCode
        ? { error: { error: 'error', message: message ?? 'failure', statusCode } }
        : {}),
    })),
  } as never);

describe('deleteLegacyOnboardingFlows', () => {
  it('queries page 1 with the legacy flow filter', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockResolvedValue(findPage([]));

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({
      type: TYPE,
      filter: `not ${TYPE}.attributes.createdBy: *`,
      page: 1,
      perPage: 1000,
      sortField: 'created_at',
      sortOrder: 'asc',
      fields: ['type'],
    });
  });

  it('does nothing when no legacy flows exist', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockResolvedValue(findPage([]));

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.bulkDelete).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('deletes a single page of legacy flows and stops on the empty page', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockResolvedValueOnce(findPage(['a', 'b'])).mockResolvedValueOnce(findPage([]));
    repository.bulkDelete.mockResolvedValue(
      deleteResponse([
        { id: 'a', success: true },
        { id: 'b', success: true },
      ])
    );

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.bulkDelete).toHaveBeenCalledTimes(1);
    expect(repository.bulkDelete).toHaveBeenCalledWith(
      [
        { type: TYPE, id: 'a' },
        { type: TYPE, id: 'b' },
      ],
      { refresh: 'wait_for' }
    );
    expect(repository.find).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      'Deleted 2 legacy onboarding flow(s) without an owner'
    );
  });

  it('keeps deleting until the filtered result set is empty', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find
      .mockResolvedValueOnce(findPage(['a']))
      .mockResolvedValueOnce(findPage(['b']))
      .mockResolvedValueOnce(findPage([]));
    repository.bulkDelete
      .mockResolvedValueOnce(deleteResponse([{ id: 'a', success: true }]))
      .mockResolvedValueOnce(deleteResponse([{ id: 'b', success: true }]));

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.bulkDelete).toHaveBeenCalledTimes(2);
    expect(repository.find).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledWith(
      'Deleted 2 legacy onboarding flow(s) without an owner'
    );
  });

  it('ignores 404 statuses, warns on other failures, and stops via the guard when only failures remain', async () => {
    const { repository, coreStart, logger } = createMocks();
    // 'a' deletes, 'b' was already deleted by a concurrent node (404), 'c' persistently
    // fails with 500 so it still matches the filter on the next iteration.
    repository.find
      .mockResolvedValueOnce(findPage(['a', 'b', 'c']))
      .mockResolvedValueOnce(findPage(['c']));
    repository.bulkDelete
      .mockResolvedValueOnce(
        deleteResponse([
          { id: 'a', success: true },
          { id: 'b', success: false, statusCode: 404 },
          { id: 'c', success: false, statusCode: 500, message: 'boom' },
        ])
      )
      .mockResolvedValueOnce(
        deleteResponse([{ id: 'c', success: false, statusCode: 500, message: 'boom' }])
      );

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.find).toHaveBeenCalledTimes(2);
    expect(repository.bulkDelete).toHaveBeenCalledTimes(2);
    // One warn per failed deletion of 'c' plus the zero-progress guard warn.
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[c]'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(logger.warn).toHaveBeenCalledWith(
      'Legacy onboarding flow cleanup made no progress, stopping'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Deleted 1 legacy onboarding flow(s) without an owner'
    );
  });

  it('continues when a concurrent node already deleted the whole batch (all 404s)', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find
      .mockResolvedValueOnce(findPage(['a', 'b']))
      .mockResolvedValueOnce(findPage(['c']))
      .mockResolvedValueOnce(findPage([]));
    repository.bulkDelete
      .mockResolvedValueOnce(
        deleteResponse([
          { id: 'a', success: false, statusCode: 404 },
          { id: 'b', success: false, statusCode: 404 },
        ])
      )
      .mockResolvedValueOnce(deleteResponse([{ id: 'c', success: true }]));

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.find).toHaveBeenCalledTimes(3);
    expect(repository.bulkDelete).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Deleted 1 legacy onboarding flow(s) without an owner'
    );
  });

  it('stops without looping when an iteration deletes nothing', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockResolvedValue(findPage(['a']));
    repository.bulkDelete.mockResolvedValue(
      deleteResponse([{ id: 'a', success: false, statusCode: 500, message: 'boom' }])
    );

    await deleteLegacyOnboardingFlows({ coreStart, logger });

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.bulkDelete).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Legacy onboarding flow cleanup made no progress, stopping'
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs and resolves when repository construction fails', async () => {
    const logger = loggerMock.create();
    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn(() => {
          throw new Error('type not registered');
        }),
      },
    } as unknown as CoreStart;

    await expect(deleteLegacyOnboardingFlows({ coreStart, logger })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('logs and resolves when find fails', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockRejectedValue(new Error('es down'));

    await expect(deleteLegacyOnboardingFlows({ coreStart, logger })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('logs and resolves when bulkDelete fails', async () => {
    const { repository, coreStart, logger } = createMocks();
    repository.find.mockResolvedValueOnce(findPage(['a']));
    repository.bulkDelete.mockRejectedValue(new Error('es down'));

    await expect(deleteLegacyOnboardingFlows({ coreStart, logger })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
