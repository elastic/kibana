/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Criteria } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VerdictDocument } from '../../hooks/use_fetch_system_overview';
import { useKibana } from '../../utils/kibana_react';

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

  const columns: Array<EuiBasicTableColumn<VerdictDocument>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.observability.lowerPriorityVerdicts.titleColumn', {
        defaultMessage: 'Event',
      }),
      sortable: true,
      truncateText: true,
      render: (title: string, item: VerdictDocument) => (
        <EuiText
          size="s"
          css={css`
            cursor: pointer;
            &:hover {
              text-decoration: underline;
            }
          `}
          onClick={() => setSelectedVerdict(item)}
        >
          {title}
        </EuiText>
      ),
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
      width: '110px',
      render: (action: VerdictDocument['recommended_action']) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={getRecommendedActionIcon(action)} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{action.charAt(0).toUpperCase() + action.slice(1)}</EuiText>
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
            <EuiLink
              href={prepend('/app/streams/_discovery/knowledge_indicators')}
              data-test-subj="sigeventsViewAllKnowledgeIndicators"
            >
              {i18n.translate('xpack.observability.lowerPriorityVerdicts.viewAll', {
                defaultMessage: 'View all',
              })}
            </EuiLink>
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
          items={sortedVerdicts}
          columns={columns}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          rowProps={(item) => ({
            onClick: () => setSelectedVerdict(item),
            style: { cursor: 'pointer' },
          })}
          tableLayout="fixed"
        />
      </EuiPanel>

      {selectedVerdict && (
        <EuiFlyout
          ownFocus
          onClose={closeFlyout}
          aria-labelledby={flyoutHeadingId}
          size="m"
          data-test-subj="verdictDetailFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiBadge color={getImpactBadgeColor(selectedVerdict.impact)}>
                  {selectedVerdict.impact.charAt(0).toUpperCase() + selectedVerdict.impact.slice(1)}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="m" id={flyoutHeadingId}>
                  <h2>{selectedVerdict.title}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.observability.verdictDetail.summary', {
                      defaultMessage: 'Summary',
                    })}
                  </h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">{selectedVerdict.summary}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.observability.verdictDetail.verdict', {
                      defaultMessage: 'Verdict',
                    })}
                  </h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">{selectedVerdict.verdict_summary}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.observability.verdictDetail.rootCause', {
                      defaultMessage: 'Root cause',
                    })}
                  </h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">{selectedVerdict.root_cause}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiPanel
                      hasShadow={false}
                      hasBorder
                      paddingSize="s"
                      css={css`
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                      `}
                    >
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.observability.verdictDetail.criticality', {
                          defaultMessage: 'Criticality score',
                        })}
                      </EuiText>
                      <EuiText size="m">
                        <strong>{selectedVerdict.criticality}</strong>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiPanel
                      hasShadow={false}
                      hasBorder
                      paddingSize="s"
                      css={css`
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                      `}
                    >
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.observability.verdictDetail.confidence', {
                          defaultMessage: 'Confidence',
                        })}
                      </EuiText>
                      <EuiText size="m">
                        <strong>{selectedVerdict.confidence}%</strong>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiPanel
                      hasShadow={false}
                      hasBorder
                      paddingSize="s"
                      css={css`
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                      `}
                    >
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.observability.verdictDetail.recommendedAction', {
                          defaultMessage: 'Recommended action',
                        })}
                      </EuiText>
                      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon
                            type={getRecommendedActionIcon(selectedVerdict.recommended_action)}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="m">
                            <strong>
                              {selectedVerdict.recommended_action.charAt(0).toUpperCase() +
                                selectedVerdict.recommended_action.slice(1)}
                            </strong>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {selectedVerdict.rule_names && selectedVerdict.rule_names.length > 0 && (
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>
                      {i18n.translate('xpack.observability.verdictDetail.rules', {
                        defaultMessage: 'Related rules',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                    {selectedVerdict.rule_names.map((rule, idx) => (
                      <EuiFlexItem key={idx} grow={false}>
                        <EuiBadge color="hollow">{rule}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}

              {selectedVerdict.recommendations && selectedVerdict.recommendations.length > 0 && (
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>
                      {i18n.translate('xpack.observability.verdictDetail.recommendations', {
                        defaultMessage: 'Recommendations',
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <ul>
                    {selectedVerdict.recommendations.map((rec, idx) => (
                      <li key={idx}>
                        <EuiText size="s">{rec}</EuiText>
                      </li>
                    ))}
                  </ul>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}
