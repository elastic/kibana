/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useSetAlertTags } from './use_set_alert_tags';
import { useAppToasts } from '../../../hooks/use_app_toasts';

vi.mock('../../../hooks/use_app_toasts');

describe('useSetAlertTags', () => {
  it('should return a function', () => {
    (useAppToasts as Mock).mockReturnValue({
      addSuccess: vi.fn(),
      addError: vi.fn(),
    });

    const { result } = renderHook(() => useSetAlertTags());

    expect(typeof result.current).toEqual('function');
  });
});
