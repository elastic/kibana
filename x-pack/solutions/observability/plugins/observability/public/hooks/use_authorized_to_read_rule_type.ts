/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Alert } from '@kbn/alerting-types';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { useKibana } from '../utils/kibana_react';

/**
 * Accepts `undefined` for `ruleTypeId` so callers can pass `alert.fields[FIELD]`
 * directly without an extra truthiness guard. Returns `false` when undefined.
 */
export type AuthorizedToReadRuleType = (
  ruleTypeId: string | undefined,
  consumer?: string | undefined
) => boolean;
export type AuthorizedToReadRuleForAlert = (alert: Alert) => boolean;

export interface UseAuthorizedToReadRuleTypeResult {
  /** Check rule-read auth by rule type ID and optional consumer. */
  authorizedToReadRuleType: AuthorizedToReadRuleType;
  /** Check rule-read auth for the rule behind an alert (extracts type ID and consumer internally). */
  authorizedToReadRuleForAlert: AuthorizedToReadRuleForAlert;
}

/**
 * Returns functions that check whether the current user is authorized to read
 * a specific rule type. Wraps `useGetRuleTypesPermissions` and sources
 * `http`/`toasts` from Kibana so callers don't have to wire them up.
 *
 * Use `authorizedToReadRuleForAlert` when operating on an alert document.
 * Use `authorizedToReadRuleType` when you already have the rule type ID and consumer.
 */
export const useAuthorizedToReadRuleType = (): UseAuthorizedToReadRuleTypeResult => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const {
    authorizedToReadRuleType: authorizedToReadRuleTypeFromHook,
    authorizedToReadRuleForAlert,
  } = useGetRuleTypesPermissions({ http, toasts });

  // The shared hook requires a non-undefined ruleTypeId. Callers that read from
  // alert.fields[FIELD] get string | undefined from TypeScript, so this wrapper
  // absorbs the undefined check so they don't have to guard it at every call site.
  const authorizedToReadRuleType = useCallback<AuthorizedToReadRuleType>(
    (ruleTypeId, consumer) =>
      Boolean(ruleTypeId && authorizedToReadRuleTypeFromHook(ruleTypeId, consumer)),
    [authorizedToReadRuleTypeFromHook]
  );

  return { authorizedToReadRuleType, authorizedToReadRuleForAlert };
};
