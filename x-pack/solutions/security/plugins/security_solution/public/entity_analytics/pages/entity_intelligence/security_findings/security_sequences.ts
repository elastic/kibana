/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFinding } from './types';

export interface SecuritySequence {
  id: string;
  basis: 'scenario' | 'session' | 'trace' | 'single';
  findings: SecurityFinding[];
}

const sequenceIdentity = (finding: SecurityFinding): Pick<SecuritySequence, 'id' | 'basis'> => {
  const principal = [
    ['actor', finding.actor?.id, finding.actor?.name, finding.actor?.provenance],
    ['host', finding.host?.id, finding.host?.name],
    ['service', finding.service?.id, finding.service?.name],
    finding.agent?.provider,
    finding.agent?.id,
    finding.agent?.sessionId,
    finding.traceId,
    [...finding.entityIds].sort(),
  ];
  if (finding.scenario) {
    return {
      id: JSON.stringify(['scenario', finding.scenario.kind, finding.scenario.id, principal]),
      basis: 'scenario',
    };
  }
  if (finding.agent?.sessionId) {
    return { id: JSON.stringify(['session', principal]), basis: 'session' };
  }
  if (finding.traceId) {
    return { id: JSON.stringify(['trace', finding.traceId, principal]), basis: 'trace' };
  }
  return {
    id: JSON.stringify(['single', finding.source.index, finding.source.id]),
    basis: 'single',
  };
};

/** Joins only explicit recorded correlation keys and keeps unrelated detections independent. */
export const buildSecuritySequences = (
  findings: readonly SecurityFinding[]
): SecuritySequence[] => {
  const sequences = new Map<string, SecuritySequence>();
  for (const finding of findings) {
    const identity = sequenceIdentity(finding);
    const sequence = sequences.get(identity.id);
    if (sequence) {
      if (
        !sequence.findings.some(
          (item) =>
            item.source.index === finding.source.index && item.source.id === finding.source.id
        )
      )
        sequence.findings.push(finding);
    } else {
      sequences.set(identity.id, { ...identity, findings: [finding] });
    }
  }
  const priority = { scenario: 0, session: 1, trace: 2, single: 3 };
  return [...sequences.values()]
    .map((sequence) => ({
      ...sequence,
      findings: sequence.findings.sort(
        (left, right) =>
          Date.parse(left.timestamp) - Date.parse(right.timestamp) ||
          (sequence.basis === 'scenario'
            ? (left.scenario?.step ?? 0) - (right.scenario?.step ?? 0)
            : 0) ||
          left.id.localeCompare(right.id)
      ),
    }))
    .sort(
      (left, right) =>
        priority[left.basis] - priority[right.basis] ||
        Math.max(...right.findings.map((finding) => Date.parse(finding.timestamp))) -
          Math.max(...left.findings.map((finding) => Date.parse(finding.timestamp))) ||
        left.id.localeCompare(right.id)
    );
};
