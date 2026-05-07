/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { updateSyntheticsMonitorBulkRoute } from './update_monitor_bulk';

describe('updateSyntheticsMonitorBulkRoute', () => {
  const route = updateSyntheticsMonitorBulkRoute();

  it('uses PATCH on the bulk update path', () => {
    expect(route.method).toBe('PATCH');
    expect(route.path).toBe(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_UPDATE);
  });

  describe('body schema', () => {
    const bodySchema = (route.validation as { request: { body: Type<unknown> } }).request.body;

    it('accepts a non-empty ids array and an attributes object', () => {
      expect(() =>
        bodySchema.validate({
          ids: ['monitor-id-1', 'monitor-id-2'],
          attributes: { enabled: false },
        })
      ).not.toThrow();
    });

    it('allows unknown keys inside attributes (treated as Partial<Monitor>)', () => {
      expect(() =>
        bodySchema.validate({
          ids: ['monitor-id-1'],
          attributes: { enabled: false, tags: ['critical'], schedule: { number: '5', unit: 'm' } },
        })
      ).not.toThrow();
    });

    it('rejects an empty ids array', () => {
      expect(() => bodySchema.validate({ ids: [], attributes: {} })).toThrow(
        /array size is \[0\], but cannot be smaller than \[1\]/
      );
    });

    it('rejects a missing ids field', () => {
      expect(() => bodySchema.validate({ attributes: {} })).toThrow(
        /\[ids\]: expected value of type \[array\] but got \[undefined\]/
      );
    });

    it('treats a missing attributes field as an empty patch (config-schema defaults empty object schemas)', () => {
      // A semantically empty patch is a runtime concern — the route handler in
      // step 3 is responsible for short-circuiting on it. The HTTP schema
      // layer just normalises the input.
      const value = bodySchema.validate({ ids: ['monitor-id-1'] }) as {
        ids: string[];
        attributes: Record<string, unknown>;
      };
      expect(value.attributes).toEqual({});
    });

    it('rejects non-string ids', () => {
      expect(() =>
        bodySchema.validate({ ids: [1, 2, 3], attributes: {} })
      ).toThrow(/\[ids\.0\]: expected value of type \[string\]/);
    });
  });

  describe('placeholder handler', () => {
    it('returns 501 Not Implemented in step 1', async () => {
      const customError = jest.fn();
      const result = await route.handler({
        // Only `response` is consulted by the placeholder; the rest of the
        // RouteContext is unused, so a partial mock is fine.
        response: { customError } as never,
      } as never);

      expect(customError).toHaveBeenCalledWith({
        statusCode: 501,
        body: { message: 'Bulk update endpoint not implemented yet' },
      });
      // The mock returns undefined; the handler returns whatever customError returned.
      expect(result).toBeUndefined();
    });
  });
});
