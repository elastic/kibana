/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Criteria, EuiHealthProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EventDocument } from '../../hooks/use_fetch_system_overview';
import { useKibana } from '../../utils/kibana_react';
import { InfoPanel } from './info_panel';
import { RootCausePanel } from './root_cause_panel';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';
import type { RecommendationStep } from './recommendations_plan_panel';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getRecommendedActionBadgeColor = (
  action: EventDocument['recommended_action']
): 'warning' | 'success' | 'neutral' => {
  switch (action) {
    case 'escalate':
      return 'warning';
    case 'resolve':
      return 'success';
    case 'monitor':
    default:
      return 'neutral';
  }
};

const getCriticalityHealthColor = (impact: EventDocument['impact']): EuiHealthProps['color'] => {
  switch (impact) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
    default:
      return 'subdued';
  }
};

const formatDetectedAt = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return i18n.translate('xpack.observability.lowerPriorityEvents.detectedAtLabel', {
    defaultMessage: 'Detected on {date}',
    values: {
      date: date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  });
};

export interface LowerPriorityEventsProps {
  events: EventDocument[];
  onRemediate?: (eventTitle: string) => void;
}

const getImpactBadgeColor = (
  impact: EventDocument['impact']
): 'warning' | 'primary' | 'default' | 'danger' => {
  switch (impact) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
    default:
      return 'default';
  }
};

const getRecommendedActionIcon = (action: EventDocument['recommended_action']): string => {
  switch (action) {
    case 'escalate':
      return 'arrowUp';
    case 'monitor':
      return 'eye';
    case 'resolve':
      return 'check';
    default:
      return 'questionInCircle';
  }
};

export function LowerPriorityEvents({ events, onRemediate }: LowerPriorityEventsProps) {
  const { euiTheme } = useEuiTheme();
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const [selectedEvent, setSelectedEvent] = useState<EventDocument | null>(null);
  const [sortField, setSortField] = useState<keyof EventDocument>('criticality');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'eventDetailFlyout' });

  const closeFlyout = useCallback(() => setSelectedEvent(null), []);

  const onTableChange = useCallback(({ sort }: Criteria<EventDocument>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  }, []);

  const sortedEvents = [...events].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * direction;
    }
    return String(aVal).localeCompare(String(bVal)) * direction;
  });

  const toggleEvent = useCallback((item: EventDocument) => {
    setSelectedEvent((current) => (current && current.event_id === item.event_id ? null : item));
  }, []);

  const columns: Array<EuiBasicTableColumn<EventDocument>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.observability.lowerPriorityEvents.titleColumn', {
        defaultMessage: 'Event',
      }),
      sortable: true,
      truncateText: true,
      render: (title: string, item: EventDocument) => {
        const isExpanded = selectedEvent?.event_id === item.event_id;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`eventExpandRow-${item.event_id}`}
                iconType={isExpanded ? 'minimize' : 'expand'}
                onClick={() => toggleEvent(item)}
                aria-label={
                  isExpanded
                    ? i18n.translate(
                        'xpack.observability.lowerPriorityEvents.minimizeDetailsAria',
                        { defaultMessage: 'Minimize details' }
                      )
                    : i18n.translate('xpack.observability.lowerPriorityEvents.viewDetailsAria', {
                        defaultMessage: 'View details',
                      })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink data-test-subj="o11yColumnsLink" onClick={() => toggleEvent(item)}>
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.observability.lowerPriorityEvents.impactColumn', {
        defaultMessage: 'Impact',
      }),
      sortable: true,
      width: '100px',
      render: (impact: EventDocument['impact']) => (
        <EuiBadge color={getImpactBadgeColor(impact)}>
          {impact.charAt(0).toUpperCase() + impact.slice(1)}
        </EuiBadge>
      ),
    },
    {
      field: 'criticality',
      name: i18n.translate('xpack.observability.lowerPriorityEvents.criticalityColumn', {
        defaultMessage: 'Score',
      }),
      sortable: true,
      width: '80px',
      render: (criticality: number) => <EuiText size="s">{criticality}</EuiText>,
    },
    {
      field: 'recommended_action',
      name: i18n.translate('xpack.observability.lowerPriorityEvents.actionColumn', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      width: '120px',
      render: (action: EventDocument['recommended_action'], item: EventDocument) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={getRecommendedActionBadgeColor(action)}
              iconType={getRecommendedActionIcon(action)}
            >
              {capitalize(action)}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={`eventAttach-${item.event_id}`}
              iconType="paperClip"
              display="empty"
              size="xs"
              color="text"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
              }}
              aria-label={i18n.translate(
                'xpack.observability.lowerPriorityEvents.attachActionAria',
                {
                  defaultMessage: 'Attach context for {title}',
                  values: { title: item.title },
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="sigeventsLowerPriorityEvents"
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.observability.lowerPriorityEvents.title', {
                  defaultMessage: 'Lower priority items to review',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="crosshairs"
              iconSide="left"
              flush="right"
              href={prepend('/app/streams/_discovery/knowledge_indicators')}
              data-test-subj="sigeventsViewAllKnowledgeIndicators"
            >
              {i18n.translate('xpack.observability.lowerPriorityEvents.goToSignificantEvents', {
                defaultMessage: 'Go to Significant events',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.observability.lowerPriorityEvents.description', {
            defaultMessage:
              'These significant events were assessed and demoted from critical status. Click to see details.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable<EventDocument>
          itemId="event_id"
          items={sortedEvents}
          columns={columns}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          rowProps={(item) => {
            const isExpanded = selectedEvent?.event_id === item.event_id;
            return {
              style: {
                background: isExpanded ? euiTheme.colors.backgroundBaseSubdued : undefined,
              },
              'data-test-subj': isExpanded
                ? `eventRow-${item.event_id}-expanded`
                : `eventRow-${item.event_id}`,
            };
          }}
          tableLayout="fixed"
        />
      </EuiPanel>

      {selectedEvent && (
        <EventDetailFlyout
          event={selectedEvent}
          flyoutHeadingId={flyoutHeadingId}
          onClose={closeFlyout}
          onRemediate={onRemediate}
        />
      )}
    </>
  );
}

interface EventDetailFlyoutProps {
  event: EventDocument;
  flyoutHeadingId: string;
  onClose: () => void;
  onRemediate?: (eventTitle: string) => void;
}

function EventDetailFlyout({
  event,
  flyoutHeadingId,
  onClose,
  onRemediate,
}: EventDetailFlyoutProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const severityLabel = capitalize(event.impact);
  const severityColor = getImpactBadgeColor(event.impact);
  const recommendedActionLabel = capitalize(event.recommended_action);
  const recommendedActionIconType = getRecommendedActionIcon(event.recommended_action);
  const criticalityLabel = String(event.criticality);
  const criticalityColor = getCriticalityHealthColor(event.impact);
  const detectedAtLabel = formatDetectedAt(event['@timestamp']);
  const rulesTabHref = prepend('/app/streams/_discovery/queries');

  const generalInfoItems = useMemo(() => {
    const items: Array<{
      title: NonNullable<React.ReactNode>;
      description: NonNullable<React.ReactNode>;
    }> = [
      {
        title: i18n.translate('xpack.observability.lowerPriorityEvents.generalSeverity', {
          defaultMessage: 'Severity',
        }),
        description: <EuiBadge color={severityColor}>{severityLabel}</EuiBadge>,
      },
      {
        title: i18n.translate('xpack.observability.lowerPriorityEvents.generalCriticality', {
          defaultMessage: 'Criticality score',
        }),
        description: <EuiHealth color={criticalityColor}>{criticalityLabel}</EuiHealth>,
      },
      {
        title: i18n.translate('xpack.observability.lowerPriorityEvents.generalRecommendedAction', {
          defaultMessage: 'Recommended action',
        }),
        description: (
          <EuiBadge
            color={getRecommendedActionBadgeColor(event.recommended_action)}
            iconType={recommendedActionIconType}
          >
            {recommendedActionLabel}
          </EuiBadge>
        ),
      },
    ];

    if (event.stream_names && event.stream_names.length > 0) {
      items.push({
        title: i18n.translate('xpack.observability.lowerPriorityEvents.generalStreams', {
          defaultMessage: 'Streams',
        }),
        description: (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {event.stream_names.map((stream, idx) => (
              <EuiFlexItem key={`${stream}-${idx}`} grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType="popout"
                  iconSide="right"
                  href={prepend(`/app/streams/${encodeURIComponent(stream)}`)}
                  data-test-subj={`eventStreamLink-${stream}`}
                >
                  {stream}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      });
    }

    if (event.rule_names && event.rule_names.length > 0) {
      items.push({
        title: i18n.translate('xpack.observability.lowerPriorityEvents.generalRules', {
          defaultMessage: 'Related rules',
        }),
        description: (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {event.rule_names.map((rule, idx) => (
              <EuiFlexItem key={`${rule}-${idx}`} grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType="popout"
                  iconSide="right"
                  href={rulesTabHref}
                  data-test-subj={`eventRuleLink-${rule}`}
                >
                  {rule}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      });
    }

    return items;
  }, [
    criticalityColor,
    criticalityLabel,
    prepend,
    recommendedActionIconType,
    recommendedActionLabel,
    rulesTabHref,
    severityColor,
    severityLabel,
    event.recommended_action,
    event.rule_names,
    event.stream_names,
  ]);

  const recommendationSteps: RecommendationStep[] | undefined = useMemo(() => {
    if (!event.recommendations || event.recommendations.length === 0) {
      return undefined;
    }
    return event.recommendations.map((rec, idx) => ({
      id: `${event.event_id}-rec-${idx}`,
      title: rec,
    }));
  }, [event.recommendations, event.event_id]);

  return (
    <EuiFlyout
      type="push"
      side="right"
      size="m"
      onClose={onClose}
      ownFocus={false}
      pushMinBreakpoint="s"
      paddingSize="m"
      aria-labelledby={flyoutHeadingId}
      data-test-subj="eventDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h2 id={flyoutHeadingId}>{event.title}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{detectedAtLabel}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <InfoPanel
              title={i18n.translate('xpack.observability.lowerPriorityEvents.generalInfoTitle', {
                defaultMessage: 'General information',
              })}
              collapsible
              initialCollapsed
            >
              {generalInfoItems.map((listItem, index) => (
                <React.Fragment key={index}>
                  <EuiDescriptionList
                    type="column"
                    columnWidths={[1, 2]}
                    compressed
                    listItems={[listItem]}
                  />
                  {index < generalInfoItems.length - 1 ? <EuiHorizontalRule margin="m" /> : null}
                </React.Fragment>
              ))}
            </InfoPanel>
          </EuiFlexItem>

          {event.summary ? (
            <EuiFlexItem grow={false}>
              <InfoPanel
                title={i18n.translate('xpack.observability.lowerPriorityEvents.summaryPanelTitle', {
                  defaultMessage: 'Summary',
                })}
              >
                <EuiText size="s">
                  <p>{event.summary}</p>
                </EuiText>
              </InfoPanel>
            </EuiFlexItem>
          ) : null}

          {event.root_cause ? (
            <EuiFlexItem grow={false}>
              <RootCausePanel>
                <p>{event.root_cause}</p>
              </RootCausePanel>
            </EuiFlexItem>
          ) : null}

          {recommendationSteps ? (
            <EuiFlexItem grow={false}>
              <RecommendationsPlanPanel
                steps={recommendationSteps}
                escalateBadgeLabel={recommendedActionLabel}
                escalateBadgeColor={getRecommendedActionBadgeColor(event.recommended_action)}
                escalateBadgeIconType={recommendedActionIconType}
                onRemediate={
                  onRemediate
                    ? () => {
                        onRemediate(event.title);
                        onClose();
                      }
                    : undefined
                }
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
