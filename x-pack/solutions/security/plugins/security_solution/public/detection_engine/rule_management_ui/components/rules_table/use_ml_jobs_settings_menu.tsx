/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/core-chrome-app-menu-components';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { MlPopover } from '../../../../common/components/ml_popover/ml_popover';
import { ML_JOB_SETTINGS } from '../../../../common/components/ml_popover/translations';

interface UseMlJobsSettingsMenuResult {
  /** The "ML job settings" app menu item, or `undefined` when ML settings are not available. */
  menuItem: AppMenuItemType | undefined;
  /** The anchored ML popover element to render alongside the app header. */
  popover: React.ReactNode;
}

/**
 * Provides the "ML job settings" overflow menu item plus the ML popover it opens, anchored to the
 * app menu. The popover reuses the existing `MlPopover` (jobs table / upgrade prompt) in its
 * externally-anchored mode.
 */
export const useMlJobsSettingsMenu = (): UseMlJobsSettingsMenuResult => {
  const mlCapabilities = useMlCapabilities();
  const isMlAdmin = hasMlAdminPermissions(mlCapabilities);
  const isLicensed = hasMlLicense(mlCapabilities);
  // Matches when `MlPopover` renders content (the upgrade prompt when unlicensed, or the admin
  // config UI). When licensed but not an ML admin, there is nothing to configure.
  const isMlAvailable = !isLicensed || isMlAdmin;

  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const menuItem = useMemo<AppMenuItemType | undefined>(() => {
    if (!isMlAvailable) {
      return undefined;
    }

    return {
      id: 'mlJobSettings',
      label: ML_JOB_SETTINGS,
      iconType: 'machineLearningApp',
      order: 50,
      overflow: true,
      testId: 'mlJobSettingsButton',
      run: (params) => {
        // Overflow items live inside the "More" popover, which closes on click and unmounts the
        // clicked element — so anchor to the persistent overflow button instead when present.
        const overflowButton = document.querySelector<HTMLElement>(
          `[data-test-subj="${APP_MENU_TEST_SUBJECTS.overflowButton}"]`
        );
        setAnchorElement(overflowButton ?? params?.triggerElement ?? null);
        setIsOpen(true);
      },
    };
  }, [isMlAvailable]);

  const popover = anchorElement ? (
    <MlPopover anchorElement={anchorElement} isOpen={isOpen} onClose={closePopover} />
  ) : null;

  return { menuItem, popover };
};
