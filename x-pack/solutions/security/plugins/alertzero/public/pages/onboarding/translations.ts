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

export const ONBOARDING_LOADING = i18n.translate('xpack.alertzero.onboarding.loading', {
  defaultMessage: 'Checking your AlertZero setup…',
});

// S0 — disabled CTA
export const DISABLED_TITLE = i18n.translate('xpack.alertzero.onboarding.disabled.title', {
  defaultMessage: 'AlertZero is turned off',
});
export const DISABLED_BODY = i18n.translate('xpack.alertzero.onboarding.disabled.body', {
  defaultMessage:
    'Enable AlertZero to install watches that triage and investigate security alerts on your behalf.',
});
export const ENABLE_TOGGLE_LABEL = i18n.translate(
  'xpack.alertzero.onboarding.disabled.enableToggleLabel',
  {
    defaultMessage: 'Enable AlertZero',
  }
);
export const ENABLE_PERMISSION_DENIED = i18n.translate(
  'xpack.alertzero.onboarding.disabled.permissionDenied',
  {
    defaultMessage: 'You need permission to manage advanced settings to enable AlertZero.',
  }
);
export const ENABLE_ERROR = i18n.translate('xpack.alertzero.onboarding.disabled.enableError', {
  defaultMessage: 'Could not enable AlertZero. Try again.',
});

// S1 — enabled, no watch
export const NO_WATCHES_TITLE = i18n.translate('xpack.alertzero.onboarding.noWatches.title', {
  defaultMessage: 'Install your first watch',
});
export const NO_WATCHES_BODY = i18n.translate('xpack.alertzero.onboarding.noWatches.body', {
  defaultMessage:
    'AlertZero is enabled. Install a watch from the catalog to start triaging alerts.',
});
export const NO_WATCHES_CTA = i18n.translate('xpack.alertzero.onboarding.noWatches.cta', {
  defaultMessage: 'Browse the watch catalog',
});

// S2 — awaiting first run
export const AWAITING_TITLE = i18n.translate('xpack.alertzero.onboarding.awaitingRun.title', {
  defaultMessage: 'Your watch is set up',
});
export const AWAITING_BODY = i18n.translate('xpack.alertzero.onboarding.awaitingRun.body', {
  defaultMessage:
    'AlertZero will start running your watches and surface proposals here after the next run.',
});
export const AWAITING_CTA = i18n.translate('xpack.alertzero.onboarding.awaitingRun.cta', {
  defaultMessage: 'Go to watches',
});

// Onboarding complete (beyond the three derived onboarding states)
export const ACTIVE_TITLE = i18n.translate('xpack.alertzero.onboarding.active.title', {
  defaultMessage: "You're all set",
});
export const ACTIVE_BODY = i18n.translate('xpack.alertzero.onboarding.active.body', {
  defaultMessage: 'AlertZero has completed its first run and is now triaging alerts.',
});
export const ACTIVE_CTA = i18n.translate('xpack.alertzero.onboarding.active.cta', {
  defaultMessage: 'Open AlertZero',
});
