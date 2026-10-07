/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Detection, ChangePointType } from '@kbn/significant-events-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { FlyoutToolbarHeader } from '../../../../components/flyout_components/flyout_toolbar_header';
import { EvidenceChain } from '../../../../components/evidence_chain/evidence_chain';
import { useEvidence } from '../../../../components/evidence_chain/evidence_context';
import { InfoPanel } from '../../../../components/info_panel';
import { SparkPlot } from '../../../../components/spark_plot';
import { useFetchDetectionHistory } from '../../../../hooks/use_fetch_detections';
import { buildDiscoverParams } from '../../../../util/discover_helpers';
import { formatTimestamp } from '../../../../util/formatters';
import { changeTypeLabel } from '../shared/translations';
import { signalVerdicts } from '../../../../components/significant_event_details/signal_verdicts';

const labels = {
  kind: i18n.translate('xpack.significantEventsApp.detectionDetail.kind', {
    defaultMessage: 'Change-point detection',
  }),
  close: i18n.translate('xpack.significantEventsApp.detectionDetail.close', {
    defaultMessage: 'Close detection',
  }),
  processed: i18n.translate('xpack.significantEventsApp.detectionDetail.processed', {
    defaultMessage: 'Processed',
  }),
  pending: i18n.translate('xpack.significantEventsApp.detectionDetail.pending', {
    defaultMessage: 'Awaiting triage',
  }),
  processing: i18n.translate('xpack.significantEventsApp.detectionDetail.processing', {
    defaultMessage:
      'Discovery consumed this observation. Review linked event assessments for the outcome.',
  }),
  waiting: i18n.translate('xpack.significantEventsApp.detectionDetail.waiting', {
    defaultMessage:
      'The rule observed a change. The engine has not recorded a triage decision for this detection yet.',
  }),
  rule: i18n.translate('xpack.significantEventsApp.detectionDetail.rule', {
    defaultMessage: 'Inspect rule',
  }),
  source: i18n.translate('xpack.significantEventsApp.detectionDetail.source', {
    defaultMessage: 'Source',
  }),
  discover: i18n.translate('xpack.significantEventsApp.detectionDetail.discover', {
    defaultMessage: 'Open in Discover',
  }),
  chart: i18n.translate('xpack.significantEventsApp.detectionDetail.chart', {
    defaultMessage: 'What changed',
  }),
  statistic: i18n.translate('xpack.significantEventsApp.detectionDetail.statistic', {
    defaultMessage: 'Statistical evidence',
  }),
  statisticHint: i18n.translate('xpack.significantEventsApp.detectionDetail.statisticHint', {
    defaultMessage:
      'The observed change-point p-value. Smaller values provide stronger statistical evidence; this is not incident confidence.',
  }),
  triage: i18n.translate('xpack.significantEventsApp.detectionDetail.triage', {
    defaultMessage: 'Where this detection led',
  }),
  error: i18n.translate('xpack.significantEventsApp.detectionDetail.error', {
    defaultMessage: 'Linked event assessments could not be loaded.',
  }),
  retry: i18n.translate('xpack.significantEventsApp.detectionDetail.retry', {
    defaultMessage: 'Retry',
  }),
  noOutcome: i18n.translate('xpack.significantEventsApp.detectionDetail.noOutcome', {
    defaultMessage:
      'No linked assessment was found. A processed detection alone does not tell us whether it was noise, a duplicate or below the confidence threshold.',
  }),
  history: i18n.translate('xpack.significantEventsApp.detectionDetail.history', {
    defaultMessage: 'Other observations from this rule',
  }),
  current: i18n.translate('xpack.significantEventsApp.detectionDetail.current', {
    defaultMessage: 'Selected observation',
  }),
  more: i18n.translate('xpack.significantEventsApp.detectionDetail.more', {
    defaultMessage: 'Show all observations',
  }),
  fewer: i18n.translate('xpack.significantEventsApp.detectionDetail.fewer', {
    defaultMessage: 'Show recent observations',
  }),
  noHistory: i18n.translate('xpack.significantEventsApp.detectionDetail.noHistory', {
    defaultMessage: 'No other observations are available.',
  }),
};
const observations: Record<ChangePointType, string> = {
  spike: i18n.translate('xpack.significantEventsApp.observation.spike', {
    defaultMessage: 'A sudden increase in the volume matched by this rule.',
  }),
  dip: i18n.translate('xpack.significantEventsApp.observation.dip', {
    defaultMessage: 'A sudden decrease in the volume matched by this rule.',
  }),
  step_change: i18n.translate('xpack.significantEventsApp.observation.step', {
    defaultMessage: 'The matched volume shifted to a different level.',
  }),
  trend_change: i18n.translate('xpack.significantEventsApp.observation.trend', {
    defaultMessage: 'The direction or rate of the matched volume changed.',
  }),
  distribution_change: i18n.translate('xpack.significantEventsApp.observation.distribution', {
    defaultMessage: 'The distribution of the matched volume changed.',
  }),
  non_stationary: i18n.translate('xpack.significantEventsApp.observation.nonstationary', {
    defaultMessage: 'The matched volume varies without a stable baseline.',
  }),
  stationary: i18n.translate('xpack.significantEventsApp.observation.stationary', {
    defaultMessage:
      'The matched volume is stable. This observation does not establish recovery or health.',
  }),
};

export const DetectionFlyout = ({
  detection,
  onClose,
}: {
  detection: Detection;
  onClose: () => void;
}): React.ReactElement => {
  const { dependencies } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { data, href, onNavigate } = useEvidence();
  const [allHistory, setAllHistory] = useState(false);
  const id = useGeneratedHtmlId({ prefix: 'detectionDetails' });
  const rule = data.queries.find((query) => query.rule_uuid === detection.rule_uuid);
  const ruleTarget = {
    kind: 'rule' as const,
    id: detection.rule_uuid,
    stream: detection.stream_name,
  };
  const sourceTarget = {
    kind: 'source' as const,
    id: detection.stream_name,
    stream: detection.stream_name,
  };
  const outcomes = useQuery({
    queryKey: ['detectionEventEvidence', detection.detection_id],
    queryFn: async ({ signal }) => {
      const repository = dependencies.start.significantEvents.significantEventsRepositoryClient;
      // Existing events can acquire a new signal after their first occurrence; do not filter by creation time.
      const first = await repository.fetch('GET /internal/significant_events/events', {
        signal: signal ?? null,
        params: { query: { stream: detection.stream_name, page: 1, perPage: 1000 } },
      });
      const hits = [...first.hits];
      for (let page = 2; hits.length < first.total; page++) {
        const next = await repository.fetch('GET /internal/significant_events/events', {
          signal: signal ?? null,
          params: { query: { stream: detection.stream_name, page, perPage: 1000 } },
        });
        if (!next.hits.length) break;
        hits.push(...next.hits);
      }
      return hits.filter((event) =>
        event.signals.some(
          (signalEntry) => signalEntry.metadata.detection_id === detection.detection_id
        )
      );
    },
    refetchInterval: 5000,
  });
  const {
    data: historyData,
    isLoading: loadingHistory,
    isError: historyError,
    refetch: retryHistory,
  } = useFetchDetectionHistory(detection.rule_uuid);
  const history = [...(historyData?.hits ?? [])].sort(
    (a, b) => Date.parse(b['@timestamp']) - Date.parse(a['@timestamp'])
  );
  const recent = allHistory ? history : history.slice(0, 6);
  if (!recent.some((entry) => entry.detection_id === detection.detection_id))
    recent.push(detection);
  const range = {
    from: new Date(Date.parse(detection['@timestamp']) - 3600000).toISOString(),
    to: new Date(Date.parse(detection['@timestamp']) + 900000).toISOString(),
  };
  const locator =
    dependencies.start.share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const discoverHref =
    rule && locator
      ? locator.getRedirectUrl(buildDiscoverParams(rule.esql.query, range))
      : undefined;
  const timeseries =
    rule?.occurrences.map((point) => ({ x: Date.parse(point.date), y: point.count })) ?? [];
  const pValue =
    detection.p_value === 0
      ? '0'
      : detection.p_value < 0.0001
      ? detection.p_value.toExponential(2)
      : detection.p_value.toFixed(4);
  return (
    <EuiFlyout
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
      onClose={onClose}
      aria-labelledby={id}
    >
      <FlyoutToolbarHeader>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={labels.close} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              aria-label={labels.close}
              onClick={onClose}
              data-test-subj="detectionFlyoutCloseButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </FlyoutToolbarHeader>
      <EuiFlyoutHeader hasBorder>
        <EuiText size="xs" color="subdued">
          <p>
            <EuiIcon type="visBarVertical" color="warning" aria-hidden={true} /> {labels.kind}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <h2 id={id}>{detection.rule_name || detection.rule_uuid}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color={detection.processed ? 'success' : 'warning'}>
              {detection.processed ? labels.processed : labels.pending}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatTimestamp(detection['@timestamp'])}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="database"
          href={href(sourceTarget)}
          onClick={
            onNavigate
              ? (event) => {
                  event.preventDefault();
                  onNavigate(sourceTarget);
                }
              : undefined
          }
          data-test-subj="detectionSourceLink"
        >
          {detection.stream_name}
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          css={css`
            border-left: 3px solid ${euiTheme.colors.warning};
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{changeTypeLabel(detection.change_point_type)}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.statisticHint}>
                <EuiBadge color="hollow" tabIndex={0}>
                  p = {pValue}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>{observations[detection.change_point_type]}</p>
          </EuiText>
          {timeseries.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <SparkPlot
                id={`detection-${detection.detection_id}`}
                name={labels.chart}
                type="bar"
                timeseries={timeseries}
                height={150}
                annotations={[
                  {
                    id: detection.detection_id,
                    x: Date.parse(detection['@timestamp']),
                    color: euiTheme.colors.warning,
                    label: formatTimestamp(detection['@timestamp']),
                    icon: <EuiIcon type="dot" color="warning" aria-hidden={true} />,
                  },
                ]}
              />
            </>
          )}
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="left"
                iconType="visLine"
                href={href(ruleTarget)}
                onClick={
                  onNavigate
                    ? (event) => {
                        event.preventDefault();
                        onNavigate(ruleTarget);
                      }
                    : undefined
                }
                data-test-subj="detectionViewRule"
              >
                {labels.rule}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {discoverHref && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="discoverApp"
                  href={discoverHref}
                  target="_blank"
                  data-test-subj="detectionOpenDiscover"
                >
                  {labels.discover}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="l" />
        <InfoPanel title={labels.triage}>
          <EuiText size="s">
            <p>{detection.processed ? labels.processing : labels.waiting}</p>
          </EuiText>
          {outcomes.isLoading && <EuiLoadingSpinner size="s" />}
          {outcomes.isError && (
            <EuiCallOut announceOnMount size="s" color="warning" title={labels.error}>
              <EuiButtonEmpty
                size="xs"
                onClick={() => void outcomes.refetch()}
                data-test-subj="detectionRetryOutcomes"
              >
                {labels.retry}
              </EuiButtonEmpty>
            </EuiCallOut>
          )}
          {outcomes.data?.map((event) => {
            const signal = event.signals.find(
              (entry) => entry.metadata.detection_id === detection.detection_id
            );
            const verdict = signalVerdicts[signal?.verdict ?? 'not_checked'];
            const target = { kind: 'event' as const, id: event.event_id };
            return (
              <EuiPanel key={event.event_id} paddingSize="s" hasBorder hasShadow={false}>
                <EuiBadge color={verdict.color} iconType={verdict.icon}>
                  {verdict.label}
                </EuiBadge>
                <EuiButtonEmpty
                  size="s"
                  flush="left"
                  href={href(target)}
                  onClick={
                    onNavigate
                      ? (e) => {
                          e.preventDefault();
                          onNavigate(target);
                        }
                      : undefined
                  }
                  data-test-subj="detectionLinkedEvent"
                >
                  {event.title}
                </EuiButtonEmpty>
                <EuiText size="xs" color="subdued">
                  <p>{signal?.description || event.assessment_note}</p>
                </EuiText>
              </EuiPanel>
            );
          })}
          {detection.processed &&
            !outcomes.isLoading &&
            !outcomes.isError &&
            !outcomes.data?.length && (
              <EuiText size="xs" color="subdued">
                <p>{labels.noOutcome}</p>
              </EuiText>
            )}
        </InfoPanel>
        <EuiSpacer size="l" />
        <EvidenceChain focus={{ kind: 'detection', detection }} events={outcomes.data} />
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>{labels.history}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        {loadingHistory && <EuiLoadingSpinner size="s" />}
        {historyError && (
          <EuiButtonEmpty
            size="xs"
            onClick={() => void retryHistory()}
            data-test-subj="detectionRetryHistory"
          >
            {labels.retry}
          </EuiButtonEmpty>
        )}
        {!loadingHistory && !historyError && history.length === 0 && (
          <EuiText size="xs" color="subdued">
            {labels.noHistory}
          </EuiText>
        )}
        <EuiTimeline aria-label={labels.history} gutterSize="s">
          {recent.map((entry) => {
            const selected = entry.detection_id === detection.detection_id;
            const target = {
              kind: 'detection' as const,
              id: entry.detection_id,
              stream: entry.stream_name,
              ruleId: entry.rule_uuid,
            };
            return (
              <EuiTimelineItem
                key={entry.detection_id}
                icon={selected ? 'visBarVertical' : 'dot'}
                iconAriaLabel={changeTypeLabel(entry.change_point_type)}
              >
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      href={href(target)}
                      onClick={
                        onNavigate
                          ? (e) => {
                              e.preventDefault();
                              onNavigate(target);
                            }
                          : undefined
                      }
                      data-test-subj="detectionHistoryObservation"
                    >
                      {changeTypeLabel(entry.change_point_type)} ·{' '}
                      {formatTimestamp(entry['@timestamp'])}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={selected ? 'primary' : 'hollow'}>
                      {selected
                        ? labels.current
                        : entry.processed
                        ? labels.processed
                        : labels.pending}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiTimelineItem>
            );
          })}
        </EuiTimeline>
        {history.length > 6 && (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => setAllHistory(!allHistory)}
            data-test-subj="detectionExpandHistory"
          >
            {allHistory ? labels.fewer : labels.more}
          </EuiButtonEmpty>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
