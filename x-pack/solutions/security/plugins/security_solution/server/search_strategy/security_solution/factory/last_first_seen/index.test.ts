/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ZodError } from '@kbn/zod';

import { Direction } from '../../../../../common/search_strategy';
import * as buildQuery from './query.first_or_last_seen.dsl';
import { firstOrLastSeen } from '.';
import {
  mockOptions,
  mockSearchStrategyFirstSeenResponse,
  mockSearchStrategyLastSeenResponse,
  formattedSearchStrategyLastResponse,
  formattedSearchStrategyFirstResponse,
} from './__mocks__';
import type { FirstLastSeenRequestOptionsInput } from '../../../../../common/api/search_strategy';

describe('firstLastSeen search strategy', () => {
  describe('first seen search strategy', () => {
    const buildFirstLastSeenQuery = jest.spyOn(buildQuery, 'buildFirstOrLastSeenQuery');

    afterEach(() => {
      buildFirstLastSeenQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        firstOrLastSeen.buildDsl(mockOptions);
        expect(buildFirstLastSeenQuery).toHaveBeenCalledWith(mockOptions);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await firstOrLastSeen.parse(
          mockOptions,
          mockSearchStrategyFirstSeenResponse
        );
        expect(result).toMatchObject(formattedSearchStrategyFirstResponse);
      });
    });
  });

  describe('last seen search strategy', () => {
    const buildFirstLastSeenQuery = jest.spyOn(buildQuery, 'buildFirstOrLastSeenQuery');

    afterEach(() => {
      buildFirstLastSeenQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        const options: FirstLastSeenRequestOptionsInput = { ...mockOptions, order: Direction.desc };
        firstOrLastSeen.buildDsl(options);
        expect(buildFirstLastSeenQuery).toHaveBeenCalledWith(options);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await firstOrLastSeen.parse(
          { ...mockOptions, order: Direction.desc },
          mockSearchStrategyLastSeenResponse
        );
        expect(result).toMatchObject(formattedSearchStrategyLastResponse);
      });

      test('should throw an error when parse fails', async () => {
        try {
          await firstOrLastSeen.parse(
            { invalidOption: 'key' } as unknown as FirstLastSeenRequestOptionsInput,
            mockSearchStrategyLastSeenResponse
          );
        } catch (error: unknown) {
          if (!(error instanceof ZodError)) {
            throw error;
          }

          expect(error).not.toBeUndefined();
          expect(error.flatten()).toMatchInlineSnapshot(`
            Object {
              "fieldErrors": Object {
                "factoryQueryType": Array [
                  "Invalid literal value, expected \\"firstlastseen\\"",
                ],
                "field": Array [
                  "Required",
                ],
                "order": Array [
                  "Required",
                ],
                "value": Array [
                  "Required",
                ],
              },
              "formErrors": Array [],
            }
          `);
        }

        expect.assertions(2);
      });
    });
  });
});
