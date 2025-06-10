/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { ALERTS_CARD_TITLE } from './translations';
import alertsIcon from './images/alerts_icon.png';
import alertsDarkIcon from './images/alerts_icon_dark.png';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';

export const alertsCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.alerts,
  title: ALERTS_CARD_TITLE,
  icon: alertsIcon,
  iconDark: alertsDarkIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_alerts_card" */
        './alerts_card'
      )
  ),
  capabilitiesRequired: [`${SECURITY_FEATURE_ID}.detections`],
};
