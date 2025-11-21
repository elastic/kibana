/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { UiAttachment } from '@kbn/onechat-plugin/public/embeddable/types';
import { OpenAgentChatButton } from '@kbn/contextual-insights-button';
import { type AlertDetailsContextualInsight } from '../../../server/services';

const OBSERVABILITY_AGENT_ID = 'observability.agent';
import { useKibana } from '../../utils/kibana_react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';

export function AlertDetailContextualInsights({ alert }: { alert: AlertData | null }) {
  const {
    services: { http },
  } = useKibana();

  // Fetch alert context, maybe use useEffect is not best choice, but it was the fastest one to start
  const [alertContext, setAlertContext] = useState<AlertDetailsContextualInsight[] | null>(null);

  useEffect(() => {
    if (!alert) {
      setAlertContext(null);
      return;
    }

    const fields = alert.formatted.fields as unknown as
      | Record<string, string | string[]>
      | undefined;
    if (!fields) {
      setAlertContext(null);
      return;
    }

    let cancelled = false;

    http
      .get<{ alertContext: AlertDetailsContextualInsight[] }>(
        '/internal/observability/assistant/alert_details_contextual_insights',
        {
          query: {
            alert_started_at: new Date(alert.formatted.start).toISOString(),

            // alert fields used for log rate analysis
            alert_rule_parameter_time_size: alert.formatted.fields[ALERT_RULE_PARAMETERS]
              ?.timeSize as string | undefined,
            alert_rule_parameter_time_unit: alert.formatted.fields[ALERT_RULE_PARAMETERS]
              ?.timeUnit as string | undefined,

            // service fields
            'service.name': fields['service.name'],
            'service.environment': fields['service.environment'],
            'transaction.type': fields['transaction.type'],
            'transaction.name': fields['transaction.name'],

            // infra fields
            'host.name': fields['host.name'],
            'container.id': fields['container.id'],
            'kubernetes.pod.name': fields['kubernetes.pod.name'],
          },
        }
      )
      .then(({ alertContext: context }) => {
        if (!cancelled) {
          setAlertContext(context);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('An error occurred while fetching alert context', e);
          setAlertContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [alert, http]);

  // Create attachments from alert context
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

    // Add screen context attachment
    attachmentList.push({
      id: 'alert-screen-context',
      type: 'screen_context',
      getContent: async () => ({
        app: 'observability',
        url: window.location.href,
        description: 'Alert details page',
        additional_data: {
          alert_id: alert.formatted.fields['kibana.alert.uuid'] || '',
          alert_name: alert.formatted.fields['kibana.alert.rule.name'] || '',
          alert_reason: alert.formatted.reason || '',
        },
      }),
    });

    if (alertContext && alertContext.length > 0) {
      const alertContextText = alertContext
        .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
        .join('\n\n');

      attachmentList.push({
        id: 'alert-context',
        type: 'text',
        getContent: async () => ({
          content: `Alert Context Information:\n\n${alertContextText}\n\nAlert Reason: ${alert.formatted.reason}`,
        }),
      });
    } else {
      attachmentList.push({
        id: 'alert-basic-info',
        type: 'text',
        getContent: async () => ({
          content: `Alert Reason: ${alert.formatted.reason}`,
        }),
      });
    }

    const relevantFields = Object.entries(fields)
      .filter(
        ([key]) =>
          key.startsWith('kibana.alert.') ||
          key.startsWith('service.') ||
          key === 'host.name' ||
          key === 'container.id' ||
          key === 'kubernetes.pod.name'
      )
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');

    if (relevantFields) {
      attachmentList.push({
        id: 'alert-fields',
        type: 'text',
        getContent: async () => ({
          content: `Alert Fields:\n${relevantFields}`,
        }),
      });
    }

    return attachmentList;
  }, [alert, alertContext]);
  const uniqueSessionTagRef = useRef<string | null>(null);
  if (!uniqueSessionTagRef.current) {
    uniqueSessionTagRef.current = `observability-alert-details-${Date.now()}`;
  }
  const uniqueSessionTag = uniqueSessionTagRef.current;

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

