/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  getSeverityLabel,
  SEVERITY_OPTIONS,
  type Detection,
  type SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import { formatTimestamp } from '../../util/formatters';
import { changeTypeLabel } from '../significant_events/components/shared/translations';
import { journey } from './journey_translations';
import { labels } from './translations';

type FeedItem =
  | { kind: 'detection'; detection: Detection; timestamp: string; id: string }
  | { kind: 'event'; event: SignificantEventResponse; timestamp: string; id: string };

export const DetectionEventsFeed = ({
  detections,
  events,
  onOpenDetection,
  onOpenEvent,
}: {
  detections: Detection[];
  events: SignificantEventResponse[];
  onOpenDetection: (detection: Detection) => void;
  onOpenEvent: (event: SignificantEventResponse) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'detectionEventsFilter' });
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [sort, setSort] = useState('significantFirst');
  const [limit, setLimit] = useState(30);
  const items = useMemo(() => {
    const merged: FeedItem[] = [
      ...detections.map(
        (detection): FeedItem => ({
          kind: 'detection',
          detection,
          timestamp: detection['@timestamp'],
          id: `detection:${detection.detection_id}`,
        })
      ),
      ...events.map(
        (event): FeedItem => ({
          kind: 'event',
          event,
          timestamp: event.created_at,
          id: `event:${event.event_id}`,
        })
      ),
    ];
    return merged
      .filter((item) => {
        if (severity !== 'all' && (item.kind !== 'event' || item.event.severity !== severity))
          return false;
        if (kind !== 'all' && item.kind !== kind) return false;
        const text =
          item.kind === 'detection'
            ? `${item.detection.rule_name ?? ''} ${item.detection.stream_name} ${
                item.detection.change_point_type
              }`
            : `${item.event.title} ${item.event.summary} ${item.event.stream_names.join(' ')}`;
        if (!text.toLowerCase().includes(search.toLowerCase())) return false;
        if (status === 'all') return true;
        if (item.kind === 'event') return item.event.status === status;
        return status === 'processed'
          ? item.detection.processed
          : status === 'pending'
          ? !item.detection.processed
          : false;
      })
      .sort(
        (a, b) =>
          (sort === 'significantFirst'
            ? Number(b.kind === 'event') - Number(a.kind === 'event')
            : 0) ||
          (sort === 'severity'
            ? (b.kind === 'event'
                ? SEVERITY_OPTIONS.length - SEVERITY_OPTIONS.indexOf(b.event.severity)
                : 0) -
              (a.kind === 'event'
                ? SEVERITY_OPTIONS.length - SEVERITY_OPTIONS.indexOf(a.event.severity)
                : 0)
            : 0) ||
          Date.parse(b.timestamp) - Date.parse(a.timestamp)
      );
  }, [detections, events, kind, search, status, severity, sort]);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l" data-test-subj="detectionMixedEventsFeed">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{labels.browseEvents}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={labels.eventType}
            buttonSize="compressed"
            idSelected={`${id}-${kind}`}
            onChange={(value) => {
              setKind(value.slice(id.length + 1));
              setLimit(30);
            }}
            options={[
              {
                id: `${id}-all`,
                label: `${labels.allActivity} (${detections.length + events.length})`,
              },
              {
                id: `${id}-detection`,
                label: `${labels.detections} (${detections.length})`,
                iconType: 'visLine',
              },
              { id: `${id}-event`, label: `${labels.events} (${events.length})`, iconType: 'bell' },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="significantEventsAppDetectionEventsFeedFieldSearch"
            compressed
            fullWidth
            aria-label={labels.searchEvents}
            placeholder={labels.searchEvents}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(30);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            data-test-subj="significantEventsAppDetectionEventsFeedSelect"
            compressed
            aria-label={labels.eventStatus}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setLimit(30);
            }}
            options={[
              { value: 'all', text: labels.allStatuses },
              {
                value: 'active',
                text: i18n.translate('xpack.significantEventsApp.feed.active', {
                  defaultMessage: 'Active',
                }),
              },
              {
                value: 'inactive',
                text: i18n.translate('xpack.significantEventsApp.feed.inactive', {
                  defaultMessage: 'Inactive',
                }),
              },
              { value: 'pending', text: labels.pendingDetection },
              { value: 'processed', text: labels.processedDetection },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSelect
            data-test-subj="significantEventsAppDetectionEventsFeedSelect"
            compressed
            aria-label={i18n.translate('xpack.significantEventsApp.feed.severity', {
              defaultMessage: 'Severity',
            })}
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setLimit(30);
            }}
            options={[
              {
                value: 'all',
                text: i18n.translate('xpack.significantEventsApp.feed.allSeverities', {
                  defaultMessage: 'All severities',
                }),
              },
              ...SEVERITY_OPTIONS.map((value) => ({ value, text: getSeverityLabel(value) })),
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            data-test-subj="significantEventsAppDetectionEventsFeedSelect"
            compressed
            aria-label={i18n.translate('xpack.significantEventsApp.feed.sort', {
              defaultMessage: 'Sort events',
            })}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setLimit(30);
            }}
            options={[
              {
                value: 'significantFirst',
                text: i18n.translate('xpack.significantEventsApp.feed.significantFirst', {
                  defaultMessage: 'Significant events first',
                }),
              },
              {
                value: 'recent',
                text: i18n.translate('xpack.significantEventsApp.feed.newest', {
                  defaultMessage: 'Newest first',
                }),
              },
              {
                value: 'severity',
                text: i18n.translate('xpack.significantEventsApp.feed.highest', {
                  defaultMessage: 'Highest severity first',
                }),
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {items.length === 0 ? (
        <EuiEmptyPrompt
          paddingSize="s"
          titleSize="xs"
          iconType="bell"
          title={<h3>{labels.noMatchingEvents}</h3>}
          body={<p>{labels.noEventsBody}</p>}
        />
      ) : (
        items.slice(0, limit).map((item) => {
          const isEvent = item.kind === 'event';
          const color = isEvent ? euiTheme.colors.accent : euiTheme.colors.warning;
          return (
            <article
              key={item.id}
              css={css`
                display: grid;
                grid-template-columns: 30px minmax(0, 1fr);
                gap: ${euiTheme.size.m};
                border: 1px solid ${euiTheme.colors.borderBasePlain};
                border-left: 3px solid ${color};
                border-radius: ${euiTheme.border.radius.medium};
                padding: ${isEvent ? euiTheme.size.l : euiTheme.size.m};
                margin-bottom: ${euiTheme.size.s};
                background: ${isEvent
                  ? `color-mix(in srgb, ${color} 4%, ${euiTheme.colors.backgroundBasePlain})`
                  : euiTheme.colors.backgroundBasePlain};
              `}
            >
              <div
                css={css`
                  width: 30px;
                  height: 30px;
                  display: grid;
                  place-items: center;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: color-mix(in srgb, ${color} 12%, transparent);
                `}
              >
                <EuiIcon type={isEvent ? 'bell' : 'visLine'} color={color} aria-hidden={true} />
              </div>
              <div>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      <p>
                        {isEvent ? labels.significantEvent : labels.ruleFired} ·{' '}
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {item.kind === 'event'
                        ? { open: labels.open, closed: labels.closed, dismissed: labels.dismissed }[
                            item.event.status
                          ]
                        : item.detection.processed
                        ? labels.processedDetection
                        : labels.pendingDetection}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiButtonEmpty
                  data-test-subj="significantEventsAppDetectionEventsFeedButton"
                  size="s"
                  flush="left"
                  onClick={() =>
                    item.kind === 'event'
                      ? onOpenEvent(item.event)
                      : onOpenDetection(item.detection)
                  }
                  css={css`
                    height: auto;
                    text-align: left;
                  `}
                >
                  {item.kind === 'event'
                    ? item.event.title
                    : item.detection.rule_name || item.detection.rule_uuid}
                </EuiButtonEmpty>
                {item.kind === 'event' ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="s">
                      <p>{item.event.summary}</p>
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={
                            item.event.severity === 'critical' || item.event.severity === 'high'
                              ? 'danger'
                              : 'hollow'
                          }
                        >
                          {getSeverityLabel(item.event.severity)}
                        </EuiBadge>
                      </EuiFlexItem>
                      {Boolean(item.event.investigations?.length) && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color={
                              item.event.investigations?.some((run) => !run.completed_at)
                                ? 'primary'
                                : 'hollow'
                            }
                            iconType="inspect"
                          >
                            {journey.investigations} ·{' '}
                            {item.event.investigations?.some((run) => !run.completed_at)
                              ? journey.inProgress
                              : journey.completed}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>
                        <EuiText size="xs" color="subdued">
                          <p>{item.event.stream_names.join(' · ')}</p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          data-test-subj="significantEventsAppDetectionEventsFeedButton"
                          size="xs"
                          iconType="sortRight"
                          iconSide="right"
                          onClick={() => onOpenEvent(item.event)}
                        >
                          {labels.openEvent}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                ) : (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning">
                          {changeTypeLabel(item.detection.change_point_type)}
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs" color="subdued">
                          <p>{item.detection.stream_name}</p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          data-test-subj="significantEventsAppDetectionEventsFeedButton"
                          size="xs"
                          onClick={() => onOpenDetection(item.detection)}
                        >
                          {labels.detectionEvidence}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
              </div>
            </article>
          );
        })
      )}
      {items.length > limit && (
        <EuiButtonEmpty
          data-test-subj="significantEventsAppDetectionEventsFeedButton"
          size="s"
          onClick={() => setLimit(limit + 30)}
        >
          {labels.showMore}
        </EuiButtonEmpty>
      )}
    </EuiPanel>
  );
};
