/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttacksUpsellingPage } from '@kbn/security-solution-upselling/pages/attacks';
import React from 'react';

import * as i18n from './translations';

/**
 * This component passes serverless-specific `i18n` to the platform agnostic
 * `AttacksUpsellingPage` component.
 */
const AttacksUpsellingPageServerlessComponent: React.FC = () => {
  return (
    <AttacksUpsellingPage
      availabilityMessage={i18n.AVAILABILITY_MESSAGE}
      upgradeMessage={i18n.UPGRADE_MESSAGE}
    />
  );
};

AttacksUpsellingPageServerlessComponent.displayName = 'AttacksUpsellingPageServerless';

export const AttacksUpsellingPageServerless = React.memo(AttacksUpsellingPageServerlessComponent);
