/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nightshiftInvestigationsRouteRepository } from '.';

const endpoint = 'POST /internal/nightshift/investigations/_status' as const;
const { handler, params } = nightshiftInvestigationsRouteRepository[endpoint];
const mockRequest = {} as KibanaRequest;

describe('bulkGetInvestigationStatusesRoute', () => {
  it('validates the request body', () => {
    expect(params.safeParse({ body: { investigation_ids: ['inv-1', 'inv-2'] } }).success).toBe(
      true
    );
    expect(params.safeParse({ body: {} }).success).toBe(false);
    expect(
      params.safeParse({
        body: {
          investigation_ids: Array.from({ length: 1001 }, (_, i) => `inv-${i}`),
        },
      }).success
    ).toBe(false);
  });

  it('calls getStatuses and returns the statuses map', async () => {
    const getStatuses = jest.fn().mockResolvedValue({
      'inv-1': 'completed',
      'inv-2': 'running',
    });

    const result = await handler({
      request: mockRequest,
      params: { body: { investigation_ids: ['inv-1', 'inv-2'] } },
      getInvestigationsClient: jest.fn().mockReturnValue({ getStatuses }),
    } as never);

    expect(getStatuses).toHaveBeenCalledWith(['inv-1', 'inv-2']);
    expect(result).toEqual({
      statuses: {
        'inv-1': 'completed',
        'inv-2': 'running',
      },
    });
  });
});
