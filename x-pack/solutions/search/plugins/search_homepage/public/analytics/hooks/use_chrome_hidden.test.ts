/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { hasSeenData } from '@kbn/search-shared-ui';
import { useKibana } from '../../hooks/use_kibana';
import { useChromeHidden } from './use_chrome_hidden';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

describe('useChromeHidden', () => {
  const setChromeHidden = jest.fn();
  const reportHasData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (useKibana as jest.Mock).mockReturnValue({ services: { reportHasData, setChromeHidden } });
  });

  it('leaves the chrome as it is until the answer is known', () => {
    renderHook(() => useChromeHidden(undefined));

    expect(setChromeHidden).not.toHaveBeenCalled();
    expect(hasSeenData()).toBe(false);
  });

  it('hides the chrome for an empty deployment and shows it once data arrives', () => {
    const { rerender } = renderHook(
      ({ isHidden }: { isHidden: boolean | undefined }) => useChromeHidden(isHidden),
      { initialProps: { isHidden: true } }
    );
    expect(setChromeHidden).toHaveBeenLastCalledWith(true);
    expect(reportHasData).toHaveBeenLastCalledWith(false);
    expect(hasSeenData()).toBe(false);

    rerender({ isHidden: false });

    expect(setChromeHidden).toHaveBeenLastCalledWith(false);
    expect(reportHasData).toHaveBeenLastCalledWith(true);
    expect(hasSeenData()).toBe(true);
  });

  it('forgets the data when the deployment is empty again', () => {
    const { rerender } = renderHook(({ isHidden }) => useChromeHidden(isHidden), {
      initialProps: { isHidden: false },
    });

    rerender({ isHidden: true });

    expect(hasSeenData()).toBe(false);
  });
});
