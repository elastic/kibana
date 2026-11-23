/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredDecision } from '../../../alert_triage/fp_decisions';

/**
 * The note an alert gets when a decision closed it or kept it out of analysis. It says which
 * decision acted, who decided and when, and how to take the decision back.
 */
export const noteText = (decision: StoredDecision, action: 'closed' | 'skipped'): string => {
  const by = (verb: string) =>
    [
      decision.approver ? `${verb} by ${decision.approver}` : verb,
      decision.decidedAt ? `on ${decision.decidedAt.slice(0, 10)}` : '',
      decision.proposalId ? `(proposal ${decision.proposalId})` : '',
    ]
      .filter(Boolean)
      .join(' ');
  const what =
    action === 'closed'
      ? `**Closed by AlertZero** as a false positive, without analysis. It has exactly the pattern of decision \`${
          decision.id
        }\`, ${by('approved')}.`
      : `**Kept out of analysis by AlertZero.** It has exactly the pattern of a dismissed proposal (\`${
          decision.id
        }\`, ${by('dismissed')}), so it is marked inconclusive and no closure is proposed.`;
  return [
    what,
    '',
    `To take the decision back, run the workflow \`system-security-floor-alert-triage-revoke-decision\` with \`decision_id: ${decision.id}\`.`,
  ].join('\n');
};
