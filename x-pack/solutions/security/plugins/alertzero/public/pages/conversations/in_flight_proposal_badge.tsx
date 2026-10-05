/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsApprovingProposal, useIsDecliningProposal } from '@kbn/proposals-plugin/public';
import { getApprovalOutcomeBadge, ProposedActionStatusBadge } from '@kbn/proposals-ui';

/** The Applying/Declining badge while this proposal's decision is being submitted, else nothing. */
export const InFlightProposalBadge = ({ proposalId }: { proposalId: string }) => {
  const isApproving = useIsApprovingProposal(proposalId);
  const isDeclining = useIsDecliningProposal(proposalId);

  const badge = getApprovalOutcomeBadge(
    isApproving ? 'applying' : isDeclining ? 'declining' : 'pending'
  );
  if (!badge) return null;

  return (
    <ProposedActionStatusBadge
      color={badge.color}
      iconType={badge.iconType}
      label={badge.label}
      isLoading={badge.isLoading}
    />
  );
};
