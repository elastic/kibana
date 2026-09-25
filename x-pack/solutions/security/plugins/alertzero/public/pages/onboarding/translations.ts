/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ONBOARDING_TITLE = i18n.translate('xpack.alertzero.onboarding.title', {
  defaultMessage: 'Get started with AlertZero',
});

export const ONBOARDING_BODY = i18n.translate('xpack.alertzero.onboarding.body', {
  defaultMessage:
    'AlertZero automatically investigates security alerts and proposes actions. Enable a Watch worker to start receiving investigations.',
});

export const ONBOARDING_ACTION = i18n.translate('xpack.alertzero.onboarding.configureWatches', {
  defaultMessage: 'Configure Watches',
});

export const ONBOARDING_READ_ONLY_BODY = i18n.translate('xpack.alertzero.onboarding.readOnlyBody', {
  defaultMessage:
    'AlertZero automatically investigates security alerts and proposes actions. Ask an administrator to enable a Watch worker to start receiving investigations.',
});
