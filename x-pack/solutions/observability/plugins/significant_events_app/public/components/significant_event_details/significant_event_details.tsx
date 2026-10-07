/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButtonGroup,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SignalVerdict,
  SignalEntry,
  SignificantEvent,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { buildDiscoverParams } from '../../util/discover_helpers';
import { formatTimestamp } from '../../util/formatters';
import { InfoPanel } from '../info_panel';
import { useKibana } from '../../hooks/use_kibana';
import { signalVerdicts } from './signal_verdicts';
import { EvidenceChain } from '../evidence_chain/evidence_chain';
import { useEvidence } from '../evidence_chain/evidence_context';
import { EventImpactMap } from './event_impact_map';
import { changeTypeLabel } from '../../pages/significant_events/components/shared/translations';
import { journey } from '../../pages/detection/journey_translations';

const SignalRow = ({
  signal,
  eventTime,
}: {
  signal: SignalEntry;
  eventTime: string;
}): React.ReactElement => {
  const { dependencies } = useKibana();
  const { href, onNavigate } = useEvidence();
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'eventSignal' });
  const verdict = signalVerdicts[signal.verdict] ?? signalVerdicts.not_checked;
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
  const ruleTarget = {
    kind: 'rule' as const,
    id: signal.metadata.rule_uuid,
    stream: signal.stream_name,
  };
  const detectionTarget = {
    kind: 'detection' as const,
    id: signal.metadata.detection_id,
    ruleId: signal.metadata.rule_uuid,
    stream: signal.stream_name,
  };
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
            <EuiButtonEmpty
              size="s"
              flush="left"
              href={href(ruleTarget)}
              onClick={
                onNavigate
                  ? (event) => {
                      event.preventDefault();
                      onNavigate(ruleTarget);
                    }
                  : undefined
              }
              data-test-subj="significantEventSignalRule"
            >
              {signal.metadata.rule_name}
            </EuiButtonEmpty>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={verdict.color} iconType={verdict.icon}>
            {verdict.label}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBadge color="hollow">{changeTypeLabel(signal.metadata.change_point_type)}</EuiBadge>
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
            href={href(detectionTarget)}
            onClick={
              onNavigate
                ? (event) => {
                    event.preventDefault();
                    onNavigate(detectionTarget);
                  }
                : undefined
            }
          >
            {i18n.translate('xpack.significantEventsApp.evidence.viewRule', {
              defaultMessage: 'Inspect detection',
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
  const { euiTheme } = useEuiTheme();
  const [filter, setFilter] = useState('all');
  const filterId = useGeneratedHtmlId({ prefix: 'eventSignalFilter' });
  const signals = [...(event.signals ?? [])].sort(
    (a, b) =>
      Date.parse(a.collected_at || a.evidence?.time_range?.to || event['@timestamp']) -
      Date.parse(b.collected_at || b.evidence?.time_range?.to || event['@timestamp'])
  );
  const counts = (Object.keys(signalVerdicts) as SignalVerdict[]).map((verdict) => ({
    verdict,
    ...signalVerdicts[verdict],
    count: signals.filter((signal) => signal.verdict === verdict).length,
  }));
  const visible =
    filter === 'all' ? signals : signals.filter((signal) => signal.verdict === filter);
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {(event.summary || event.assessment_note) && (
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          css={css`
            border-left: 3px solid
              ${event.status === 'active' ? euiTheme.colors.danger : euiTheme.colors.mediumShade};
          `}
        >
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.significantEventsApp.eventDetail.happened', {
                defaultMessage: 'What happened',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
          {event.symptom_hypothesis && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <strong>
                  {i18n.translate('xpack.significantEventsApp.eventDetail.impact', {
                    defaultMessage: 'Impact',
                  })}
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <p>{event.symptom_hypothesis}</p>
              </EuiText>
            </>
          )}
          {event.assessment_note && (
            <>
              <EuiSpacer size="m" />
              <div
                css={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.m};
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  border-radius: ${euiTheme.border.radius.medium};
                `}
              >
                <EuiText size="xs" color="subdued">
                  <strong>
                    {i18n.translate('xpack.significantEventsApp.eventDetail.assessment', {
                      defaultMessage: 'Agent assessment',
                    })}
                  </strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  <p>{event.assessment_note}</p>
                </EuiText>
              </div>
            </>
          )}
        </EuiPanel>
      )}
      {signals.length > 0 && (
        <InfoPanel
          title={i18n.translate('xpack.significantEventsApp.eventDetail.balance', {
            defaultMessage: 'Evidence balance',
          })}
        >
          <div
            role="img"
            aria-label={counts
              .filter((item) => item.count)
              .map((item) => `${item.count} ${item.label}`)
              .join(', ')}
            css={css`
              display: flex;
              gap: 3px;
              height: 10px;
              overflow: hidden;
              border-radius: ${euiTheme.border.radius.small};
              margin-bottom: ${euiTheme.size.m};
            `}
          >
            {counts
              .filter((item) => item.count > 0)
              .map((item) => (
                <div
                  key={item.verdict}
                  css={css`
                    flex: ${item.count};
                    background: ${item.verdict === 'confirms'
                      ? euiTheme.colors.danger
                      : item.verdict === 'refutes'
                      ? euiTheme.colors.success
                      : item.verdict === 'inconclusive'
                      ? euiTheme.colors.warning
                      : euiTheme.colors.mediumShade};
                  `}
                />
              ))}
          </div>
          <EuiFlexGroup gutterSize="m" wrap>
            {counts
              .filter((item) => item.count > 0)
              .map((item) => (
                <EuiFlexItem grow={false} key={item.verdict}>
                  <EuiText size="s">
                    <EuiIcon
                      type={item.icon}
                      color={
                        item.verdict === 'confirms'
                          ? 'danger'
                          : item.verdict === 'refutes'
                          ? 'success'
                          : 'subdued'
                      }
                      aria-hidden={true}
                    />{' '}
                    <strong>{item.count}</strong> {item.label}
                  </EuiText>
                </EuiFlexItem>
              ))}
          </EuiFlexGroup>
        </InfoPanel>
      )}
      <EventImpactMap event={event} />
      {signals.length > 0 && (
        <section>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.significantEventsApp.eventDetail.signals', {
                defaultMessage: 'Checked signals · {count}',
                values: { count: signals.length },
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButtonGroup
            legend={i18n.translate('xpack.significantEventsApp.eventDetail.filter', {
              defaultMessage: 'Filter checked signals',
            })}
            buttonSize="compressed"
            idSelected={`${filterId}-${filter}`}
            onChange={(value) => setFilter(value.slice(filterId.length + 1))}
            options={[
              {
                id: `${filterId}-all`,
                label: i18n.translate('xpack.significantEventsApp.eventDetail.all', {
                  defaultMessage: 'All ({count})',
                  values: { count: signals.length },
                }),
              },
              ...counts
                .filter((item) => item.count)
                .map((item) => ({
                  id: `${filterId}-${item.verdict}`,
                  label: `${item.label} (${item.count})`,
                })),
            ]}
          />
          <EuiSpacer size="m" />
          <div
            css={css`
              display: grid;
              gap: ${euiTheme.size.m};
              padding-left: ${euiTheme.size.m};
              border-left: 1px solid ${euiTheme.colors.borderBasePlain};
            `}
          >
            {visible.map((signal, index) => (
              <SignalRow
                key={`${signal.metadata.detection_id}-${index}`}
                signal={signal}
                eventTime={event['@timestamp']}
              />
            ))}
          </div>
        </section>
      )}
      <EvidenceChain
        focus={{
          kind: 'event',
          event: 'created_at' in event ? event : { ...event, created_at: event['@timestamp'] },
        }}
      />
    </EuiFlexGroup>
  );
};
