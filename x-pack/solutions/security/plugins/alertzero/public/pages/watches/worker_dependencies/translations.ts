/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const disableWorkerTitle = (workerName: string): string =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.disableDialog.title', {
    defaultMessage: 'Disable {workerName}?',
    values: { workerName },
  });

export const DISABLE_DIALOG_CANCEL = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.disableDialog.cancel',
  { defaultMessage: 'Cancel' }
);

export const DISABLE_DIALOG_CONFIRM = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.disableDialog.confirm',
  { defaultMessage: 'Disable Worker' }
);

export const blockedAfterSaveTitle = (workerName: string): string =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.blockedAfterSave.title', {
    defaultMessage: "Saved — but {workerName} won't run properly yet",
    values: { workerName },
  });

export const BLOCKED_AFTER_SAVE_ACKNOWLEDGE = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.blockedAfterSave.acknowledge',
  { defaultMessage: 'Got it' }
);
