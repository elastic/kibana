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
import { MFA_OFF } from '../translations';

export type PersonSignal =
  | { readonly kind: 'watchlist'; readonly watchlistId: string }
  | { readonly kind: 'mfa_off' };

/**
 * MFA for one person, from Entity Store only. The agent row's value comes first, when it speaks
 * for this person alone. Otherwise it is read from the person's rows, and off wins when any row
 * reports off.
 */
export const getMfaEnabled = (
  person: AgentPerson,
  rowFacts?: AgentStoreContext
): boolean | undefined => {
  if (rowFacts?.personMfaEnabled !== undefined) return rowFacts.personMfaEnabled;
  const known = person.rows
    .map((personRow) => personRow.mfaEnabled)
    .filter((value): value is boolean => value !== undefined);
  return known.length === 0 ? undefined : !known.includes(false);
};

/** Only the abnormal facts about a person: watchlists, then MFA off. Healthy and unknown values give nothing. */
export const getPersonSignals = (
  person: AgentPerson,
  rowFacts?: AgentStoreContext
): PersonSignal[] => {
  const watchlistIds = rowFacts?.personWatchlistIds ?? person.watchlistIds;
  const signals: PersonSignal[] = watchlistIds.map((watchlistId) => ({
    kind: 'watchlist',
    watchlistId,
  }));
  if (getMfaEnabled(person, rowFacts) === false) signals.push({ kind: 'mfa_off' });
  return signals;
};

/** The person's facts that need action now, as short phrases for one status line. Watchlists are left out. */
export const formatPersonStatus = (signals: readonly PersonSignal[]): string[] =>
  signals.flatMap((signal) => (signal.kind === 'mfa_off' ? [MFA_OFF] : []));
