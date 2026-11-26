/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_AGENT_ENGINE_TYPE } from '../constants';
import type {
  AgentContext,
  AgentIdentity,
  AgentPerson,
  AgentRow,
  HrRecord,
  IdpAccount,
  RelatedEntity,
} from '../types';
import { getHostEntityId, getLocalUserEntityId } from '../utils';

export interface BuildAgentContextParams {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  readonly related: readonly RelatedEntity[];
  readonly idpAccounts: readonly IdpAccount[];
  readonly hrRecords?: readonly HrRecord[];
  readonly signedInAs?: string;
}

const isPersonRow = (row: RelatedEntity): boolean =>
  row.engineType === 'user' && row.namespace !== 'local';

const lower = (value: string | undefined): string | undefined => value?.toLowerCase();

/**
 * Joins the agent to its wider context. People come from the resolved `acts_on_behalf_of.ids`
 * when a maintainer wrote them, and otherwise from the raw emails matched on `user.email` at query
 * time. A row resolved into another (`resolution.resolved_to`) gives way to its target.
 */
export const buildAgentContext = ({
  identity,
  agent,
  related,
  idpAccounts,
  hrRecords = [],
  signedInAs,
}: BuildAgentContextParams): AgentContext => {
  const byId = new Map(related.map((row) => [row.entityId, row]));
  const hostIds = new Set([getHostEntityId(identity), ...(agent?.dependsOnIds ?? [])]);
  const host = related.find((row) => row.engineType === 'host' && hostIds.has(row.entityId));
  const localUserId = getLocalUserEntityId(identity);
  const runsAs =
    related.find(
      (row) => row.engineType === 'user' && row.ownsInferredIds.includes(identity.entityId)
    ) ?? byId.get(localUserId);

  const accountIds = agent?.accountIds ?? [];
  const accountEmails = agent?.accountEmails ?? [];
  const resolvedPeople = accountIds
    .map((id) => byId.get(id))
    .filter((row): row is RelatedEntity => !!row);
  const emails = Array.from(
    new Set([
      ...accountEmails,
      ...resolvedPeople.map((row) => row.email).filter((email): email is string => !!email),
    ])
  );

  const people: AgentPerson[] = emails.map((email) => {
    const rows = related.filter(
      (row) =>
        isPersonRow(row) && (lower(row.email) === lower(email) || accountIds.includes(row.entityId))
    );
    const emailRows = rows.filter((row) => lower(row.email) === lower(email));
    const resolvedTarget = emailRows
      .flatMap((row) => row.resolvedTo)
      .map((id) => byId.get(id))
      .find((row): row is RelatedEntity => !!row);
    const primary =
      emailRows.find((row) => accountIds.includes(row.entityId)) ??
      resolvedTarget ??
      emailRows.find((row) => row.resolvedTo.length === 0) ??
      emailRows[0];
    const personRows = Array.from(
      new Set([
        ...(primary ? [primary] : []),
        ...emailRows,
        ...(resolvedTarget ? [resolvedTarget] : []),
      ])
    );
    return {
      email,
      rows: personRows,
      primary,
      idpAccounts: idpAccounts.filter((account) => lower(account.email) === lower(email)),
      hr: hrRecords.find((record) => lower(record.email) === lower(email)),
      watchlistIds: Array.from(new Set(personRows.flatMap((row) => row.watchlistIds))),
    };
  });

  const agentRows = related.filter(
    (row) => row.engineType === AI_AGENT_ENGINE_TYPE && row.entityId !== identity.entityId
  );
  const emailSet = new Set(accountEmails.map(lower));
  const otherInstallsOnAccount = agentRows.filter(
    (row) =>
      row.accountEmails.some((email) => emailSet.has(lower(email))) ||
      row.accountIds.some((id) => accountIds.includes(id))
  );

  return {
    agent,
    host,
    runsAs,
    people,
    otherAgentsOnHost: agentRows.filter((row) => row.hostId === identity.hostId),
    otherInstallsOnAccount,
    signedInAs,
  };
};
