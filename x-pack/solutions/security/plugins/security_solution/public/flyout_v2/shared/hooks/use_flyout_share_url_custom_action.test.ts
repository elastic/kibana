/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { copyToClipboard } from '@elastic/eui';
import {
  SHARE_ENTITY_FLYOUT_LABEL,
  useFlyoutShareUrlCustomAction,
} from './use_flyout_share_url_custom_action';
import { useToasts } from '../../../common/lib/kibana';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useToasts: jest.fn(),
}));

describe('useFlyoutShareUrlCustomAction', () => {
  const addSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess });
    (copyToClipboard as jest.Mock).mockReturnValue(true);
  });

  it('returns a share icon action', () => {
    const { result } = renderHook(() => useFlyoutShareUrlCustomAction());

    expect(result.current.iconType).toBe('share');
    expect(result.current['aria-label']).toBe(SHARE_ENTITY_FLYOUT_LABEL);
  });

  it('copies the share URL and shows a success toast', () => {
    const getShareUrl = jest.fn(() => 'https://example.test/entity');
    const { result } = renderHook(() => useFlyoutShareUrlCustomAction(getShareUrl));

    result.current.onClick();

    expect(getShareUrl).toHaveBeenCalled();
    expect(copyToClipboard).toHaveBeenCalledWith('https://example.test/entity');
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.any(String) })
    );
  });

  it('does not toast when copy fails', () => {
    (copyToClipboard as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useFlyoutShareUrlCustomAction(() => 'url'));

    result.current.onClick();

    expect(addSuccess).not.toHaveBeenCalled();
  });
});
