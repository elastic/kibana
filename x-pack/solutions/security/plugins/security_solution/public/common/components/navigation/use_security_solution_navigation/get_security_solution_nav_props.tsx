/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import type { Capabilities, NotificationsStart } from '@kbn/core/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Security',
});

interface GetSecuritySolutionNavPropsParams {
  children: ReactNode;
  notifications?: NotificationsStart;
  capabilities?: Capabilities;
  spaces?: SpacesPluginStart;
}

/**
 * The Classic `solutionNav` props of Security pages: the Security panel with its navigation and,
 * for users who can manage spaces, the callout to switch to the Security solution view.
 */
export const getSecuritySolutionNavProps = ({
  children,
  notifications,
  capabilities,
  spaces,
}: GetSecuritySolutionNavPropsParams): NonNullable<KibanaPageTemplateProps['solutionNav']> => {
  const areAnnouncementsEnabled = notifications?.tours.isEnabled();
  const canManageSpaces = capabilities?.spaces?.manage;

  const SolutionViewSwitchCallout = spaces?.ui?.components?.getSolutionViewSwitchCallout;
  const solutionNavFooter =
    areAnnouncementsEnabled && canManageSpaces && SolutionViewSwitchCallout ? (
      <SolutionViewSwitchCallout currentSolution="security" />
    ) : undefined;

  return {
    canBeCollapsed: true,
    name: translatedNavTitle,
    icon: 'logoSecurity',
    children,
    closeFlyoutButtonPosition: 'inside',
    footer: solutionNavFooter,
  };
};
