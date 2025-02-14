/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import { OnboardingCardId } from '../../../../constants';
import rulesIcon from '../rules/images/rules_icon.png';
import rulesDarkIcon from '../rules/images/rules_icon_dark.png';
import integrationsIcon from '../integrations/images/integrations_icon.png';
import integrationsDarkIcon from '../integrations/images/integrations_icon_dark.png';
import dashboardsIcon from '../dashboards/images/dashboards_icon.png';
import dashboardsDarkIcon from '../dashboards/images/dashboards_icon_dark.png';
import alertsIcon from '../alerts/images/alerts_icon.png';
import alertsDarkIcon from '../alerts/images/alerts_icon_dark.png';
import startMigrationIcon from '../siem_migrations/start_migration/images/start_migration_icon.png';
import startMigrationDarkIcon from '../siem_migrations/start_migration/images/start_migration_icon_dark.png';

interface CardIcons {
  [key: string]: {
    light: string;
    dark: string;
  };
}

const cardIcons: CardIcons = {
  [OnboardingCardId.rules]: {
    light: rulesIcon,
    dark: rulesDarkIcon,
  },
  [OnboardingCardId.integrations]: {
    light: integrationsIcon,
    dark: integrationsDarkIcon,
  },
  [OnboardingCardId.dashboards]: {
    light: dashboardsIcon,
    dark: dashboardsDarkIcon,
  },
  [OnboardingCardId.alerts]: {
    light: alertsIcon,
    dark: alertsDarkIcon,
  },
  [OnboardingCardId.siemMigrationsStart]: {
    light: startMigrationIcon,
    dark: startMigrationDarkIcon,
  },
};

interface CardIconProps {
  cardId: OnboardingCardId;
}

export const CardIcon = React.memo<CardIconProps>(({ cardId }) => {
  const isDarkMode = useDarkMode();
  const icon = cardIcons[cardId]?.[isDarkMode ? 'dark' : 'light'] || '';

  if (!icon) return null;

  return <img src={icon} alt={`${cardId}-card-icon`} width={24} height={24} />;
});

CardIcon.displayName = 'CardIcon';

export const getCardIcon = (cardId: OnboardingCardId) => <CardIcon cardId={cardId} />;
