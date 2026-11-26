/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskSeverity } from '../../../../common/search_strategy';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';

/** The three fields of the install ID `ai_agent:{process.ai_agent.name}@{host.id}@{user.name}`. */
export interface AgentIdentity {
  readonly entityId: string;
  readonly agentName: string;
  readonly hostId: string;
  readonly userName: string;
}

/** One agent install, read from its Entity Store row. */
export interface AgentRow extends AgentIdentity {
  readonly entityName?: string;
  readonly hostName?: string;
  readonly executable?: string;
  readonly version?: string;
  readonly firstSeen?: string;
  readonly lastSeen?: string;
  readonly riskLevel?: RiskSeverity;
  readonly riskScore?: number;
  readonly criticality?: CriticalityLevelWithUnassigned;
  readonly watchlistIds: readonly string[];
  /** Accounts this install has used (`acts_on_behalf_of` raw emails). The set never shrinks. */
  readonly accountEmails: readonly string[];
  /** Resolved person IDs, once a maintainer writes them. */
  readonly accountIds: readonly string[];
  readonly dependsOnIds: readonly string[];
  readonly dataSources: readonly string[];
  /** Facts the AI agent context maintainer copies onto the row. Absent until it has run. */
  readonly storeContext?: AgentStoreContext;
}

/** `entity.attributes.ai_agent_context`: facts about related entities, kept on the agent row. */
export interface AgentStoreContext {
  /** Watchlists of the people the agent acts for, across their resolution groups. */
  readonly personWatchlistIds: readonly string[];
  readonly personCriticality?: CriticalityLevelWithUnassigned;
  /** False if any person has MFA off, absent if no person row reports it. */
  readonly personMfaEnabled?: boolean;
  readonly hostCriticality?: CriticalityLevelWithUnassigned;
  /** Other installs that act for the same account. */
  readonly sharedAccountInstalls?: number;
  readonly runsAsRoot?: boolean;
  readonly computedAt: string;
}

export interface AgentInventoryRow extends AgentRow {
  readonly alertCount: number;
}

/** A host, user or agent row related to the agent. */
export interface RelatedEntity {
  readonly entityId: string;
  readonly engineType: string;
  readonly name?: string;
  readonly hostId?: string;
  readonly hostName?: string;
  readonly userName?: string;
  readonly email?: string;
  readonly fullName?: string;
  readonly namespace?: string;
  readonly source?: string;
  readonly lastSeen?: string;
  readonly riskLevel?: RiskSeverity;
  readonly riskScore?: number;
  readonly criticality?: CriticalityLevelWithUnassigned;
  readonly watchlistIds: readonly string[];
  readonly resolvedTo: readonly string[];
  readonly accountEmails: readonly string[];
  readonly accountIds: readonly string[];
  readonly ownsInferredIds: readonly string[];
  readonly agentName?: string;
  readonly mfaEnabled?: boolean;
}

/** Account state from an identity provider's user documents. */
export interface IdpAccount {
  readonly email: string;
  readonly provider: string;
  readonly status?: string;
  readonly deprovisioned?: boolean;
  readonly suspended?: boolean;
  /** Entra ID reports `account_enabled` rather than a status. */
  readonly enabled?: boolean;
  readonly mfaEnabled?: boolean;
  readonly fullName?: string;
  /** The newest user document was generated (`poc-mock`), not collected. */
  readonly isMock: boolean;
}

/** Employment record from the HR index, keyed by `user.email`. */
export interface HrRecord {
  readonly email: string;
  readonly status?: string;
  readonly terminationDate?: string;
  /** The newest HR document was generated (`poc-mock`). */
  readonly isMock: boolean;
}

/** The person an agent acts for, from one of its accounts. */
export interface AgentPerson {
  readonly email: string;
  /** User rows for the email, with the resolution target first when one is known. */
  readonly rows: readonly RelatedEntity[];
  readonly primary?: RelatedEntity;
  readonly idpAccounts: readonly IdpAccount[];
  readonly hr?: HrRecord;
  readonly watchlistIds: readonly string[];
}

export interface AgentContext {
  readonly agent?: AgentRow;
  readonly host?: RelatedEntity;
  readonly runsAs?: RelatedEntity;
  readonly people: readonly AgentPerson[];
  readonly otherAgentsOnHost: readonly RelatedEntity[];
  readonly otherInstallsOnAccount: readonly RelatedEntity[];
  /** Newest `process.ai_agent.email` on the agent's own events. */
  readonly signedInAs?: string;
  /** When the event that carried `signedInAs` happened. */
  readonly signedInAt?: string;
}

export interface AgentAlert {
  readonly id: string;
  readonly index: string;
  readonly timestamp: string;
  readonly ruleName?: string;
  readonly severity?: string;
  readonly status?: string;
  readonly riskScore?: number;
  readonly processName?: string;
  readonly userName?: string;
  /** The source event was generated (`poc-mock`); detection copies its `tags` onto the alert. */
  readonly isMock: boolean;
}
