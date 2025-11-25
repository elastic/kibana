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
const OBSERVABILITY_ALERT_ATTACHMENT_TYPE = 'observability.alert';
import { useKibana } from '../../utils/kibana_react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';

const OBSERVABILITY_AGENT_FEATURE_FLAG = 'observabilityAgent.enabled';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { onechat, featureFlags },
  } = useKibana();

  const attachments: UiAttachment[] = useMemo(() => {
    if (!alert) {
      return [];
    }

    const alertId =
      (alert.formatted?.fields?.['kibana.alert.uuid'] as string | undefined) ||
      (alert.raw?._id as string | undefined) ||
      '';

    if (!alertId) {
      return [];
    }

    return [
      {
        id: 'alert',
        type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
        getContent: async () => ({
          alertId,
        }),
      },
    ];
  }, [alert]);
  const uniqueSessionTagRef = useRef<string | null>(null);
  if (!uniqueSessionTagRef.current) {
    uniqueSessionTagRef.current = `observability-alert-details-${Date.now()}`;
  }
  const uniqueSessionTag = uniqueSessionTagRef.current;

  const isObservabilityAgentEnabled = featureFlags?.getBooleanValue(
    OBSERVABILITY_AGENT_FEATURE_FLAG,
    false
  );

  if (!isObservabilityAgentEnabled || !onechat) {
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
