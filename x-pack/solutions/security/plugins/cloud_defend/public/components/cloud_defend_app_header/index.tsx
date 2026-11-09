/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { useCloudDefendIntegrationLinks } from '../../common/navigation/use_cloud_defend_integration_links';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';

/**
 * Shared Defend for containers page header. Thin wrapper around the Chrome Next `AppHeader` that
 * always surfaces "Add integrations" and the D4C integration documentation in the app menu.
 *
 * Defaults `spacing` to `largeBleed` because cloud defend pages render inside the Security Solution
 * page section, which has 24px padding.
 */
export const CloudDefendAppHeader = React.memo<AppHeaderProps>((props) => {
  const { docsLink } = useCloudDefendIntegrationLinks();
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

  return <AppHeader spacing="largeBleed" docLink={docsLink} {...props} menu={menu} />;
});

CloudDefendAppHeader.displayName = 'CloudDefendAppHeader';
