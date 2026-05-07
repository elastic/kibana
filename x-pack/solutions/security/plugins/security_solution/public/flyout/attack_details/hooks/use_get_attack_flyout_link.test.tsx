/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ATTACK_DETAILS_REDIRECT_PATH } from '../../../../common/constants';
import { useGetAttackFlyoutLink } from './use_get_attack_flyout_link';

jest.mock('../../../common/lib/kibana/hooks', () => ({
  useAppUrl: () => ({
    getAppUrl: ({ path }: { path: string }) => path,
  }),
}));

const attackId = 'attack-1';
const indexName = 'indexName';
const timestamp = '2024-01-01T00:00:00.000Z';

describe('useGetAttackFlyoutLink', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost' },
      writable: true,
    });
  });

  it('returns absolute url when data is valid', () => {
    const { result } = renderHook(() =>
      useGetAttackFlyoutLink({
        attackId,
        indexName,
        timestamp,
      })
    );

    const path = `${ATTACK_DETAILS_REDIRECT_PATH}/${attackId}?index=${indexName}&timestamp=${timestamp}`;
    expect(result.current).toBe(`http://localhost${path}`);
  });

  it('returns null when timestamp is missing', () => {
    const { result } = renderHook(() =>
      useGetAttackFlyoutLink({
        attackId,
        indexName,
        timestamp: undefined,
      })
    );
    expect(result.current).toBeNull();
  });
});
