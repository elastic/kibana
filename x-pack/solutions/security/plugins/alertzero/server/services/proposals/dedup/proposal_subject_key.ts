/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';

/**
 * Fixed namespace for Proposal subject keys. Frozen: changing it renames every subject, so a
 * later run would stop recognising the Proposal an earlier one raised and raise a second.
 */
export const PROPOSAL_SUBJECT_UUID_NAMESPACE = 'a3c7e91f-4b2d-5e68-9c1a-8f0d6b3e5a72';

/**
 * What is being proposed: the action, and the host, process, user or service it acts on. Not
 * which Investigation raised it, so two Investigations that reach the same target share a key
 * and their Proposals converge.
 *
 * `subjectId` is the agent id for host and process subjects, and `<kind>:<value>` for identities,
 * which cannot collide with an agent id. `processKey` narrows a host action to one process.
 */
export const buildProposalSubjectKey = ({
  subjectId,
  actionWorkflowId,
  processKey,
}: {
  subjectId: string;
  actionWorkflowId: string;
  processKey?: string;
}): string => {
  const material = processKey
    ? `${subjectId}|${actionWorkflowId}|${processKey}`
    : `${subjectId}|${actionWorkflowId}`;
  return uuidv5(material, PROPOSAL_SUBJECT_UUID_NAMESPACE);
};

const firstString = (value: unknown): string | undefined =>
  Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * The subject key for an action read off its own input, so a worker that has the action input
 * but no notion of "subject" lands on the same key Hunt builds from its run state:
 *
 * - host and process actions: `endpoint_ids[0]`, plus `parameters.entity_id` or `parameters.pid`
 *   as the process key, spelled the way Hunt's process selectors spell it;
 * - identity actions: `id_field` + `id_value`, as `<kind>:<value>` where kind is the field's
 *   first segment (`user.name` -> `user`).
 *
 * `undefined` when the input names no target; the caller decides what to key such a proposal on.
 */
export const buildProposalSubjectKeyFromActionInput = ({
  actionWorkflowId,
  actionInput,
}: {
  actionWorkflowId: string;
  actionInput?: Record<string, unknown>;
}): string | undefined => {
  if (actionInput === undefined) {
    return undefined;
  }
  const agentId = firstString(actionInput.endpoint_ids);
  if (agentId !== undefined) {
    const parameters = (actionInput.parameters ?? {}) as Record<string, unknown>;
    const entityId = asString(parameters.entity_id);
    const pid = asNumber(parameters.pid);
    const processKey =
      entityId !== undefined
        ? `entity_id:${entityId}`
        : pid !== undefined
        ? `pid:${pid}`
        : undefined;
    return buildProposalSubjectKey({ subjectId: agentId, actionWorkflowId, processKey });
  }
  const idField = asString(actionInput.id_field);
  const idValue = asString(actionInput.id_value);
  if (idField !== undefined && idValue !== undefined) {
    const kind = idField.split('.')[0];
    return buildProposalSubjectKey({ subjectId: `${kind}:${idValue}`, actionWorkflowId });
  }
  return undefined;
};
