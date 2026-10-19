/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { WORKER_SERVICE_ACCOUNT_NAMES } from '@kbn/alertzero-common';
import { workerName } from './worker_names';

const workerIdByAccountName = new Map(
  Object.entries(WORKER_SERVICE_ACCOUNT_NAMES).map(([workerId, accountName]) => [
    accountName,
    workerId,
  ])
);

/** The account name inside a principal such as `kibana/alertzero_alert_triage`. */
const accountNameFromPrincipal = (username: string): string => {
  const slash = username.lastIndexOf('/');
  return slash === -1 ? username : username.slice(slash + 1);
};

/**
 * Translated worker name for one of AlertZero's worker service accounts.
 * Undefined for any other principal.
 */
export const workerDisplayNameForServiceAccount = (
  username: string | null | undefined
): string | undefined => {
  if (!username) return undefined;
  const workerId = workerIdByAccountName.get(accountNameFromPrincipal(username));
  return workerId ? workerName(workerId) : undefined;
};

/** Worker name with the service-account qualifier, for a caption that has only one name slot. */
export const serviceAccountActorName = (
  username: string | null | undefined
): string | undefined => {
  const name = workerDisplayNameForServiceAccount(username);
  if (!name) return undefined;
  return i18n.translate('xpack.alertzero.serviceAccounts.actorName', {
    defaultMessage: '{name} (service account)',
    values: { name },
  });
};
