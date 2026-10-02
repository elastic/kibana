/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SignalEntry,
  SignificantEvent,
  SignificantEventResponse,
  SignalVerdict,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { buildDiscoverParams } from '../../util/discover_helpers';
import { formatTimestamp } from '../../util/formatters';
import { InfoPanel } from '../info_panel';
import { useKibana } from '../../hooks/use_kibana';
import { journey } from '../../pages/detection/journey_translations';

const verdicts: Record<SignalVerdict, { label: string; color: string; icon: string }> = {
  confirms: {
    label: i18n.translate('xpack.significantEventsApp.evidence.confirms', {
      defaultMessage: 'Confirms',
    }),
    color: 'danger',
    icon: 'checkCircleFill',
  },
  refutes: {
    label: i18n.translate('xpack.significantEventsApp.evidence.refutes', {
      defaultMessage: 'Refutes',
    }),
    color: 'success',
    icon: 'crossCircle',
  },
  off_topic: {
    label: i18n.translate('xpack.significantEventsApp.evidence.offTopic', {
      defaultMessage: 'Unrelated to this rule',
    }),
    color: 'hollow',
    icon: 'branch',
  },
  inconclusive: {
    label: i18n.translate('xpack.significantEventsApp.evidence.inconclusive', {
      defaultMessage: 'Inconclusive',
    }),
    color: 'warning',
    icon: 'question',
  },
  not_checked: {
    label: i18n.translate('xpack.significantEventsApp.evidence.notChecked', {
      defaultMessage: 'Not checked',
    }),
    color: 'hollow',
    icon: 'clock',
  },
};
const SignalRow = ({
  signal,
  eventTime,
}: {
  signal: SignalEntry;
  eventTime: string;
}): React.ReactElement => {
  const { core, dependencies } = useKibana();
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'eventSignal' });
  const verdict = verdicts[signal.verdict] ?? verdicts.not_checked;
  const timeRange = signal.evidence?.time_range ?? {
    from: new Date(Date.parse(eventTime) - 3600000).toISOString(),
    to: eventTime,
  };
  const locator =
    dependencies.start.share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  // Bind the agent's exact verification window, including queries with time placeholders.
  const evidenceQuery = signal.evidence?.esql_query
    .replaceAll('?_tstart', `TO_DATETIME("${timeRange.from}")`)
    .replaceAll('?_tend', `TO_DATETIME("${timeRange.to}")`);
  const discoverHref =
    evidenceQuery && locator
      ? locator.getRedirectUrl(buildDiscoverParams(evidenceQuery, timeRange))
      : undefined;
  const ruleHref = core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: `/detection?${new URLSearchParams({
      view: 'rules',
      ruleId: signal.metadata.rule_uuid,
      stream: signal.stream_name,
      rangeFrom: timeRange.from,
      rangeTo: timeRange.to,
    })}`,
  });
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      css={css`
        border-left: 3px solid
          ${signal.verdict === 'confirms'
            ? euiTheme.colors.danger
            : signal.verdict === 'refutes'
            ? euiTheme.colors.success
            : euiTheme.colors.borderBasePlain};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{signal.metadata.rule_name}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={verdict.color} iconType={verdict.icon}>
            {verdict.label}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>{signal.description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              {signal.stream_name} · {formatTimestamp(signal.collected_at || eventTime)}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="significantEventsAppSignalRowViewRuleButton"
            size="xs"
            href={ruleHref}
          >
            {i18n.translate('xpack.significantEventsApp.evidence.viewRule', {
              defaultMessage: 'View rule',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {discoverHref && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="discoverApp"
              href={discoverHref}
              target="_blank"
              data-test-subj="significantEventDetailsOpenInDiscoverLink"
            >
              {journey.openDiscover}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {evidenceQuery && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={id}
            buttonContent={i18n.translate('xpack.significantEventsApp.evidence.query', {
              defaultMessage: 'See verification query',
            })}
            paddingSize="s"
          >
            <EuiText size="xs" color="subdued">
              <p>
                {formatTimestamp(timeRange.from)} → {formatTimestamp(timeRange.to)} ·{' '}
                {signal.evidence?.result}
              </p>
            </EuiText>
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
              {evidenceQuery}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  );
};

export const SignificantEventDetails = ({
  event,
}: {
  event: SignificantEvent | SignificantEventResponse;
}): React.ReactElement => {
  const { core } = useKibana();
  const { euiTheme } = useEuiTheme();
  const signals = event.signals ?? [];
  const knowledgeHref = (id: string, stream?: string) =>
    core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
      path: `/knowledge?${new URLSearchParams({ knowledgeId: id, ...(stream ? { stream } : {}) })}`,
    });
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <InfoPanel
          title={i18n.translate('xpack.significantEventsApp.evidence.summary', {
            defaultMessage: 'What happened',
          })}
        >
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      )}
      {(event.symptom_hypothesis || event.assessment_note) && (
        <InfoPanel
          title={i18n.translate('xpack.significantEventsApp.evidence.reasoning', {
            defaultMessage: 'Why this matters',
          })}
        >
          <EuiText size="s">
            {event.symptom_hypothesis && <p>{event.symptom_hypothesis}</p>}
            {event.assessment_note && <p>{event.assessment_note}</p>}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.significantEventsApp.evidence.confidenceHint', {
                defaultMessage:
                  'Severity describes the assessed impact. Confidence is the agent’s assessment of the evidence; review the supporting and refuting signals below.',
              })}
            </p>
          </EuiText>
        </InfoPanel>
      )}
      {(event.blast_radius?.length ?? 0) > 0 && (
        <InfoPanel
          title={i18n.translate('xpack.significantEventsApp.evidence.affectedTopology', {
            defaultMessage: 'Affected topology',
          })}
        >
          <div
            css={css`
              display: grid;
              gap: ${euiTheme.size.s};
            `}
          >
            {event.blast_radius?.map((entry, index) => (
              <EuiPanel
                key={`${entry.feature_id}-${index}`}
                color="subdued"
                hasShadow={false}
                paddingSize="m"
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={
                        entry.type === 'dependency'
                          ? 'graphApp'
                          : entry.type === 'infrastructure'
                          ? 'boxesVertical'
                          : 'apps'
                      }
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      data-test-subj="significantEventsAppSignificantEventDetailsButton"
                      size="s"
                      flush="left"
                      href={knowledgeHref(entry.feature_id, entry.stream_name)}
                    >
                      {entry.type === 'dependency'
                        ? `${entry.source} → ${entry.target}`
                        : entry.type === 'entity'
                        ? entry.name
                        : entry.title || entry.feature_id}
                    </EuiButtonEmpty>
                    <EuiText size="xs" color="subdued">
                      <p>
                        {entry.type === 'infrastructure' && entry.workloads?.length
                          ? entry.workloads.join(' · ')
                          : entry.stream_name}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            ))}
          </div>
        </InfoPanel>
      )}
      {(event.causal_features?.length ?? 0) > 0 && (
        <InfoPanel title={journey.relatedKnowledge}>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.significantEventsApp.evidence.knowledgeHint', {
                defaultMessage:
                  'Candidate context from learned knowledge. A relationship alone does not establish the cause.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" wrap>
            {event.causal_features?.map((feature) => (
              <EuiFlexItem grow={false} key={`${feature.stream_name}:${feature.feature_id}`}>
                <EuiBadge
                  color="hollow"
                  iconType="documents"
                  href={knowledgeHref(feature.feature_id, feature.stream_name)}
                >
                  {feature.name}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </InfoPanel>
      )}
      {signals.length > 0 && (
        <InfoPanel
          title={i18n.translate('xpack.significantEventsApp.evidence.signals', {
            defaultMessage: 'Signals · {count}',
            values: { count: signals.length },
          })}
        >
          <EuiFlexGroup direction="column" gutterSize="s">
            {signals.map((signal, index) => (
              <SignalRow
                key={`${signal.metadata.detection_id}-${index}`}
                signal={signal}
                eventTime={event['@timestamp']}
              />
            ))}
          </EuiFlexGroup>
        </InfoPanel>
      )}
    </EuiFlexGroup>
  );
};
