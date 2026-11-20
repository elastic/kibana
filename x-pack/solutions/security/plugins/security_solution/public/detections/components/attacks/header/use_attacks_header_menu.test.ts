/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AppMenuRunActionParams } from '@kbn/app-menu';
import {
  GENERATIONS_MENU_ITEM_TEST_ID,
  RUN_MENU_ITEM_TEST_ID,
  SCHEDULE_MENU_ITEM_TEST_ID,
  useAttacksHeaderMenu,
} from './use_attacks_header_menu';
import {
  DISABLED_TOOLTIP,
  RUN_TOOLTIP,
} from '../../../../attack_discovery/pages/header/run/translations';
import { SETTINGS_TOOLTIP } from '../../../../attack_discovery/pages/header/settings/translations';
import {
  SCHEDULE_TAB_ID,
  SETTINGS_TAB_ID,
} from '../../../../attack_discovery/pages/settings_flyout/constants';

const runParams: AppMenuRunActionParams = {
  triggerElement: document.createElement('button'),
  returnFocus: jest.fn(),
};

describe('useAttacksHeaderMenu', () => {
  const onGenerate = jest.fn().mockResolvedValue(undefined);
  const openFlyout = jest.fn();
  const openControlCenter = jest.fn();

  const renderMenu = ({
    isLoading = false,
    isRunDisabled = false,
  }: { isLoading?: boolean; isRunDisabled?: boolean } = {}) =>
    renderHook(() =>
      useAttacksHeaderMenu({
        isLoading,
        isRunDisabled,
        onGenerate,
        openFlyout,
        openControlCenter,
      })
    ).result.current;

  const getItem = (menu: ReturnType<typeof renderMenu>, testId: string) =>
    menu.items?.find((item) => item.testId === testId);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Generations and Schedule inline, with Run and Settings as the split primary action', () => {
    const menu = renderMenu();

    expect(menu.items?.map(({ testId }) => testId)).toEqual([
      GENERATIONS_MENU_ITEM_TEST_ID,
      SCHEDULE_MENU_ITEM_TEST_ID,
    ]);
    expect(menu.primaryActionItem).toEqual(
      expect.objectContaining({ id: 'run', testId: RUN_MENU_ITEM_TEST_ID })
    );
    expect(menu.primaryActionItem?.splitButtonProps?.secondaryButtonIconType).toBe('indexSettings');
  });

  it('calls the matching callback for each item', () => {
    const menu = renderMenu();

    getItem(menu, GENERATIONS_MENU_ITEM_TEST_ID)?.run?.(runParams);
    expect(openControlCenter).toHaveBeenCalledTimes(1);

    getItem(menu, SCHEDULE_MENU_ITEM_TEST_ID)?.run?.(runParams);
    expect(openFlyout).toHaveBeenCalledWith(SCHEDULE_TAB_ID);

    menu.primaryActionItem?.run?.(runParams);
    expect(onGenerate).toHaveBeenCalledTimes(1);

    menu.primaryActionItem?.splitButtonProps?.run?.(runParams);
    expect(openFlyout).toHaveBeenCalledWith(SETTINGS_TAB_ID);
  });

  it('enables every action and shows the run tooltip by default', () => {
    const menu = renderMenu();

    expect(menu.primaryActionItem?.splitButtonProps?.isMainButtonDisabled).toBe(false);
    expect(menu.primaryActionItem?.splitButtonProps?.isSecondaryButtonDisabled).toBe(false);
    expect(menu.primaryActionItem?.tooltipContent).toBe(RUN_TOOLTIP);
    expect(menu.primaryActionItem?.splitButtonProps?.secondaryButtonTooltipContent).toBe(
      SETTINGS_TOOLTIP
    );
    expect(getItem(menu, SCHEDULE_MENU_ITEM_TEST_ID)?.disableButton).toBe(false);
  });

  it('disables Run, Settings and Schedule while loading', () => {
    const menu = renderMenu({ isLoading: true });

    expect(getItem(menu, GENERATIONS_MENU_ITEM_TEST_ID)?.disableButton).toBeUndefined();
    expect(menu.primaryActionItem?.splitButtonProps?.isMainButtonDisabled).toBe(true);
    expect(menu.primaryActionItem?.splitButtonProps?.isSecondaryButtonDisabled).toBe(true);
    expect(getItem(menu, SCHEDULE_MENU_ITEM_TEST_ID)?.disableButton).toBe(true);
  });

  it('disables only Run and keeps Settings reachable when running is blocked', () => {
    const menu = renderMenu({ isRunDisabled: true });

    expect(menu.primaryActionItem?.splitButtonProps?.isMainButtonDisabled).toBe(true);
    expect(menu.primaryActionItem?.splitButtonProps?.isSecondaryButtonDisabled).toBe(false);
    expect(menu.primaryActionItem?.tooltipContent).toBe(DISABLED_TOOLTIP);
    expect(getItem(menu, SCHEDULE_MENU_ITEM_TEST_ID)?.disableButton).toBe(false);
  });
});
