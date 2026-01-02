/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldNotLoadCharts } from './use_hosts_view';

describe('shouldNotLoadCharts', () => {
  describe('when error is present', () => {
    it('should return true when error is a string', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: 'Some error',
          hostNodesLength: 5,
        })
      ).toBe(true);
    });

    it('should return true when error is an Error object', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: new Error('API error'),
          hostNodesLength: 5,
        })
      ).toBe(true);
    });

    it('should return true when error is an object', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: { message: 'Error occurred' },
          hostNodesLength: 5,
        })
      ).toBe(true);
    });

    it('should return true when error is present even if loading is true', () => {
      expect(
        shouldNotLoadCharts({
          loading: true,
          error: 'Error',
          hostNodesLength: 5,
        })
      ).toBe(true);
    });

    it('should return true when error is present even if hostNodesLength is 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: 'Error',
          hostNodesLength: 0,
        })
      ).toBe(true);
    });
  });

  describe('when error is falsy', () => {
    it('should return true when not loading and hostNodesLength is 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: null,
          hostNodesLength: 0,
        })
      ).toBe(true);
    });

    it('should return true when not loading and hostNodesLength is 0 (error is undefined)', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: undefined,
          hostNodesLength: 0,
        })
      ).toBe(true);
    });

    it('should return false when loading and hostNodesLength is 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: true,
          error: null,
          hostNodesLength: 0,
        })
      ).toBe(false);
    });

    it('should return false when not loading and hostNodesLength is greater than 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: null,
          hostNodesLength: 1,
        })
      ).toBe(false);
    });

    it('should return false when not loading and hostNodesLength is greater than 0 (multiple hosts)', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: null,
          hostNodesLength: 10,
        })
      ).toBe(false);
    });

    it('should return false when loading and hostNodesLength is greater than 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: true,
          error: null,
          hostNodesLength: 5,
        })
      ).toBe(false);
    });

    it('should return true when error is empty string, not loading, and hostNodesLength is 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: '',
          hostNodesLength: 0,
        })
      ).toBe(true);
    });

    it('should return false when error is empty string and hostNodesLength is greater than 0', () => {
      expect(
        shouldNotLoadCharts({
          loading: false,
          error: '',
          hostNodesLength: 5,
        })
      ).toBe(false);
    });
  });
});
