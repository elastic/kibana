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
