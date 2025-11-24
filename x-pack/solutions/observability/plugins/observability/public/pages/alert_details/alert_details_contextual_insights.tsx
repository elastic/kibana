/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { UiAttachment } from '@kbn/onechat-plugin/public/embeddable/types';
import { OpenAgentChatButton } from '@kbn/contextual-insights-button';

const OBSERVABILITY_AGENT_ID = 'observability.agent';
import { useKibana } from '../../utils/kibana_react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { onechat },
  } = useKibana();

  const attachments: UiAttachment[] = useMemo(() => {
    if (!alert) {
      return [];
    }

    const fields = alert.formatted.fields as unknown as
      | Record<string, string | string[]>
      | undefined;
    if (!fields) {
      return [];
    }

    const attachmentList: UiAttachment[] = [];

    const alertStartTime = new Date(alert.formatted.start).toISOString();
    const alertLastUpdate = new Date(alert.formatted.lastUpdated).toISOString();
    const currentTime = new Date().toISOString();
    const timeRangeStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const timeRangeEnd = currentTime;

    const screenDescription = `The user is looking at ${window.location.href}. The current time range is ${timeRangeStart} - ${timeRangeEnd}.

The user is looking at an active alert. It started at ${alertStartTime}, and was last updated at ${alertLastUpdate}.

The reason given for the alert is ${alert.formatted.reason}.

Use the following alert fields as background information for generating a response. Do not list them as bullet points in the response.`;

    // Add screen description attachment
    attachmentList.push({
      id: 'alert-screen-description',
      type: 'text',
      getContent: async () => ({
        content: screenDescription,
      }),
    });

    // Build alert fields content
    const alertFieldsContent = Object.entries(fields)
      .map(([key, value]) => {
        const formattedValue =
          typeof value === 'object' && value !== null && !Array.isArray(value)
            ? JSON.stringify(value)
            : Array.isArray(value)
            ? JSON.stringify(value)
            : value;
        return `${key}: ${formattedValue}`;
      })
      .join('\n');

    // Add alert fields attachment
    attachmentList.push({
      id: 'alert-fields-data',
      type: 'text',
      getContent: async () => ({
        content: `Alert Fields:\n\n${alertFieldsContent}`,
      }),
    });

    return attachmentList;
  }, [alert]);
  const uniqueSessionTagRef = useRef<string | null>(null);
  if (!uniqueSessionTagRef.current) {
    uniqueSessionTagRef.current = `observability-alert-details-${Date.now()}`;
  }
  const uniqueSessionTag = uniqueSessionTagRef.current;

  // Don't render the button if onechat service is not available
  if (!onechat) {
    return null;
  }

  return (
    <OpenAgentChatButton
      attachments={attachments}
      agentId={OBSERVABILITY_AGENT_ID}
      sessionTag={uniqueSessionTag}
      initialMessage={
        "I'm looking at an alert and trying to understand why it was triggered. Can you help me understand what happened and what I should do next?"
      }
      label={i18n.translate(
        'xpack.observability.alertDetailContextualInsights.InsightButtonLabel',
        {
          defaultMessage: 'Help me understand this alert',
        }
      )}
      data-test-subj="observability-alert-details-open-chat-button"
      onechat={onechat}
    />
  );
}
//
//  return observabilityAIAssistant.getContextualInsightMessages({
//         message: `I'm looking at an alert and trying to understand why it was triggered`,
//         instructions: dedent(
//           `I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.

//         The following contextual information is available to help you understand the alert:
//         ${obsAlertContext}

//         The user already know the alert reason so do not repeat this: ${alert.formatted.reason}
//         Be brief and to the point.
//         Do not list the alert details as bullet points.
//         Pay special attention to regressions in downstream dependencies like big increases or decreases in throughput, latency or failure rate
//         Suggest reasons why the alert happened and what may have contributed to it.
//         Present the primary insights in a single paragraph at the top in bold text. Add additional paragraphs with more detailed insights if needed but keep them brief.
//         If the alert is a false positive, mention that in the first paragraph.
//         `
//         ),
