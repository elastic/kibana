/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enterpriseLicenseMiddleware } from './enterprise_license';

describe('enterpriseLicenseMiddleware', () => {
  let mockCtx: {
    licensing: Promise<{ license: { hasAtLeast: jest.Mock } }>;
  };
  let mockReq: unknown;
  let mockRes: {
    forbidden: jest.Mock;
  };
  let hasAtLeast: jest.Mock;

  beforeEach(() => {
    hasAtLeast = jest.fn();
    mockCtx = {
      licensing: Promise.resolve({
        license: { hasAtLeast },
      }),
    };
    mockReq = {};
    mockRes = {
      forbidden: jest.fn(({ body }) => ({
        status: 403,
        payload: body,
      })),
    };
  });

  it('returns undefined when license is enterprise', async () => {
    hasAtLeast.mockReturnValue(true);
    const result = await enterpriseLicenseMiddleware(
      mockCtx as never,
      mockReq as never,
      mockRes as never
    );
    expect(hasAtLeast).toHaveBeenCalledWith('enterprise');
    expect(result).toBeUndefined();
    expect(mockRes.forbidden).not.toHaveBeenCalled();
  });

  it('returns undefined for trial license (trial satisfies enterprise)', async () => {
    hasAtLeast.mockReturnValue(true);
    const result = await enterpriseLicenseMiddleware(
      mockCtx as never,
      mockReq as never,
      mockRes as never
    );
    expect(hasAtLeast).toHaveBeenCalledWith('enterprise');
    expect(result).toBeUndefined();
    expect(mockRes.forbidden).not.toHaveBeenCalled();
  });

  it.each(['platinum', 'gold', 'basic'] as const)(
    'returns 403 when license is below enterprise (%s)',
    async () => {
      hasAtLeast.mockReturnValue(false);
      const result = await enterpriseLicenseMiddleware(
        mockCtx as never,
        mockReq as never,
        mockRes as never
      );

      expect(hasAtLeast).toHaveBeenCalledWith('enterprise');
      expect(mockRes.forbidden).toHaveBeenCalledWith({
        body: {
          message: 'Entity Resolution requires an Enterprise license',
        },
      });
      expect(result).toEqual({
        status: 403,
        payload: {
          message: 'Entity Resolution requires an Enterprise license',
        },
      });
    }
  );
});
