/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_PRODUCT_MESSAGE = (requiredProduct: string) =>
  i18n.translate(
    'xpack.securitySolutionServerless.upselling.entityAnalytics.upgradeProductMessage',
    {
      defaultMessage:
        'Entity risk scoring capability is available in our {requiredProduct} license tier',
      values: {
        requiredProduct,
      },
    }
  );

export const ADDITIONAL_CHARGES_MESSAGE = i18n.translate(
  'xpack.securitySolutionServerless.entityStoreEnablementCallout.additionalChargesMessage',
  {
    defaultMessage:
      'Please be aware that activating these features may incur additional charges depending on your subscription plan. Review your plan details carefully to avoid unexpected costs before proceeding.',
  }
);
