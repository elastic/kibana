/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../common/step_types/package_report';
import { adoptInvestigationsAiIndex } from './adopt_investigations_ai_index';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const stub = {
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

const notFound = () => Object.assign(new Error('missing'), { name: 'AiIndexNotFoundError' });

describe('adoptInvestigationsAiIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves an already managed index in place', async () => {
    const service = {
      get: jest.fn().mockResolvedValue(managed),
      delete: jest.fn(),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(service.get).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith('security-investigations', 'default');
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('removes each unconfigured duplicate so the next read can create the managed index', async () => {
    const service = {
      get: jest
        .fn()
        .mockResolvedValueOnce(stub)
        .mockResolvedValueOnce(stub)
        .mockResolvedValueOnce(managed),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(service.delete).toHaveBeenCalledTimes(2);
    expect(service.delete).toHaveBeenCalledWith('security-investigations', 'default');
    expect(service.get).toHaveBeenCalledTimes(3);
  });

  it('does not remove a configured user-owned index', async () => {
    const service = {
      get: jest.fn().mockResolvedValue({
        ...stub,
        description: 'My investigations',
        sources: [{ type: 'index', value: 'logs-*' }],
      }),
      delete: jest.fn(),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(service.delete).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('configured user-owned'));
  });

  it('does not remove an unconfigured index that points at a different dest', async () => {
    const service = {
      get: jest.fn().mockResolvedValue({
        ...stub,
        dest: { type: 'data_stream', value: 'ai-index-ds-security-investigations' },
      }),
      delete: jest.fn(),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(service.delete).not.toHaveBeenCalled();
  });

  it('stops when the index is already absent', async () => {
    const service = {
      get: jest.fn().mockRejectedValue(notFound()),
      delete: jest.fn(),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['default'],
      logger,
    });

    expect(service.delete).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('continues with the next space when one space fails', async () => {
    const service = {
      get: jest.fn().mockImplementation(async (_id: string, spaceId: string) => {
        if (spaceId === 'broken') {
          throw new Error('cluster unavailable');
        }
        return managed;
      }),
      delete: jest.fn(),
    };

    await adoptInvestigationsAiIndex({
      getAiIndexService: () => service,
      listSpaceIds: async () => ['broken', 'default'],
      logger,
    });

    expect(service.get).toHaveBeenCalledWith('security-investigations', 'default');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });
});
