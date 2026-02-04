/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiCommentList, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export interface ToolProgressUpdate {
  message: string;
  timestamp: Date;
}

interface AiRuleCreationUpdatesProps {
  /** Array of tool progress updates with message and timestamp */
  updates: ToolProgressUpdate[];
}

/**
 * Component that displays AI rule creation progress updates
 * from the agent builder API. Shows tool progress messages in a timeline format.
 */
export const AiRuleCreationUpdates: React.FC<AiRuleCreationUpdatesProps> = ({ updates }) => {
  const comments: EuiCommentProps[] = updates.map((update) => ({
    username: 'Threat Hunting Agent',
    timelineAvatarAriaLabel: 'Tool progress',
    event: (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.aiRuleCreation.agentBuilderUpdates.progress"
        defaultMessage="progress update"
      />
    ),
    timestamp: update.timestamp.toLocaleString(),
    children: (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{update.message}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));

  if (comments.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCommentList
        comments={comments.toReversed()}
        aria-label="AI rule creation progress"
        data-test-subj="ai-rule-updates"
      />
    </>
  );
};
