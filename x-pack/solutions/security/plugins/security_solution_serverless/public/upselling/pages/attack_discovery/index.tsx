/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveryUpsellingPage } from '@kbn/security-solution-upselling/pages/attack_discovery';
import React from 'react';

import * as i18n from './translations';

/**
 * This component passes serverless-specific `i18n` to the platform agnostic
 * `AttackDiscoveryUpsellingPage` component.
 */
const AttackDiscoveryUpsellingPageServerlessComponent: React.FC = () => {
  return (
    <AttackDiscoveryUpsellingPage
      availabilityMessage={i18n.AVAILABILITY_MESSAGE}
      upgradeMessage={i18n.UPGRADE_MESSAGE}
    />
  );
};

AttackDiscoveryUpsellingPageServerlessComponent.displayName =
  'AttackDiscoveryUpsellingPageServerless';

export const AttackDiscoveryUpsellingPageServerless = React.memo(
  AttackDiscoveryUpsellingPageServerlessComponent
);
