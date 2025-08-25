/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOByServiceName } from './suggestion';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';

jest.mock('../../../common', () => ({
  sloPaths: {
    sloDetailsHistory: jest.fn().mockReturnValue('/mock/slo/path'),
  },
}));

const createCoreStartMock = (hits: Record<string, unknown>[] = []): CoreStart =>
  ({
    elasticsearch: {
      client: {
        asScoped: jest.fn().mockReturnValue({
          asCurrentUser: {
            search: jest.fn().mockResolvedValue({ hits: { hits } }),
          },
        }),
      },
    },
  } as unknown as CoreStart);

const loggerMock = { debug: jest.fn() } as unknown as Logger;

describe('getSLOByServiceName', () => {
  test('returns empty suggestions when service.name is missing', async () => {
    const coreStart = createCoreStartMock();
    const handler = getSLOByServiceName(coreStart, loggerMock).handlers.searchSLOByServiceName
      .handler;

    const res = await handler({
      context: {},
      request: {} as KibanaRequest,
    });

    expect(res).toEqual({ suggestions: [] });
  });

  test('builds a suggestion for each returned SLO', async () => {
    const coreStart = createCoreStartMock([
      {
        _source: {
          slo: {
            id: 'slo-1',
            instanceId: 'inst-1',
            name: 'Latency SLO',
            groupings: { service: { name: 'synth-service-0' } },
          },
          status: 'DEGRADING',
        },
      },
      {
        _source: {
          slo: {
            id: 'slo-2',
            instanceId: 'inst-2',
            name: 'Another SLO',
            groupings: { service: { name: 'synth-service-1' } },
          },
          status: 'VIOLATED',
        },
      },
    ]);

    const handler = getSLOByServiceName(coreStart, loggerMock).handlers.searchSLOByServiceName
      .handler;

    const res = await handler({
      context: { 'service.name': ['synth-service-0', 'synth-service-1'] },
      request: {} as KibanaRequest,
    });

    expect(res.suggestions).toHaveLength(2);
    expect(res.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'slo-1-inst-1',
          componentId: 'slo',
          data: [
            {
              description: 'SLO "Latency SLO" is DEGRADING for the service "synth-service-0"',
              payload: { id: 'slo-1', instanceId: 'inst-1' },
              attachment: expect.objectContaining({
                type: 'persistableState',
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: expect.objectContaining({
                  type: 'slo_history',
                  url: expect.objectContaining({
                    pathAndQuery: '/mock/slo/path',
                    label: 'Latency SLO',
                  }),
                }),
              }),
            },
          ],
        }),
        expect.objectContaining({
          id: 'slo-2-inst-2',
          componentId: 'slo',
          data: [
            expect.objectContaining({
              description: 'SLO "Another SLO" is VIOLATED for the service "synth-service-1"',
              payload: { id: 'slo-2', instanceId: 'inst-2' },
              attachment: expect.objectContaining({
                type: 'persistableState',
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: expect.objectContaining({
                  type: 'slo_history',
                  url: expect.objectContaining({
                    pathAndQuery: '/mock/slo/path',
                    label: 'Another SLO',
                  }),
                }),
              }),
            }),
          ],
        }),
      ])
    );
  });
});
