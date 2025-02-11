/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

import { getThresholdRuleParams } from '../../rule_schema/mocks';
import {
  calculateThresholdSignalUuid,
  getSignalHistory,
  getThresholdTermsHash,
  transformBulkCreatedItemsToHits,
} from './utils';

describe('threshold utils', () => {
  describe('calcualteThresholdSignalUuid', () => {
    it('should generate a uuid without key', () => {
      const startedAt = new Date('2020-12-17T16:27:00Z');
      const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['agent.name']);
      expect(signalUuid).toEqual('a4832768-a379-583a-b1a2-e2ce2ad9e6e9');
    });

    it('should generate a uuid with key', () => {
      const startedAt = new Date('2019-11-18T13:32:00Z');
      const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['host.ip'], '1.2.3.4');
      expect(signalUuid).toEqual('ee8870dc-45ff-5e6c-a2f9-80886651ce03');
    });
  });
  describe('getSignalHistory', () => {
    const params = getThresholdRuleParams();
    const tuple = {
      from: dateMath.parse(params.from)!,
      to: dateMath.parse(params.to)!,
      maxSignals: params.maxSignals,
    };
    it('should return terms which do not fall outside of the search interval tuple', () => {
      const terms1 = [
        {
          field: 'host.name',
          value: 'elastic-pc-1',
        },
      ];
      const signalHistoryRecord1 = {
        terms: terms1,
        lastSignalTimestamp: tuple.from.valueOf() - 60 * 1000,
      };
      const terms2 = [
        {
          field: 'host.name',
          value: 'elastic-pc-2',
        },
      ];
      const signalHistoryRecord2 = {
        terms: terms2,
        lastSignalTimestamp: tuple.from.valueOf() + 60 * 1000,
      };
      const hashOne = `${getThresholdTermsHash(terms1)}`;
      const hashTwo = `${getThresholdTermsHash(terms2)}`;
      const state = {
        initialized: true,
        signalHistory: {
          [hashOne]: signalHistoryRecord1,
          [hashTwo]: signalHistoryRecord2,
        },
      };
      const validSignalHistory = getSignalHistory(state, state.signalHistory, tuple);
      expect(validSignalHistory[hashOne]).toBe(undefined);
      expect(validSignalHistory[hashTwo]).toBe(state.signalHistory[hashTwo]);
    });
  });

  describe('transformBulkCreatedItemsToHits', () => {
    it('should correctly transform bulk created items to hit', () => {
      expect(
        transformBulkCreatedItemsToHits([
          {
            _id: 'test-1',
            _index: 'logs-*',
            rule: {
              name: 'test',
            },
          },
        ] as unknown as Parameters<typeof transformBulkCreatedItemsToHits>[number])
      ).toEqual([
        {
          _id: 'test-1',
          _index: 'logs-*',
          _source: {
            rule: {
              name: 'test',
            },
          },
        },
      ]);
    });
  });
});
