/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, RenderHookResult } from '@testing-library/react';
import type { UseSectionsParams } from './use_sections';
import { useExpandableFlyoutState } from '../..';
import {
  useAdditionalSettingsMenuItems,
  UseAdditionalSettingsMenuItemsParams,
  UseAdditionalSettingsMenuItemsResult,
} from './use_additional_settings_menu_items';

jest.mock('../..');

const AdditionalSettingMenuItem = () => <div>{'hello'}</div>;

describe('useSections', () => {
  let hookResult: RenderHookResult<
    UseAdditionalSettingsMenuItemsResult,
    UseAdditionalSettingsMenuItemsParams
  >;

  it('should return undefined if no registeredPanels', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      right: undefined,
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [],
    };
    hookResult = renderHook((props: UseSectionsParams) => useAdditionalSettingsMenuItems(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual({
      additionalSettingsMenuItems: undefined,
    });
  });

  it('should return undefined if the right panel has no additional settings menu items', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      right: { id: 'right' },
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [
        {
          key: 'right',
          component: () => <div>{'component'}</div>,
        },
      ],
    };
    hookResult = renderHook((props: UseSectionsParams) => useAdditionalSettingsMenuItems(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual({
      additionalSettingsMenuItems: undefined,
    });
  });

  it('should return an array of settings menu items', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      right: { id: 'right' },
    });

    const initialProps: UseSectionsParams = {
      registeredPanels: [
        {
          key: 'right',
          component: () => <div>{'component'}</div>,
          additionalSettingsMenuItems: [<AdditionalSettingMenuItem />],
        },
      ],
    };
    hookResult = renderHook((props: UseSectionsParams) => useAdditionalSettingsMenuItems(props), {
      initialProps,
    });

    expect(hookResult.result.current).toEqual({
      additionalSettingsMenuItems: [<AdditionalSettingMenuItem />],
    });
  });
});
