/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { decode } from '@kbn/rison';
import { encodeGlobalTimerangeUrlParam, getGlobalTimerange } from './global_timerange_url_param';

describe('global_timerange_url_param', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getGlobalTimerange', () => {
    it('returns a relative range resolved against the current time for date-math bounds', () => {
      expect(getGlobalTimerange({ from: 'now-30d', to: 'now' })).toEqual({
        kind: 'relative',
        fromStr: 'now-30d',
        toStr: 'now',
        from: '2026-09-22T12:00:00.000Z',
        to: '2026-10-22T12:00:00.000Z',
      });
    });

    it('rounds the upper bound up', () => {
      expect(getGlobalTimerange({ from: 'now/d', to: 'now/d' })).toEqual(
        expect.objectContaining({
          from: moment().startOf('day').toISOString(),
          to: moment().endOf('day').toISOString(),
        })
      );
    });

    it('returns a relative range when only one bound is date math', () => {
      expect(getGlobalTimerange({ from: '2026-10-01T00:00:00.000Z', to: 'now' })).toEqual({
        kind: 'relative',
        fromStr: '2026-10-01T00:00:00.000Z',
        toStr: 'now',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-22T12:00:00.000Z',
      });
    });

    it('returns an absolute range for absolute bounds', () => {
      expect(
        getGlobalTimerange({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z' })
      ).toEqual({
        kind: 'absolute',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-02T00:00:00.000Z',
      });
    });
  });

  describe('encodeGlobalTimerangeUrlParam', () => {
    it('encodes the range under the global timerange key', () => {
      expect(decode(encodeGlobalTimerangeUrlParam({ from: 'now-7d', to: 'now' }))).toEqual({
        global: {
          timerange: {
            kind: 'relative',
            fromStr: 'now-7d',
            toStr: 'now',
            from: '2026-10-15T12:00:00.000Z',
            to: '2026-10-22T12:00:00.000Z',
          },
        },
      });
    });
  });
});
