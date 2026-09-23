/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import type { ConversationDetailsRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export const ALERTS_CONVERSATION_DETAILS_TEST_ID =
  'securitySolutionAgentBuilderAlertsConversationDetails';

export interface AlertsAttachmentData {
  alertIds?: string[];
}

export type AlertsAttachment = Attachment<string, AlertsAttachmentData>;

const toAlertIdStrings = (alertIds: unknown): string[] => {
  if (!Array.isArray(alertIds)) {
    return [];
  }
  return alertIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
};

/** Renders `security.alerts` alert IDs in conversation-details contexts. */
export const AlertsConversationDetailsContent: React.FC<
  ConversationDetailsRenderProps<AlertsAttachment>
> = ({ attachment }) => {
  const { euiTheme } = useEuiTheme();
  const ids = toAlertIdStrings(attachment.data?.alertIds);

  return (
    <EuiText size="xs" css={{ fontFamily: euiTheme.font.familyCode }}>
      <ul
        data-test-subj={ALERTS_CONVERSATION_DETAILS_TEST_ID}
        css={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {ids.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </EuiText>
  );
};
