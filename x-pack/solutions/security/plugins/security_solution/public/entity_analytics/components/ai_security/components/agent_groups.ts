/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import type { AgentInventoryRow, InventoryPerson, SignedInAccount } from '../types';

export const AGENT_GROUP_BY_OPTIONS = ['person', 'host'] as const;
export type AgentGroupByOption = (typeof AGENT_GROUP_BY_OPTIONS)[number];

interface AgentGroupBase {
  readonly key: string;
  readonly rows: readonly AgentInventoryRow[];
  readonly maxRiskScore?: number;
  readonly alertCount: number;
}

export type PersonGroup = AgentGroupBase & {
  readonly hostCount: number;
} & (
    | { readonly kind: 'person'; readonly person: InventoryPerson }
    | { readonly kind: 'unmatched'; readonly email: string }
    | { readonly kind: 'noAccount' }
  );

export type HostGroup = AgentGroupBase & {
  readonly kind: 'host';
  readonly hostId: string;
  readonly hostName?: string;
  readonly criticality?: CriticalityLevelWithUnassigned;
  readonly peopleCount: number;
};

export type AgentGroup = PersonGroup | HostGroup;

const NO_ACCOUNT_KEY = 'no-account';

/** One key per person: the resolved person ID, else the raw email. */
const getAccountKey = ({ person, emails: [email] }: SignedInAccount): string | undefined => {
  if (person) return `person:${person.entityId}`;
  return email ? `email:${email.toLowerCase()}` : undefined;
};

const summarise = (rows: readonly AgentInventoryRow[]) => {
  const scores = rows.flatMap(({ riskScore }) => (riskScore == null ? [] : [riskScore]));
  return {
    maxRiskScore: scores.length ? Math.max(...scores) : undefined,
    alertCount: rows.reduce((total, { alertCount }) => total + alertCount, 0),
  };
};

const byUrgency = (a: AgentGroup, b: AgentGroup): number =>
  (b.maxRiskScore ?? -1) - (a.maxRiskScore ?? -1) ||
  b.alertCount - a.alertCount ||
  b.rows.length - a.rows.length;

/**
 * Installs by the person they act for. An install with two accounts is in both groups, an account
 * with no resolved person groups by its email, and an install with no account has its own group.
 */
export const getPersonGroups = (rows: readonly AgentInventoryRow[]): PersonGroup[] => {
  const members = new Map<string, { account?: SignedInAccount; rows: AgentInventoryRow[] }>();
  rows.forEach((row) => {
    const keys = row.accounts.flatMap((account) => {
      const key = getAccountKey(account);
      return key ? [{ key, account }] : [];
    });
    (keys.length ? keys : [{ key: NO_ACCOUNT_KEY, account: undefined }]).forEach(
      ({ key, account }) => {
        const group = members.get(key) ?? { account, rows: [] };
        if (!group.rows.includes(row)) group.rows.push(row);
        members.set(key, group);
      }
    );
  });
  return Array.from(members.entries())
    .map(([key, { account, rows: groupRows }]): PersonGroup => {
      const base = {
        key,
        rows: groupRows,
        hostCount: new Set(groupRows.map(({ hostId }) => hostId)).size,
        ...summarise(groupRows),
      };
      if (account?.person) return { ...base, kind: 'person', person: account.person };
      if (account?.emails[0]) return { ...base, kind: 'unmatched', email: account.emails[0] };
      return { ...base, kind: 'noAccount' };
    })
    .sort(byUrgency);
};

/** Installs by host, with the host's criticality and the distinct people signed in on it. */
export const getHostGroups = (rows: readonly AgentInventoryRow[]): HostGroup[] => {
  const byHost = new Map<string, AgentInventoryRow[]>();
  rows.forEach((row) => byHost.set(row.hostId, [...(byHost.get(row.hostId) ?? []), row]));
  return Array.from(byHost.entries())
    .map(
      ([hostId, groupRows]): HostGroup => ({
        kind: 'host',
        key: hostId,
        hostId,
        hostName: groupRows.find(({ hostName }) => hostName)?.hostName,
        criticality: groupRows.find(({ storeContext }) => storeContext?.hostCriticality)
          ?.storeContext?.hostCriticality,
        rows: groupRows,
        peopleCount: new Set(
          groupRows.flatMap(({ accounts }) =>
            accounts.flatMap((account) => getAccountKey(account) ?? [])
          )
        ).size,
        ...summarise(groupRows),
      })
    )
    .sort(byUrgency);
};
