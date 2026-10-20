/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useTilesTimeoutNotice } from './use_tiles_timeout_notice';

jest.mock('../../../../../common/hooks/use_app_toasts', () => ({ useAppToasts: jest.fn() }));

const addWarning = jest.fn();

describe('useTilesTimeoutNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({ addWarning });
  });

  it('warns once per page load, however many tiles time out or re-render', () => {
    const { rerender } = renderHook(
      ({ timedOut, runKey }) => useTilesTimeoutNotice(timedOut, runKey),
      { initialProps: { timedOut: false, runKey: '24h:{}' } }
    );
    expect(addWarning).not.toHaveBeenCalled();
    rerender({ timedOut: true, runKey: '24h:{}' });
    rerender({ timedOut: true, runKey: '24h:{}' });
    expect(addWarning).toHaveBeenCalledTimes(1);
    expect(addWarning.mock.calls[0][0].text).toContain('90 seconds');
  });

  it('warns again for a new range or filter that times out too', () => {
    const { rerender } = renderHook(
      ({ timedOut, runKey }) => useTilesTimeoutNotice(timedOut, runKey),
      { initialProps: { timedOut: true, runKey: '24h:{}' } }
    );
    rerender({ timedOut: false, runKey: '7d:{}' });
    expect(addWarning).toHaveBeenCalledTimes(1);
    rerender({ timedOut: true, runKey: '7d:{}' });
    expect(addWarning).toHaveBeenCalledTimes(2);
  });

  it('warns again when a range that timed out comes back after a run that did not', () => {
    const { rerender } = renderHook(
      ({ timedOut, runKey }) => useTilesTimeoutNotice(timedOut, runKey),
      { initialProps: { timedOut: true, runKey: '24h:{}' } }
    );
    rerender({ timedOut: false, runKey: '7d:{}' });
    rerender({ timedOut: true, runKey: '24h:{}' });
    expect(addWarning).toHaveBeenCalledTimes(2);
  });
});
