/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttacksUpsellingPage } from '@kbn/security-solution-upselling/pages/attacks';
import type { UpsellingPageProps } from '@kbn/security-solution-upselling/service';
import React from 'react';

import { useKibana } from '../../../common/services';
import * as i18n from './translations';

/**
 * This component passes serverless-specific `i18n` to the platform agnostic
 * `AttacksUpsellingPage` component.
 */
const AttacksUpsellingPageServerlessComponent: React.FC<UpsellingPageProps> = ({ appHeader }) => {
  const { docLinks } = useKibana().services;

  return (
    <AttacksUpsellingPage
      appHeader={appHeader}
      availabilityMessage={i18n.AVAILABILITY_MESSAGE}
      docLink={docLinks.links.siem.attackDiscovery}
      upgradeMessage={i18n.UPGRADE_MESSAGE}
    />
  );
};

AttacksUpsellingPageServerlessComponent.displayName = 'AttacksUpsellingPageServerless';

export const AttacksUpsellingPageServerless = React.memo(AttacksUpsellingPageServerlessComponent);
