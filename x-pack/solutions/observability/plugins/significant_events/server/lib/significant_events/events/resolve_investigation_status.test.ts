/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import { resolveInvestigationStatuses } from './resolve_investigation_status';

const request = httpServerMock.createKibanaRequest();

const withList = (list: jest.Mock) =>
  ({
    getInvestigationsClient: jest.fn().mockReturnValue({ list }),
  } as unknown as Pick<AgenticInvestigationsPluginStart, 'getInvestigationsClient'>);

describe('resolveInvestigationStatuses', () => {
  it('reports pending while in progress, complete otherwise, and omits unknown ids', async () => {
    const list = jest.fn().mockResolvedValue({
      results: [
        { id: 'inv-running', in_progress: true },
        { id: 'inv-done', in_progress: false },
      ],
    });

    await expect(
      resolveInvestigationStatuses({
        agenticInvestigations: withList(list),
        request,
        investigationIds: ['inv-running', 'inv-done', 'legacy-execution', 'inv-done', ''],
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toEqual({ 'inv-running': 'pending', 'inv-done': 'complete' });

    expect(list).toHaveBeenCalledWith({
      id: ['inv-running', 'inv-done', 'legacy-execution'],
      per_page: 3,
    });
  });

  it('reads at most a hundred ids per call', async () => {
    const list = jest.fn().mockResolvedValue({ results: [] });
    const ids = Array.from({ length: 150 }, (_, index) => `inv-${index}`);

    await resolveInvestigationStatuses({
      agenticInvestigations: withList(list),
      request,
      investigationIds: ids,
      logger: loggingSystemMock.createLogger(),
    });

    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][0]).toEqual({ id: ids.slice(100), per_page: 50 });
  });

  it('reports unavailable when the read fails', async () => {
    const list = jest.fn().mockRejectedValue(new Error('forbidden'));

    await expect(
      resolveInvestigationStatuses({
        agenticInvestigations: withList(list),
        request,
        investigationIds: ['inv-1'],
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toEqual({ 'inv-1': 'unavailable' });
  });

  it('reports unavailable without agentic investigations', async () => {
    await expect(
      resolveInvestigationStatuses({
        request,
        investigationIds: ['inv-1'],
        logger: loggingSystemMock.createLogger(),
      })
    ).resolves.toEqual({ 'inv-1': 'unavailable' });
  });
});
