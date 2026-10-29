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
 * What is being proposed: the action, and the host or process it acts on. Not
 * which Investigation raised it, so two Investigations that reach the same target share a key
 * and their Proposals converge.
 *
 * `subjectId` is the agent id for host and process subjects (the material is unchanged
 * from when this slot was called `endpointId`) and `<kind>:<value>` for identities, which
 * cannot collide with an agent id.
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

// The agent schema leaves action input open, so a pid can arrive as the string "4242". It is read
// as the number, so both spellings (and "04242") land on Hunt's `pid:4242`.
const asPid = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;
};

/**
 * The subject key for an action read off its own input. Hunt builds the key from its run state
 * (`subjectId` and the call to `buildProposalSubjectKey` in `decide_package_report.ts`,
 * `processKey` in `rehydrate_process_selectors.ts`) and then writes those same values into the
 * action input (`buildActionInput`). This reads them back out, so a worker that only has the
 * action input lands on the same key:
 *
 * - `endpoint_ids[0]` is the agent id Hunt uses for host and process subjects;
 * - `parameters.entity_id` becomes `entity_id:<id>`, Hunt's process key. `parameters.pid`
 *   (a number or an integer string) becomes `pid:<pid>`; Hunt never proposes on a bare pid, so this only keeps a pid kill
 *   apart from an entity kill;
 * - `id_field` + `id_value` become `<kind>:<value>`, with kind the field's first segment
 *   (`user.name` -> `user`), which is how Hunt keys users and services.
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
    const pid = asPid(parameters.pid);
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
