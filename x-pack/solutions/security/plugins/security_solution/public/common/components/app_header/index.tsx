/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';

/**
 * Shared Security Solution page header. Thin wrapper around the Chrome Next `AppHeader` that
 * always surfaces "Add integrations" in the app menu, so every page adopting this component gets
 * it for free instead of wiring it up individually.
 */
export const SecurityAppHeader = React.memo<AppHeaderProps>((props) => {
  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  const menu = useMemo<AppHeaderProps['menu']>(() => {
    if (!addIntegrationsMenuItem) {
      return props.menu;
    }

    return {
      ...props.menu,
      items: [...(props.menu?.items ?? []), addIntegrationsMenuItem],
    };
  }, [addIntegrationsMenuItem, props.menu]);

  return <AppHeader {...props} menu={menu} />;
});

SecurityAppHeader.displayName = 'SecurityAppHeader';
