/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { NotificationsStart } from '@kbn/core/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';

interface GetSolutionNavFooterParams {
  application: ApplicationStart;
  notifications: NotificationsStart;
  spaces?: SpacesPluginStart | null;
}

export const getSolutionNavFooter = ({
  application,
  notifications,
  spaces,
}: GetSolutionNavFooterParams): SolutionNavProps['footer'] | undefined => {
  const areAnnouncementsEnabled = notifications.tours.isEnabled();
  const canManageSpaces = application.capabilities.spaces?.manage === true;

  const SolutionViewSwitchCallout = spaces?.ui?.components?.getSolutionViewSwitchCallout;

  if (!areAnnouncementsEnabled || !canManageSpaces || !SolutionViewSwitchCallout) {
    return undefined;
  }

  return <SolutionViewSwitchCallout currentSolution="es" />;
};
