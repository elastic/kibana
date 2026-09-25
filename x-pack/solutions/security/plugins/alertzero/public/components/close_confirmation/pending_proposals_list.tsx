/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { ClosePreviewProposal } from '@kbn/agentic-investigations-plugin/common';
import * as i18n from './translations';

const MAX_SHOWN = 10;

export interface PendingProposalsListProps {
  proposals: ClosePreviewProposal[];
  totalCount: number;
  'data-test-subj'?: string;
}

/**
 * Renders the names of pending proposals to be dismissed, capped at `MAX_SHOWN`
 * with a "and N more" footer when there are additional ones.
 */
export const PendingProposalsList: React.FC<PendingProposalsListProps> = ({
  proposals,
  totalCount,
  'data-test-subj': testSubj,
}) => {
  if (proposals.length === 0) return null;

  const shown = proposals.slice(0, MAX_SHOWN);
  const hiddenCount = totalCount - shown.length;

  return (
    <EuiText size="s" data-test-subj={testSubj}>
      <ul>
        {shown.map((p) => (
          <li key={p.id}>{p.action_name ?? i18n.NO_AUTOMATED_ACTION_LABEL}</li>
        ))}
        {hiddenCount > 0 && (
          <li>
            <em>{i18n.MORE_PROPOSALS(hiddenCount)}</em>
          </li>
        )}
      </ul>
    </EuiText>
  );
};
