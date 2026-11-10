/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { useKibana } from '../../common/hooks/use_kibana';
import { useAddIntegrationsMenuItem } from './use_add_integrations_menu_item';

/**
 * Shared Cloud Security Posture page header. Thin wrapper around the Chrome Next `AppHeader` that
 * always surfaces "Add integrations" and the CSP documentation in the app menu.
 *
 * Defaults `spacing` to `largeBleed` because CSP pages render inside the Security Solution page
 * section, which has 24px padding.
 */
export const CspAppHeader = React.memo<AppHeaderProps>((props) => {
  const { docLinks } = useKibana().services;
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

  return (
    <AppHeader
      spacing="largeBleed"
      docLink={docLinks.links.securitySolution.cloudSecurityPosture}
      {...props}
      menu={menu}
    />
  );
});

CspAppHeader.displayName = 'CspAppHeader';
