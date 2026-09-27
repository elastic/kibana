/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { AppMenuItemType, AppMenuRunActionParams } from '@kbn/app-menu';
import { hasMlAdminPermissions } from '../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../ml/hooks/use_ml_capabilities';
import { MlSettingsFlyout } from '../ml_popover/ml_settings_flyout';
import { ML_JOB_SETTINGS } from '../ml_popover/translations';

export const ML_JOB_SETTINGS_MENU_ITEM_TEST_ID = 'securityAppHeaderMlJobSettings';

export interface UseMlJobSettingsMenuItemResult {
  item: AppMenuItemType | undefined;
  /** Renders the ML job settings flyout when open; render this alongside the page's AppHeader. */
  flyout: React.ReactNode;
}

/**
 * Overflow "ML job settings" item, gated on license/admin via capabilities (not job fetches).
 * Opens a flyout; route gating is the caller's job. `returnFocus` restores the overflow on close.
 */
export const useMlJobSettingsMenuItem = (): UseMlJobSettingsMenuItemResult => {
  const mlCapabilities = useMlCapabilities();
  const isLicensed = hasMlLicense(mlCapabilities);
  const isMlAdmin = hasMlAdminPermissions(mlCapabilities);
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<(() => void) | undefined>();

  // Mirrors MlPopover: show the entry unless the user has a valid ML license but lacks ML admin
  // permissions to configure jobs.
  const canConfigureMl = !isLicensed || isMlAdmin;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    returnFocusRef.current?.();
    returnFocusRef.current = undefined;
  }, []);

  const handleOpen = useCallback((params?: AppMenuRunActionParams) => {
    returnFocusRef.current = params?.returnFocus;
    setIsOpen(true);
  }, []);

  const item = useMemo<AppMenuItemType | undefined>(() => {
    if (!canConfigureMl) {
      return undefined;
    }

    return {
      id: 'mlJobSettings',
      label: ML_JOB_SETTINGS,
      iconType: 'machineLearningApp',
      overflow: true,
      run: handleOpen,
      testId: ML_JOB_SETTINGS_MENU_ITEM_TEST_ID,
    };
  }, [canConfigureMl, handleOpen]);

  const flyout = isOpen ? <MlSettingsFlyout onClose={handleClose} /> : null;

  return { item, flyout };
};
