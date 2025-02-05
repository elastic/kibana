/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AVAILABILITY_MESSAGE = i18n.translate(
  'xpack.securitySolutionServerless.upselling.pages.attackDiscovery.availabilityMessage',
  {
    defaultMessage: 'Your product tier does not support Attack discovery.',
  }
);

export const UPGRADE_MESSAGE = i18n.translate(
  'xpack.securitySolutionServerless.upselling.pages.attackDiscovery.upgradeMessage',
  {
    defaultMessage: 'Please upgrade your product tier to use this feature.',
  }
);
