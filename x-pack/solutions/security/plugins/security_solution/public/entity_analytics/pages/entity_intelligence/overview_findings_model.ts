/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFinding } from './security_findings/types';
import { securityInvocationReferenceKey } from './ai_agents/security_graph_model';

export interface OverviewFindingGroup {
  key: string;
  category: 'review' | 'blocked' | 'closed';
  findings: SecurityFinding[];
  representative: SecurityFinding;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const categoryOrder = { review: 0, blocked: 1, closed: 2 };

const compareFindings = (left: SecurityFinding, right: SecurityFinding): number =>
  severityOrder[left.severity] - severityOrder[right.severity] ||
  Date.parse(right.timestamp) - Date.parse(left.timestamp);

/** Group repeat alerts and attach policy evidence to a confirmed block of the same native invocation. */
export const groupOverviewFindings = (findings: SecurityFinding[]): OverviewFindingGroup[] => {
  const invocationGroups = new Map<string, SecurityFinding[]>();
  findings.forEach((finding, index) => {
    const reference = securityInvocationReferenceKey(finding);
    const key = reference
      ? JSON.stringify([reference, finding.status === 'closed'])
      : `unmatched:${index}`;
    const evidence = invocationGroups.get(key) ?? [];
    evidence.push(finding);
    invocationGroups.set(key, evidence);
  });
  const actions = [...invocationGroups.values()].flatMap((evidence) => {
    const confirmedBlocks = evidence.filter((finding) => finding.outcome === 'blocked');
    // Conflicting allowed evidence stays reviewable; a shared name or timestamp never joins calls.
    if (confirmedBlocks.length && !evidence.some((finding) => finding.outcome === 'allowed')) {
      return [{ finding: [...confirmedBlocks].sort(compareFindings)[0], evidence }];
    }
    return evidence.map((finding) => ({ finding, evidence: [finding] }));
  });
  const groups = new Map<string, OverviewFindingGroup>();
  for (const { finding, evidence } of actions) {
    const category =
      finding.status === 'closed' ? 'closed' : finding.outcome === 'blocked' ? 'blocked' : 'review';
    const identity = finding.agent
      ? [finding.agent.provider, finding.agent.id]
      : finding.entityIds.length
      ? [...finding.entityIds].sort()
      : [
          finding.actor?.id ?? finding.actor?.name,
          finding.host?.id ?? finding.host?.name,
          finding.service?.id ?? finding.service?.name,
        ];
    const key = JSON.stringify([
      category,
      finding.policy?.id,
      finding.rule.id ?? finding.rule.name,
      identity.some(Boolean) ? identity : [finding.source.index, finding.source.id],
      finding.action,
      finding.outcome,
      finding.kind,
    ]);
    const group = groups.get(key) ?? { key, category, findings: [], representative: finding };
    group.findings.push(...evidence);
    if (compareFindings(finding, group.representative) < 0) group.representative = finding;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      findings: [...group.findings].sort(compareFindings),
    }))
    .sort((left, right) => {
      const leftSeverity = Math.min(
        ...left.findings.map((finding) => severityOrder[finding.severity])
      );
      const rightSeverity = Math.min(
        ...right.findings.map((finding) => severityOrder[finding.severity])
      );
      return (
        categoryOrder[left.category] - categoryOrder[right.category] ||
        leftSeverity - rightSeverity ||
        Date.parse(right.findings[0].timestamp) - Date.parse(left.findings[0].timestamp)
      );
    });
};
