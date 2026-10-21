/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const accountDescription = (name: string) =>
  i18n.translate('xpack.alertzero.serviceAccounts.accountDescription', {
    defaultMessage: 'Runs the AlertZero worker with the {name} role. Created by AlertZero.',
    values: { name },
  });

export const accountUnusable = (name: string) =>
  i18n.translate('xpack.alertzero.serviceAccounts.accountUnusable', {
    defaultMessage: 'The service account "{name}" exists, but Kibana cannot run as it.',
    values: { name },
  });

export const predefinedRoleMissing = (roleName: string) =>
  i18n.translate('xpack.alertzero.serviceAccounts.predefinedRoleMissing', {
    defaultMessage:
      'The predefined role "{roleName}" does not exist in this project, so AlertZero cannot create the service account for this worker.',
    values: { roleName },
  });

export const reservedRoleMissing = (roleName: string) =>
  i18n.translate('xpack.alertzero.serviceAccounts.reservedRoleMissing', {
    defaultMessage:
      'Elasticsearch has no built-in "{roleName}" role for this worker. Upgrade Elasticsearch to the same version as Kibana, then try again.',
    values: { roleName },
  });

export const NO_PREBUILT_ROLE = i18n.translate('xpack.alertzero.serviceAccounts.noPrebuiltRole', {
  defaultMessage: 'AlertZero has no prebuilt role for this worker.',
});

export const SERVICE_ACCOUNTS_DISABLED = i18n.translate(
  'xpack.alertzero.serviceAccounts.disabled',
  {
    defaultMessage: 'Service accounts are not enabled in this deployment.',
  }
);
