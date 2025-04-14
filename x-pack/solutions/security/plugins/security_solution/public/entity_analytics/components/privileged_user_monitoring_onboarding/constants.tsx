/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import entraIdIcon from '../../icons/entra_id.svg';
import oktaIcon from '../../icons/okta.svg';
import activeDirectoryIcon from '../../icons/active_directory.svg';

export const PRIVILEGED_USER_MONITORING_INTEGRATIONS = [
  {
    id: 'entity_analytics_okta',
    icon: oktaIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.okta.title"
        defaultMessage="Okta"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.okta.description"
        defaultMessage="Collect user identities and event logs from Okta with Elastic Agent."
      />
    ),
  },
  {
    id: 'entity_analytics_entra_id',
    icon: entraIdIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.entra.title"
        defaultMessage="Microsoft Entra ID"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.entra.description"
        defaultMessage="Collect user identities and event logs from Microsoft Entra ID with Elastic Agent."
      />
    ),
  },
  {
    id: 'entity_analytics_ad',
    icon: activeDirectoryIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.activeDirectory.title"
        defaultMessage="Active Directory"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.activeDirectory.description"
        defaultMessage="Collect user identities from Active Directory with Elastic Agent."
      />
    ),
  },
];
