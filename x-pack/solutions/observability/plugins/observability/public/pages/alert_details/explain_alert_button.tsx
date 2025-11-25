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
            I am looking at an alert that was triggered. I want to understand what it means, what may have caused it, and next steps I can take to investigate it.
          `);

      onechat?.openConversationFlyout?.({
        newConversation: true,
        agentId: 'observability.agent',
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
                <contextual_insight_instructions>
        Purpose: Help an SRE quickly understand likely cause, impact, and next actions for this alert using only the provided context.

        Output shape (plain text):
        - Summary (1–2 sentences): What is likely happening and why it matters. If recovered, acknowledge and reduce urgency. If no strong signals, say “Inconclusive” and briefly note why.
        - Assessment: Most plausible explanation or “Inconclusive” if signals do not support a clear assessment.
        - Related signals (top 3–5, each with provenance and relevance): For each item, include source (change points | errors | log rate | log categories | anomalies | service summary), timeframe near alert start, and relevance to alert scope as Direct | Indirect | Unrelated.
        - Immediate actions (2–3): Concrete next checks or fixes an SRE can take now.

        Guardrails:
        - Do not repeat the alert reason string or rule name verbatim.
        - Only provide a non‑inconclusive Assessment when supported by on‑topic related signals; otherwise set Assessment to “Inconclusive” and do not speculate a cause.
        - Corroboration: prefer assessment supported by multiple independent signal types; if only one source supports it, state that support is limited.
        - If signals are weak or conflicting, state that clearly and recommend the safest next diagnostic step.
        - Do not list raw alert fields as bullet points. Bullets are allowed only for Related signals and Immediate actions.
        - Keep it concise (~150–200 words).

        Related signals hierarchy (use what exists, skip what doesn’t):
        1) Change points (service and exit‑span): sudden shifts in throughput/latency/failure; name impacted downstream services verbatim when present and whether propagation is likely.
        2) Errors: signatures enriched with downstream resource/name; summarize patterns without long stacks; tie to alert scope.
        3) Logs: strongest log‑rate significant items and top categories; very short examples and implications; tie to alert scope.
        4) Anomalies: note ML anomalies around alert time; multiple affected services may imply systemic issues.
        5) Service summary: only details that materially change interpretation (avoid re‑listing fields).

        Recovery / false positives:
        - If recovered or normalizing, recommend light‑weight validation and watchful follow‑up.
        - If inconclusive or signals skew Indirect/Unrelated, state that the alert may be unrelated/noisy and suggest targeted traces/logging for the suspected path.
                </contextual_insight_instructions>
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
