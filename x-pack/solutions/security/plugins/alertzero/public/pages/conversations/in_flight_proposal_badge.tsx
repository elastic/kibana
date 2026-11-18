/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsApprovingProposal, useIsDecliningProposal } from '@kbn/proposals-plugin/public';
import { getApprovalOutcomeBadge, ProposedActionStatusBadge } from '@kbn/proposals-ui';

/**
 * Shows the Applying or Declining badge while a decision is sent or an approved action runs.
 * Shows nothing at other times.
 */
export const InFlightProposalBadge = ({
  proposalId,
  isProposalSettling,
  isDecisionShown = false,
}: {
  proposalId: string;
  isProposalSettling?: boolean;
  isDecisionShown?: boolean;
}) => {
  const isApproving = useIsApprovingProposal(proposalId, isDecisionShown);
  const isDeclining = useIsDecliningProposal(proposalId, isDecisionShown);

  const badge = getApprovalOutcomeBadge(
    isApproving || isProposalSettling ? 'applying' : isDeclining ? 'declining' : 'pending'
  );
  if (!badge) return null;

  return (
    <ProposedActionStatusBadge
      color={badge.color}
      iconType={badge.iconType}
      label={badge.label}
      isLoading={badge.isLoading}
      isDisabled={badge.isDisabled}
    />
  );
};
