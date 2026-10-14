/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import type { AppMenuItemType } from '@kbn/app-menu';
import { isDetectionsPath } from '../../../helpers';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';
import { useMlJobSettingsMenuItem } from './use_ml_job_settings_menu_item';

/**
 * Shared Security Solution page header. Wraps `AppHeader` and always surfaces "ML job settings"
 * (detections routes only, mirroring `GlobalHeader`) above "Add integrations" in the app menu.
 */
export const SecurityAppHeader = React.memo<AppHeaderProps>((props) => {
  const { pathname } = useLocation();
  const { item: mlJobSettingsMenuItem, flyout: mlJobSettingsFlyout } = useMlJobSettingsMenuItem();
  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  const menu = useMemo<AppHeaderProps['menu']>(() => {
    const menuItems: AppMenuItemType[] = [];
    if (isDetectionsPath(pathname) && mlJobSettingsMenuItem) {
      menuItems.push(mlJobSettingsMenuItem);
    }
    if (addIntegrationsMenuItem) {
      menuItems.push(addIntegrationsMenuItem);
    }

    if (menuItems.length === 0) {
      return props.menu;
    }

    return {
      ...props.menu,
      items: [...(props.menu?.items ?? []), ...menuItems],
    };
  }, [pathname, mlJobSettingsMenuItem, addIntegrationsMenuItem, props.menu]);

  return (
    <>
      <AppHeader {...props} menu={menu} />
      {mlJobSettingsFlyout}
    </>
  );
});

SecurityAppHeader.displayName = 'SecurityAppHeader';
