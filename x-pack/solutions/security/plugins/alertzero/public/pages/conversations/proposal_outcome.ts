/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalItem } from '../../../common/proposals/list';

const AUTO = i18n.translate('xpack.alertzero.proposalOutcome.auto', { defaultMessage: 'Auto' });

const EXPIRED = i18n.translate('xpack.alertzero.proposalOutcome.expired', {
  defaultMessage: 'Expired',
});

const DECLINED = i18n.translate('xpack.alertzero.proposalOutcome.declined', {
  defaultMessage: 'Declined',
});

const approvedBy = (name: string) =>
  i18n.translate('xpack.alertzero.proposalOutcome.approvedBy', {
    defaultMessage: 'Approved by {name}',
    values: { name },
  });

const declinedBy = (name: string) =>
  i18n.translate('xpack.alertzero.proposalOutcome.declinedBy', {
    defaultMessage: 'Declined by {name}',
    values: { name },
  });

/**
 * How a closed proposal was settled, `undefined` while it is still open. Derived
 * here because only the raw proposal carries `decision` and `decidedBy`.
 */
export const proposalOutcome = ({
  decision,
  decidedBy,
  status,
  expired,
}: ProposalItem): string | undefined => {
  // Nobody answered, so there is no decision to attribute.
  if (!decision) {
    return status === 'expired' || expired ? EXPIRED : undefined;
  }

  // Nothing writes a synthetic system user, so an unattributed approval is the only
  // signal that a policy approved it. An unattributed dismissal is not its mirror —
  // that is a decline whose decider could not be resolved — so it stays Declined.
  const name = decidedBy?.fullName ?? decidedBy?.username;
  if (!name) {
    return decision === 'approved' ? AUTO : DECLINED;
  }

  return decision === 'approved' ? approvedBy(name) : declinedBy(name);
};
