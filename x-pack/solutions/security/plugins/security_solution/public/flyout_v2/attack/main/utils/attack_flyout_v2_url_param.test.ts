/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode } from '@kbn/rison';
import {
  ATTACK_FLYOUT_V2_URL_PARAM,
  decodeAttackFlyoutV2UrlParam,
  encodeAttackFlyoutV2UrlParam,
} from './attack_flyout_v2_url_param';

describe('attack_flyout_v2_url_param', () => {
  it('exposes a stable URL param key', () => {
    expect(ATTACK_FLYOUT_V2_URL_PARAM).toBe('attackFlyoutV2');
  });

  describe('encodeAttackFlyoutV2UrlParam', () => {
    it('returns a rison-encoded object with attackId and indexName', () => {
      const encoded = encodeAttackFlyoutV2UrlParam({
        attackId: 'attack-1',
        indexName: 'my-index',
      });
      expect(decode(encoded)).toEqual({ attackId: 'attack-1', indexName: 'my-index' });
    });
  });

  describe('decodeAttackFlyoutV2UrlParam', () => {
    it('decodes a valid value', () => {
      const encoded = encode({ attackId: 'attack-1', indexName: 'my-index' });
      expect(decodeAttackFlyoutV2UrlParam(encoded)).toEqual({
        attackId: 'attack-1',
        indexName: 'my-index',
      });
    });

    it('defaults indexName to empty string when missing', () => {
      const encoded = encode({ attackId: 'attack-1' });
      expect(decodeAttackFlyoutV2UrlParam(encoded)).toEqual({
        attackId: 'attack-1',
        indexName: '',
      });
    });

    it('returns null for null or empty input', () => {
      expect(decodeAttackFlyoutV2UrlParam(null)).toBeNull();
      expect(decodeAttackFlyoutV2UrlParam(undefined)).toBeNull();
      expect(decodeAttackFlyoutV2UrlParam('')).toBeNull();
    });

    it('returns null when attackId is missing or empty', () => {
      expect(decodeAttackFlyoutV2UrlParam(encode({ indexName: 'idx' }))).toBeNull();
      expect(decodeAttackFlyoutV2UrlParam(encode({ attackId: '', indexName: 'idx' }))).toBeNull();
    });

    it('returns null for malformed rison input', () => {
      expect(decodeAttackFlyoutV2UrlParam('not-rison@')).toBeNull();
    });
  });
});
