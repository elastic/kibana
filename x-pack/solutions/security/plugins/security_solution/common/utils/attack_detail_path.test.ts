/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAttackDetailPath } from './attack_detail_path';
import { ATTACK_DETAILS_REDIRECT_PATH } from '../constants';

describe('buildAttackDetailPath', () => {
  it('builds path with timestamp', () => {
    const result = buildAttackDetailPath({
      attackId: 'test-id',
      index: 'test-index',
      timestamp: '2023-01-01T00:00:00.000Z',
    });
    expect(result).toBe(
      `${ATTACK_DETAILS_REDIRECT_PATH}/test-id?index=test-index&timestamp=${encodeURIComponent(
        '2023-01-01T00:00:00.000Z'
      )}`
    );
  });

  it('builds path without timestamp', () => {
    const result = buildAttackDetailPath({
      attackId: 'test-id',
      index: 'test-index',
    });
    expect(result).toBe(`${ATTACK_DETAILS_REDIRECT_PATH}/test-id?index=test-index`);
  });

  it('encodes parameters correctly', () => {
    const result = buildAttackDetailPath({
      attackId: 'test/id',
      index: 'test index,another',
      timestamp: '2023-01-01T00:00:00.000Z',
    });
    expect(result).toBe(
      `${ATTACK_DETAILS_REDIRECT_PATH}/${encodeURIComponent('test/id')}?index=${encodeURIComponent(
        'test index,another'
      )}&timestamp=${encodeURIComponent('2023-01-01T00:00:00.000Z')}`
    );
  });
});
