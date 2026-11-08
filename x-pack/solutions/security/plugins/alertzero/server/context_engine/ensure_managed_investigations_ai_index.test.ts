/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../common/step_types/package_report';
import { ensureManagedInvestigationsAiIndex } from './ensure_managed_investigations_ai_index';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const stub = {
  id: 'security-investigations',
  managed: false,
  dest: HUNT_COVERAGE_AI_INDEX_DEST,
  automations: [],
  sources: [],
  traces: [],
};

const managed = {
  ...stub,
  managed: true,
  description: 'Security knowledge indicators',
};

describe('ensureManagedInvestigationsAiIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves a space that already has the managed index', async () => {
    const aiIndexService = {
      list: jest.fn().mockResolvedValue([managed]),
      delete: jest.fn(),
      get: jest.fn(),
    };

    await ensureManagedInvestigationsAiIndex({
      aiIndexService,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(aiIndexService.delete).not.toHaveBeenCalled();
    expect(aiIndexService.get).not.toHaveBeenCalled();
  });

  it('deletes each unconfigured duplicate and then reads the managed index into place', async () => {
    const aiIndexService = {
      list: jest.fn().mockResolvedValue([stub, stub]),
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(managed),
    };

    await ensureManagedInvestigationsAiIndex({
      aiIndexService,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(aiIndexService.delete).toHaveBeenCalledTimes(2);
    expect(aiIndexService.delete).toHaveBeenCalledWith('security-investigations', 'default');
    expect(aiIndexService.get).toHaveBeenCalledWith('security-investigations', 'default');
  });

  it('does not delete a configured user-owned index', async () => {
    const aiIndexService = {
      list: jest.fn().mockResolvedValue([
        {
          ...stub,
          description: 'My investigations',
          sources: [{ type: 'index', value: 'logs-*' }],
        },
      ]),
      delete: jest.fn(),
      get: jest.fn(),
    };

    await ensureManagedInvestigationsAiIndex({
      aiIndexService,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(aiIndexService.delete).not.toHaveBeenCalled();
    expect(aiIndexService.get).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('configured user-owned'));
  });

  it('continues with the next space when one space fails', async () => {
    const aiIndexService = {
      list: jest.fn().mockImplementation(async (spaceId: string) => {
        if (spaceId === 'broken') {
          throw new Error('cluster unavailable');
        }
        return [managed];
      }),
      delete: jest.fn(),
      get: jest.fn(),
    };

    await ensureManagedInvestigationsAiIndex({
      aiIndexService,
      listSpaceIds: async () => ['broken', 'default'],
      logger,
    });

    expect(aiIndexService.list).toHaveBeenCalledWith('default');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });
});
