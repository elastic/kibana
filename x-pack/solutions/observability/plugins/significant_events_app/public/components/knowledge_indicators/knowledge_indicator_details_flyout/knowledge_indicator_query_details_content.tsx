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
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Feature, StreamQuery } from '@kbn/significant-events-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../../util/discover_helpers';
import { formatTimestamp } from '../../../util/formatters';
import { RuleControls } from '../../../pages/detection/rule_controls';
import { InfoPanel } from '../../info_panel';
import { SparkPlot } from '../../spark_plot';
import { EvidenceChain } from '../../evidence_chain/evidence_chain';
import { useEvidence } from '../../evidence_chain/evidence_context';
import { changeTypeLabel } from '../../../pages/significant_events/components/shared/translations';

const labels = {
  watches: i18n.translate('xpack.significantEventsApp.ruleDetails.watches', {
    defaultMessage: 'What this rule watches',
  }),
  volume: i18n.translate('xpack.significantEventsApp.ruleDetails.volume', {
    defaultMessage: 'Matched volume over time',
  }),
  matches: i18n.translate('xpack.significantEventsApp.ruleDetails.matches', {
    defaultMessage: 'Matched records',
  }),
  detections: i18n.translate('xpack.significantEventsApp.ruleDetails.detections', {
    defaultMessage: 'Change-point detections',
  }),
  events: i18n.translate('xpack.significantEventsApp.ruleDetails.events', {
    defaultMessage: 'Linked events',
  }),
  scope: i18n.translate('xpack.significantEventsApp.ruleDetails.scope', {
    defaultMessage:
      'In the selected time range. Matching records and change-point detections measure different things.',
  }),
  none: i18n.translate('xpack.significantEventsApp.ruleDetails.none', {
    defaultMessage: 'No occurrence series is available for this time range.',
  }),
  observations: i18n.translate('xpack.significantEventsApp.ruleDetails.observations', {
    defaultMessage: 'Recent observations',
  }),
  query: i18n.translate('xpack.significantEventsApp.ruleDetails.query', {
    defaultMessage: 'Query & generation evidence',
  }),
  discover: i18n.translate('xpack.significantEventsApp.ruleDetails.discover', {
    defaultMessage: 'Open in Discover',
  }),
  descriptionMissing: i18n.translate('xpack.significantEventsApp.ruleDetails.descriptionMissing', {
    defaultMessage: 'This rule has no recorded description.',
  }),
  generated: i18n.translate('xpack.significantEventsApp.ruleDetails.generated', {
    defaultMessage: 'Evidence used to generate this rule',
  }),
};

export function KnowledgeIndicatorQueryDetailsContent({
  query,
  occurrences,
  streamName,
  onUpdated,
}: {
  query: StreamQuery;
  occurrences?: Array<{ x: number; y: number }>;
  streamFeatures?: Feature[];
  streamName?: string;
  onUpdated?: () => void;
}): React.ReactElement {
  const { dependencies } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const { data, href, onNavigate } = useEvidence();
  const queryId = useGeneratedHtmlId({ prefix: 'ruleEvidence' });
  const liveRule = data.queries.find(
    (item) => item.id === query.id && (!streamName || item.stream_name === streamName)
  );
  const detections = data.detections
    .filter((d) => d.rule_uuid === liveRule?.rule_uuid)
    .sort((a, b) => Date.parse(b['@timestamp']) - Date.parse(a['@timestamp']));
  const events = data.events.filter((event) =>
    event.signals.some((s) => s.metadata.rule_uuid === liveRule?.rule_uuid)
  );
  const matches = occurrences?.reduce((sum, point) => sum + point.y, 0) ?? 0;
  const locator =
    dependencies.start.share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const discoverHref = locator?.getRedirectUrl(
    buildDiscoverParams(query.esql.query, timeState.timeRange)
  );
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <InfoPanel
          title={labels.watches}
          headerRightContent={
            <RuleControls query={query} streamName={streamName} onSaved={onUpdated} />
          }
        >
          <EuiText size="s">
            <p>{query.description || labels.descriptionMissing}</p>
          </EuiText>
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiTitle size="xs">
            <h3>{labels.volume}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            {[
              { label: labels.matches, count: matches, icon: 'visBarVertical' },
              { label: labels.detections, count: detections.length, icon: 'visLine' },
              { label: labels.events, count: events.length, icon: 'bell' },
            ].map((item) => (
              <EuiFlexItem key={item.label}>
                <div
                  css={css`
                    padding-left: ${euiTheme.size.s};
                    border-left: 2px solid ${euiTheme.colors.primary};
                  `}
                >
                  <EuiText size="m">
                    <strong>{item.count.toLocaleString(i18n.getLocale())}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {item.label}
                  </EuiText>
                </div>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {occurrences?.length ? (
            <SparkPlot
              id={`rule-${query.id}`}
              name={labels.matches}
              type="bar"
              timeseries={occurrences}
              height={180}
              annotations={detections.map((d) => ({
                id: d.detection_id,
                x: Date.parse(d['@timestamp']),
                color: euiTheme.colors.warning,
                icon: <EuiIcon type="dot" color="warning" aria-hidden={true} />,
                label: `${changeTypeLabel(d.change_point_type)} · ${formatTimestamp(
                  d['@timestamp']
                )}`,
              }))}
            />
          ) : (
            <EuiText size="xs" color="subdued">
              <p>{labels.none}</p>
            </EuiText>
          )}
          <EuiText size="xs" color="subdued">
            <p>{labels.scope}</p>
          </EuiText>
          {discoverHref && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="discoverApp"
              href={discoverHref}
              target="_blank"
              data-test-subj="ruleDetailsDiscover"
            >
              {labels.discover}
            </EuiButtonEmpty>
          )}
        </EuiPanel>
      </EuiFlexItem>
      {detections.length > 0 && (
        <EuiFlexItem grow={false}>
          <InfoPanel title={labels.observations}>
            {detections.slice(0, 4).map((d) => {
              const target = {
                kind: 'detection' as const,
                id: d.detection_id,
                ruleId: d.rule_uuid,
                stream: d.stream_name,
              };
              return (
                <EuiFlexGroup
                  key={d.detection_id}
                  justifyContent="spaceBetween"
                  alignItems="center"
                  gutterSize="s"
                  wrap
                >
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      href={href(target)}
                      onClick={
                        onNavigate
                          ? (event) => {
                              event.preventDefault();
                              onNavigate(target);
                            }
                          : undefined
                      }
                      data-test-subj="ruleDetailsDetection"
                    >
                      {formatTimestamp(d['@timestamp'])}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{changeTypeLabel(d.change_point_type)}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            })}
          </InfoPanel>
        </EuiFlexItem>
      )}
      {liveRule && (
        <EuiFlexItem grow={false}>
          <EvidenceChain focus={{ kind: 'rule', rule: liveRule }} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiAccordion id={queryId} buttonContent={labels.query} paddingSize="m">
          <EuiCodeBlock language="esql" fontSize="s" isCopyable>
            {query.esql.query}
          </EuiCodeBlock>
          {(query.evidence?.length ?? 0) > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <strong>{labels.generated}</strong>
              </EuiText>
              <EuiCodeBlock language="text" fontSize="s" paddingSize="s" isCopyable>
                {query.evidence?.join('\n\n')}
              </EuiCodeBlock>
            </>
          )}
        </EuiAccordion>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
