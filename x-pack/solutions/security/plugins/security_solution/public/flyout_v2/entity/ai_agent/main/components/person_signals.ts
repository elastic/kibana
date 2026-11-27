/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentPerson,
  AgentStoreContext,
} from '../../../../../entity_analytics/components/ai_security/types';

export type PersonSignal =
  | { readonly kind: 'watchlist'; readonly watchlistId: string }
  | { readonly kind: 'terminated'; readonly date?: string }
  | {
      readonly kind: 'idp';
      readonly provider: string;
      readonly state: 'deprovisioned' | 'suspended';
    }
  | { readonly kind: 'mfa_off' };

/**
 * MFA for one person. The agent row's value comes first, when it speaks for this person alone.
 * Otherwise it is read from the IdP documents and the person's rows, and off wins when any
 * source reports off.
 */
export const getMfaEnabled = (
  person: AgentPerson,
  rowFacts?: AgentStoreContext
): boolean | undefined => {
  if (rowFacts?.personMfaEnabled !== undefined) return rowFacts.personMfaEnabled;
  const known = [
    ...person.idpAccounts.map((account) => account.mfaEnabled),
    ...person.rows.map((personRow) => personRow.mfaEnabled),
  ].filter((value): value is boolean => value !== undefined);
  return known.length === 0 ? undefined : !known.includes(false);
};

/**
 * Only the abnormal facts about a person, in the order an analyst reads them: watchlists, HR
 * termination, deprovisioned or suspended IdP accounts, then MFA off. Healthy and unknown values
 * give nothing.
 */
export const getPersonSignals = (
  person: AgentPerson,
  rowFacts?: AgentStoreContext
): PersonSignal[] => {
  const watchlistIds = rowFacts?.personWatchlistIds ?? person.watchlistIds;
  const signals: PersonSignal[] = watchlistIds.map((watchlistId) => ({
    kind: 'watchlist',
    watchlistId,
  }));
  if (person.hr?.status?.toLowerCase() === 'terminated') {
    signals.push({ kind: 'terminated', date: person.hr.terminationDate });
  }
  for (const { provider, deprovisioned, suspended } of person.idpAccounts) {
    if (deprovisioned) signals.push({ kind: 'idp', provider, state: 'deprovisioned' });
    else if (suspended) signals.push({ kind: 'idp', provider, state: 'suspended' });
  }
  if (getMfaEnabled(person, rowFacts) === false) signals.push({ kind: 'mfa_off' });
  return signals;
};
