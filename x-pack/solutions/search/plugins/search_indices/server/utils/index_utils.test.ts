/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isClosed, isHidden } from './index_utils';

describe('index utils', function () {
  describe('isClosed', function () {
    it('handles boolean values', () => {
      expect(
        isClosed({
          settings: {
            index: {
              verified_before_close: true,
            },
          },
        })
      ).toBe(true);
      expect(
        isClosed({
          settings: {
            index: {
              verified_before_close: false,
            },
          },
        })
      ).toBe(false);
    });
    it('handles string values', () => {
      expect(
        isClosed({
          settings: {
            index: {
              verified_before_close: 'true',
            },
          },
        })
      ).toBe(true);
      expect(
        isClosed({
          settings: {
            index: {
              verified_before_close: 'false',
            },
          },
        })
      ).toBe(false);
    });
    it('handles undefined index settings', () => {
      expect(
        isClosed({
          settings: {},
        })
      ).toBe(false);
    });
  });
  describe('isHidden', function () {
    it('handles boolean values', () => {
      expect(
        isHidden({
          settings: {
            index: {
              hidden: true,
            },
          },
        })
      ).toBe(true);
      expect(
        isHidden({
          settings: {
            index: {
              hidden: false,
            },
          },
        })
      ).toBe(false);
    });
    it('handles string values', () => {
      expect(
        isHidden({
          settings: {
            index: {
              hidden: 'true',
            },
          },
        })
      ).toBe(true);
      expect(
        isHidden({
          settings: {
            index: {
              hidden: 'false',
            },
          },
        })
      ).toBe(false);
    });
    it('handles undefined index settings', () => {
      expect(
        isHidden({
          settings: {},
        })
      ).toBe(false);
    });
  });
});
