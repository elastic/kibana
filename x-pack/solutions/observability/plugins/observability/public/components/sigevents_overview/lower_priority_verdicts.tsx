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
import type { VerdictDocument } from '../../hooks/use_fetch_system_overview';
import { useKibana } from '../../utils/kibana_react';
import { InfoPanel } from './info_panel';
import { RootCausePanel } from './root_cause_panel';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';
import type { RecommendationStep } from './recommendations_plan_panel';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getRecommendedActionBadgeColor = (
  action: VerdictDocument['recommended_action']
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

const getCriticalityHealthColor = (
  impact: VerdictDocument['impact']
): EuiHealthProps['color'] => {
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
  return i18n.translate('xpack.observability.lowerPriorityVerdicts.detectedAtLabel', {
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

export interface LowerPriorityVerdictsProps {
  verdicts: VerdictDocument[];
}

const getImpactBadgeColor = (
  impact: VerdictDocument['impact']
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

const getRecommendedActionIcon = (action: VerdictDocument['recommended_action']): string => {
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

export function LowerPriorityVerdicts({ verdicts }: LowerPriorityVerdictsProps) {
  const { euiTheme } = useEuiTheme();
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const [selectedVerdict, setSelectedVerdict] = useState<VerdictDocument | null>(null);
  const [sortField, setSortField] = useState<keyof VerdictDocument>('criticality');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'verdictDetailFlyout' });

  const closeFlyout = useCallback(() => setSelectedVerdict(null), []);

  const onTableChange = useCallback(({ sort }: Criteria<VerdictDocument>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  }, []);

  const sortedVerdicts = [...verdicts].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * direction;
    }
    return String(aVal).localeCompare(String(bVal)) * direction;
  });

  const toggleVerdict = useCallback((item: VerdictDocument) => {
    setSelectedVerdict((current) =>
      current && current.verdict_id === item.verdict_id ? null : item
    );
  }, []);

  const columns: Array<EuiBasicTableColumn<VerdictDocument>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.observability.lowerPriorityVerdicts.titleColumn', {
        defaultMessage: 'Event',
      }),
      sortable: true,
      truncateText: true,
      render: (title: string, item: VerdictDocument) => {
        const isExpanded = selectedVerdict?.verdict_id === item.verdict_id;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`verdictExpandRow-${item.verdict_id}`}
                iconType={isExpanded ? 'minimize' : 'expand'}
                onClick={() => toggleVerdict(item)}
                aria-label={
                  isExpanded
                    ? i18n.translate(
                        'xpack.observability.lowerPriorityVerdicts.minimizeDetailsAria',
                        { defaultMessage: 'Minimize details' }
                      )
                    : i18n.translate('xpack.observability.lowerPriorityVerdicts.viewDetailsAria', {
                        defaultMessage: 'View details',
                      })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink onClick={() => toggleVerdict(item)}>{title}</EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.observability.lowerPriorityVerdicts.impactColumn', {
        defaultMessage: 'Impact',
      }),
      sortable: true,
      width: '100px',
      render: (impact: VerdictDocument['impact']) => (
        <EuiBadge color={getImpactBadgeColor(impact)}>
          {impact.charAt(0).toUpperCase() + impact.slice(1)}
        </EuiBadge>
      ),
    },
    {
      field: 'criticality',
      name: i18n.translate('xpack.observability.lowerPriorityVerdicts.criticalityColumn', {
        defaultMessage: 'Score',
      }),
      sortable: true,
      width: '80px',
      render: (criticality: number) => <EuiText size="s">{criticality}</EuiText>,
    },
    {
      field: 'recommended_action',
      name: i18n.translate('xpack.observability.lowerPriorityVerdicts.actionColumn', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      width: '120px',
      render: (action: VerdictDocument['recommended_action'], item: VerdictDocument) => (
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
              data-test-subj={`verdictAttach-${item.verdict_id}`}
              iconType="paperClip"
              display="empty"
              size="xs"
              color="text"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
              }}
              aria-label={i18n.translate(
                'xpack.observability.lowerPriorityVerdicts.attachActionAria',
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

  if (verdicts.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="sigeventsLowerPriorityVerdicts"
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.observability.lowerPriorityVerdicts.title', {
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
              {i18n.translate('xpack.observability.lowerPriorityVerdicts.goToSignificantEvents', {
                defaultMessage: 'Go to Significant events',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.observability.lowerPriorityVerdicts.description', {
            defaultMessage:
              'These significant events were assessed and demoted from critical status. Click to see details.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable<VerdictDocument>
          itemId="verdict_id"
          items={sortedVerdicts}
          columns={columns}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          rowProps={(item) => {
            const isExpanded = selectedVerdict?.verdict_id === item.verdict_id;
            return {
              style: {
                background: isExpanded ? euiTheme.colors.backgroundBaseSubdued : undefined,
              },
              'data-test-subj': isExpanded
                ? `verdictRow-${item.verdict_id}-expanded`
                : `verdictRow-${item.verdict_id}`,
            };
          }}
          tableLayout="fixed"
        />
      </EuiPanel>

      {selectedVerdict && (
        <VerdictDetailFlyout
          verdict={selectedVerdict}
          flyoutHeadingId={flyoutHeadingId}
          onClose={closeFlyout}
        />
      )}
    </>
  );
}

interface VerdictDetailFlyoutProps {
  verdict: VerdictDocument;
  flyoutHeadingId: string;
  onClose: () => void;
}

function VerdictDetailFlyout({ verdict, flyoutHeadingId, onClose }: VerdictDetailFlyoutProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const severityLabel = capitalize(verdict.impact);
  const severityColor = getImpactBadgeColor(verdict.impact);
  const recommendedActionLabel = capitalize(verdict.recommended_action);
  const recommendedActionIconType = getRecommendedActionIcon(verdict.recommended_action);
  const criticalityLabel = String(verdict.criticality);
  const criticalityColor = getCriticalityHealthColor(verdict.impact);
  const confidenceLabel = `${verdict.confidence}%`;
  const detectedAtLabel = formatDetectedAt(verdict['@timestamp']);
  const rulesTabHref = prepend('/app/streams/_discovery/queries');

  const generalInfoItems = useMemo(() => {
    const items: Array<{
      title: NonNullable<React.ReactNode>;
      description: NonNullable<React.ReactNode>;
    }> = [
      {
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalSeverity', {
          defaultMessage: 'Severity',
        }),
        description: <EuiBadge color={severityColor}>{severityLabel}</EuiBadge>,
      },
      {
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalCriticality', {
          defaultMessage: 'Criticality score',
        }),
        description: <EuiHealth color={criticalityColor}>{criticalityLabel}</EuiHealth>,
      },
      {
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalConfidence', {
          defaultMessage: 'Confidence',
        }),
        description: confidenceLabel,
      },
      {
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalRecommendedAction', {
          defaultMessage: 'Recommended action',
        }),
        description: (
          <EuiBadge
            color={getRecommendedActionBadgeColor(verdict.recommended_action)}
            iconType={recommendedActionIconType}
          >
            {recommendedActionLabel}
          </EuiBadge>
        ),
      },
    ];

    if (verdict.stream_names && verdict.stream_names.length > 0) {
      items.push({
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalStreams', {
          defaultMessage: 'Streams',
        }),
        description: (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {verdict.stream_names.map((stream, idx) => (
              <EuiFlexItem key={`${stream}-${idx}`} grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType="popout"
                  iconSide="right"
                  href={prepend(`/app/streams/${encodeURIComponent(stream)}`)}
                  data-test-subj={`verdictStreamLink-${stream}`}
                >
                  {stream}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      });
    }

    if (verdict.rule_names && verdict.rule_names.length > 0) {
      items.push({
        title: i18n.translate('xpack.observability.lowerPriorityVerdicts.generalRules', {
          defaultMessage: 'Related rules',
        }),
        description: (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {verdict.rule_names.map((rule, idx) => (
              <EuiFlexItem key={`${rule}-${idx}`} grow={false}>
                <EuiBadge
                  color="hollow"
                  iconType="popout"
                  iconSide="right"
                  href={rulesTabHref}
                  data-test-subj={`verdictRuleLink-${rule}`}
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
    confidenceLabel,
    criticalityColor,
    criticalityLabel,
    prepend,
    recommendedActionIconType,
    recommendedActionLabel,
    rulesTabHref,
    severityColor,
    severityLabel,
    verdict.recommended_action,
    verdict.rule_names,
    verdict.stream_names,
  ]);

  const recommendationSteps: RecommendationStep[] | undefined = useMemo(() => {
    if (!verdict.recommendations || verdict.recommendations.length === 0) {
      return undefined;
    }
    return verdict.recommendations.map((rec, idx) => ({
      id: `${verdict.verdict_id}-rec-${idx}`,
      title: rec,
    }));
  }, [verdict.recommendations, verdict.verdict_id]);

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
      data-test-subj="verdictDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h2 id={flyoutHeadingId}>{verdict.title}</h2>
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
              title={i18n.translate('xpack.observability.lowerPriorityVerdicts.generalInfoTitle', {
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

          {verdict.summary ? (
            <EuiFlexItem grow={false}>
              <InfoPanel
                title={i18n.translate(
                  'xpack.observability.lowerPriorityVerdicts.summaryPanelTitle',
                  { defaultMessage: 'Summary' }
                )}
              >
                <EuiText size="s">
                  <p>{verdict.summary}</p>
                </EuiText>
              </InfoPanel>
            </EuiFlexItem>
          ) : null}

          {verdict.verdict_summary ? (
            <EuiFlexItem grow={false}>
              <InfoPanel
                title={i18n.translate(
                  'xpack.observability.lowerPriorityVerdicts.verdictPanelTitle',
                  { defaultMessage: 'Verdict assessment' }
                )}
              >
                <EuiText size="s">
                  <p>{verdict.verdict_summary}</p>
                </EuiText>
              </InfoPanel>
            </EuiFlexItem>
          ) : null}

          {verdict.root_cause ? (
            <EuiFlexItem grow={false}>
              <RootCausePanel>
                <p>{verdict.root_cause}</p>
              </RootCausePanel>
            </EuiFlexItem>
          ) : null}

          {recommendationSteps ? (
            <EuiFlexItem grow={false}>
              <RecommendationsPlanPanel
                steps={recommendationSteps}
                escalateBadgeLabel={recommendedActionLabel}
                escalateBadgeColor={getRecommendedActionBadgeColor(verdict.recommended_action)}
                escalateBadgeIconType={recommendedActionIconType}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
