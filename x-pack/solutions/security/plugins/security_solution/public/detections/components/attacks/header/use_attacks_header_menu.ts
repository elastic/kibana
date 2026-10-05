/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { SettingsOverrideOptions } from '../../../../attack_discovery/pages/results/history/types';
import {
  SCHEDULE_TAB_ID,
  SETTINGS_TAB_ID,
} from '../../../../attack_discovery/pages/settings_flyout/constants';
import * as runI18n from '../../../../attack_discovery/pages/header/run/translations';
import * as scheduleI18n from '../../../../attack_discovery/pages/header/schedule/translations';
import * as settingsI18n from '../../../../attack_discovery/pages/header/settings/translations';
import { GENERATIONS_BUTTON } from '../generations_control_center/translations';

export const GENERATIONS_MENU_ITEM_TEST_ID = 'attacks-page-generations-button';
export const RUN_MENU_ITEM_TEST_ID = 'run';
export const SETTINGS_MENU_ITEM_TEST_ID = 'settings';
export const SCHEDULE_MENU_ITEM_TEST_ID = 'schedule';

interface UseAttacksHeaderMenuParams {
  /** Whether attack discovery generation is in progress */
  isLoading: boolean;
  /** Whether running a generation is blocked, e.g. no connector is selected */
  isRunDisabled: boolean;
  /** Runs an ad-hoc attack discovery generation */
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  /** Opens the attack discovery settings flyout on the given tab */
  openFlyout: (tabId: string) => void;
  /** Opens the generations control center flyout */
  openControlCenter: () => void;
}

/**
 * Builds the attacks page menu: "Schedule" as the primary action, with "Generations", "Run" and
 * "Settings" inline. `SecurityAppHeader` merges in "Add integrations" automatically.
 */
export const useAttacksHeaderMenu = ({
  isLoading,
  isRunDisabled,
  onGenerate,
  openFlyout,
  openControlCenter,
}: UseAttacksHeaderMenuParams): AppHeaderMenu =>
  useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'generations',
          label: GENERATIONS_BUTTON,
          iconType: 'listBullet',
          run: openControlCenter,
          testId: GENERATIONS_MENU_ITEM_TEST_ID,
        },
        {
          id: 'run',
          label: runI18n.RUN,
          iconType: 'play',
          run: () => {
            void onGenerate();
          },
          disableButton: isLoading || isRunDisabled,
          tooltipContent: isRunDisabled ? runI18n.DISABLED_TOOLTIP : runI18n.RUN_TOOLTIP,
          testId: RUN_MENU_ITEM_TEST_ID,
        },
        {
          id: 'settings',
          label: settingsI18n.SETTINGS,
          iconType: 'indexSettings',
          run: () => openFlyout(SETTINGS_TAB_ID),
          disableButton: isLoading,
          tooltipContent: settingsI18n.SETTINGS_TOOLTIP,
          testId: SETTINGS_MENU_ITEM_TEST_ID,
        },
      ],
      primaryActionItem: {
        id: 'schedule',
        label: scheduleI18n.SCHEDULE,
        iconType: 'calendar',
        run: () => openFlyout(SCHEDULE_TAB_ID),
        disableButton: isLoading,
        tooltipContent: scheduleI18n.SCHEDULE_TOOLTIP,
        testId: SCHEDULE_MENU_ITEM_TEST_ID,
      },
    }),
    [isLoading, isRunDisabled, onGenerate, openControlCenter, openFlyout]
  );
