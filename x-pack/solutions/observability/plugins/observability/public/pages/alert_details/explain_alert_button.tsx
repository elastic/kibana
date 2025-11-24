/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import dedent from 'dedent';
import type { AlertDetailsContextualInsight } from '../../../server/services';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';

export function AlertDetailInvestigateButton({ alert }: { alert: AlertData | null }) {
  const {
    services: { onechat, http },
  } = useKibana();

  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    if (!alert) {
      return;
    }
    try {
      setLoading(true);
      const fields = alert.formatted.fields as Record<string, unknown> | undefined;
      const reason = alert.formatted.reason;

      let obsAlertContext = '';
      try {
        const { alertContext } = await http.get<{ alertContext: AlertDetailsContextualInsight[] }>(
          '/internal/observability/assistant/alert_details_contextual_insights',
          {
            query: {
              alert_started_at: new Date(alert.formatted.start).toISOString(),
              alert_rule_parameter_time_size: alert.formatted.fields[ALERT_RULE_PARAMETERS]
                ?.timeSize as string | undefined,
              alert_rule_parameter_time_unit: alert.formatted.fields[ALERT_RULE_PARAMETERS]
                ?.timeUnit as string | undefined,
              'service.name': (fields?.['service.name'] as string) || undefined,
              'service.environment': (fields?.['service.environment'] as string) || undefined,
              'transaction.type': (fields?.['transaction.type'] as string) || undefined,
              'transaction.name': (fields?.['transaction.name'] as string) || undefined,
              'host.name': (fields?.['host.name'] as string) || undefined,
              'container.id': (fields?.['container.id'] as string) || undefined,
              'kubernetes.pod.name': (fields?.['kubernetes.pod.name'] as string) || undefined,
            },
          }
        );
        obsAlertContext = (alertContext || [])
          .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
          .join('\n\n');
      } catch {
        // ignore
      }
      const initialMessage = dedent(`
            I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.
          `);

      onechat?.openConversationFlyout?.({
        newConversation: true,
        sessionTag: 'observability-alert',
        initialMessage,
        attachments: [
          {
            id: `alert-${alert.formatted.fields['kibana.alert.uuid']}`,
            type: 'observability.alert',
            getContent: async () => {
              const getStr = (key: string) => (fields?.[key] as string | undefined) || undefined;
              return {
                alert: {
                  ruleName: getStr('kibana.alert.rule.name'),
                  startedAt: new Date(alert.formatted.start).toISOString(),
                  reason: reason || undefined,
                  endedAt: getStr('kibana.alert.end'),
                  status:
                    (getStr('kibana.alert.status') as 'active' | 'recovered' | undefined) ||
                    undefined,
                },
                entities: {
                  'service.name': getStr('service.name'),
                  'service.environment': getStr('service.environment'),
                  'transaction.type': getStr('transaction.type'),
                  'transaction.name': getStr('transaction.name'),
                  'host.name': getStr('host.name'),
                  'container.id': getStr('container.id'),
                  'kubernetes.pod.name': getStr('kubernetes.pod.name'),
                },
                relatedSignals: obsAlertContext || undefined,
              };
            },
          },
          {
            id: `instructions-${alert.formatted.fields['kibana.alert.uuid']}`,
            type: 'text',
            getContent: async () => ({
              content: dedent(`
                <contextual_instructions>
I'm an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered, what it means, and what I should do next.


        The user already know the alert reason so do not repeat this: ${alert.formatted.reason}
        Be brief and to the point.
        Do not list the alert details as bullet points.
        Pay special attention to regressions in downstream dependencies like big increases or decreases in throughput, latency or failure rate
        Suggest reasons why the alert happened and what may have contributed to it.
        Present the primary insights in a single paragraph at the top in bold text. Add additional paragraphs with more detailed insights if needed but keep them brief.
        If the alert is a false positive, mention that in the first paragraph.
                </contextual_instructions>
              `),
            }),
          },
        ],
      });
    } catch (e) {
      console.error('Failed to open investigation flyout', e);
    } finally {
      setLoading(false);
    }
  }, [alert, onechat, http]);

  if (!alert) {
    return null;
  }

  if (!onechat?.openConversationFlyout) {
    return null;
  }

  return (
    <EuiButton
      data-test-subj="obsAlertInvestigateButton"
      onClick={onClick}
      isLoading={loading}
      size="s"
    >
      {i18n.translate('xpack.observability.alertDetailInvestigateButton.askAgentButtonLabel', {
        defaultMessage: 'Ask agent',
      })}
    </EuiButton>
  );
}
