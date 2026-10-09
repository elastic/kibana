/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { useDefaultToolsFlyoutProperties } from './use_default_flyout_properties';

describe('useDefaultToolsFlyoutProperties', () => {
  it('sets a theme-aware minimum width', () => {
    const { result } = renderHook(() => ({
      properties: useDefaultToolsFlyoutProperties(),
      theme: useEuiTheme().euiTheme,
    }));

    expect(result.current.properties).toEqual({
      minWidth: result.current.theme.base * 24,
      ownFocus: false,
      paddingSize: 'm',
      resizable: true,
      size: 'm',
    });
  });
});
