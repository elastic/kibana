/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RULES_UI_DETECTIONS_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { IconDashboards } from '../../../../../common/icons/dashboards';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { DASHBOARDS_CARD_TITLE } from './translations';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';

export const dashboardsCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.dashboards,
  title: DASHBOARDS_CARD_TITLE,
  icon: IconDashboards,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_dashboards_card" */
        './dashboards_card'
      )
  ),
  capabilitiesRequired: [
    ['dashboard_v2.show', `${SECURITY_FEATURE_ID}.detections`],
    ['dashboard_v2.show', RULES_UI_DETECTIONS_PRIVILEGE],
  ],
};
