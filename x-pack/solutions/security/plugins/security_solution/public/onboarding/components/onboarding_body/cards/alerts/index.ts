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
import alertsIconDark from './images/alerts_icon_dark.png';
import { useEuiTheme, EuiIcon } from '@elastic/eui';

const AlertsIconComponent = () => {
  const { colorMode } = useEuiTheme();
  const isDark = colorMode === 'DARK';
  const icon = isDark ? alertsIconDark : alertsIcon;

  return <img src={icon} alt="Alerts Icon" width={24} height={24} />;
};

export const alertsCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.alerts,
  title: ALERTS_CARD_TITLE,
  icon: AlertsIconComponent,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_alerts_card" */
        './alerts_card'
      )
  ),
};
