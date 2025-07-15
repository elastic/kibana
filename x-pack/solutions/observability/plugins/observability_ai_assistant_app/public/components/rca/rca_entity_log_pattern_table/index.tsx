/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { formatInteger } from '@kbn/observability-utils-common/format/integer';
import { highlightPatternFromRegex } from '@kbn/genai-utils-common';
import type { EntityInvestigation } from '@kbn/observability-ai-server/root_cause_analysis/tasks/investigate_entity/types';
import React, { useMemo, useState } from 'react';
import { orderBy } from 'lodash';
import type { AnalyzedLogPattern } from '@kbn/observability-ai-server/root_cause_analysis/tasks/analyze_log_patterns';
import { useTheme } from '../../../hooks/use_theme';
import { SparkPlot } from '../../charts/spark_plot';

const badgeClassName = css`
  width: 100%;
  .euiBadge__content {
    justify-content: center;
  }
`;

const PER_PAGE = 5;

export function RootCauseAnalysisEntityLogPatternTable({
  entity,
  ownPatterns,
  patternsFromOtherEntities,
}: Pick<EntityInvestigation['attachments'], 'ownPatterns' | 'patternsFromOtherEntities'> & {
  entity: Record<string, string>;
}) {
  const theme = useTheme();

  const [showUsualPatterns, setShowUsualPatterns] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);

  const columns = useMemo((): Array<EuiBasicTableColumn<AnalyzedLogPattern>> => {
    return [
      {
        field: 'relevance',
        name: '',
        width: '128px',
        render: (_, { relevance, metadata }) => {
          const color = getRelevanceColor(relevance);

          return (
            <EuiBadge className={badgeClassName} color={color}>
              {relevance}
            </EuiBadge>
          );
        },
      },
      {
        field: 'pattern',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.messageColumnTitle',
          { defaultMessage: 'Message' }
        ),
        render: (_, { regex, sample }) => {
          return (
            <EuiText
              size="xs"
              className={css`
                font-family: ${theme.font.familyCode};
                color: ${theme.colors.subduedText};
                em {
                  font-style: normal;
                  font-weight: ${theme.font.weight.semiBold};
                  color: ${theme.colors.primaryText};
                }
              `}
              dangerouslySetInnerHTML={{ __html: highlightPatternFromRegex(regex, sample) }}
            />
          );
        },
      },
      {
        field: 'count',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.countColumnTitle',
          { defaultMessage: 'Count' }
        ),
        width: '96px',
        render: (_, { count }) => {
          return (
            <EuiText
              size="xs"
              className={css`
                white-space: nowrap;
              `}
            >
              {formatInteger(count)}
            </EuiText>
          );
        },
      },
      {
        field: 'change',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.changeColumnTitle',
          { defaultMessage: 'Change' }
        ),
        width: '128px',
        render: (_, { change }) => {
          return getChangeBadge(change);
        },
      },
      {
        field: 'timeseries',
        width: '128px',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.trendColumnTitle',
          { defaultMessage: 'Trend' }
        ),
        render: (_, { timeseries, change }) => {
          return (
            <SparkPlot
              timeseries={timeseries}
              annotations={getAnnotationsFromChangePoint({
                timeseries,
                change,
                theme,
              })}
              type="bar"
            />
          );
        },
      },
    ];
  }, [theme]);

  const allPatterns = useMemo(() => {
    return [...ownPatterns, ...patternsFromOtherEntities];
  }, [ownPatterns, patternsFromOtherEntities]);

  const items = useMemo(() => {
    return allPatterns.filter((pattern) => {
      if (!showUsualPatterns) {
        return pattern.relevance !== 'normal';
      }
      return pattern;
    });
  }, [allPatterns, showUsualPatterns]);

  const visibleItems = useMemo(() => {
    const start = pageIndex * PER_PAGE;
    return orderBy(items, (item) => relevanceToInt(item.relevance), 'desc').slice(
      start,
      start + PER_PAGE
    );
  }, [pageIndex, items]);

  const paginationOptions = useMemo(() => {
    return {
      pageIndex,
      totalItemCount: items.length,
      pageSize: PER_PAGE,
    };
  }, [pageIndex, items.length]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row" alignItems="center">
        <EuiFlexItem grow>
          <EuiText size="s">
            {i18n.translate(
              'xpack.observabilityAiAssistant.rootCauseAnalysisEntityInvestigation.logPatternsTableTitle',
              {
                defaultMessage: 'Showing {count} of {total} log patterns',
                values: {
                  total: items.length,
                  count: visibleItems.length,
                },
              }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiCheckbox
              id={`show_usual_patterns_${JSON.stringify(entity)}`}
              checked={showUsualPatterns}
              onChange={() => {
                setShowUsualPatterns((prev) => !prev);
              }}
            />
            <EuiText size="xs">
              {i18n.translate(
                'xpack.observabilityAiAssistant.rca.logPatternTable.showUsualPatternsCheckbox',
                {
                  defaultMessage: 'Show unremarkable patterns',
                }
              )}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        tableLayout="auto"
        columns={columns}
        items={visibleItems}
        pagination={paginationOptions}
        onChange={(criteria) => {
          setPageIndex(criteria.page.index);
        }}
      />
    </EuiFlexGroup>
  );
}

function getRelevanceColor(relevance: 'normal' | 'unusual' | 'warning' | 'critical') {
  switch (relevance) {
    case 'normal':
      return 'plain';

    case 'critical':
      return 'danger';

    case 'warning':
      return 'warning';

    case 'unusual':
      return 'primary';
  }
}

function getSignificanceColor(significance: 'high' | 'medium' | 'low' | null) {
  switch (significance) {
    case 'high':
      return 'danger';

    case 'medium':
      return 'warning';

    case 'low':
    case null:
      return 'plain';
  }
}

function relevanceToInt(relevance: 'normal' | 'unusual' | 'warning' | 'critical') {
  switch (relevance) {
    case 'normal':
      return 0;
    case 'unusual':
      return 1;
    case 'warning':
      return 2;
    case 'critical':
      return 3;
  }
}

function getAnnotationsFromChangePoint({
  change,
  theme,
  timeseries,
}: {
  change: AnalyzedLogPattern['change'];
  theme: EuiThemeComputed<{}>;
  timeseries: Array<{ x: number; y: number }>;
}): Required<React.ComponentProps<typeof SparkPlot>['annotations']> {
  if (!change.change_point || !change.type) {
    return [];
  }

  const color = getSignificanceColor(change.significance);

  return [
    {
      color: color === 'plain' ? theme.colors.subduedText : theme.colors[color],
      id: '1',
      icon: '*',
      label: <EuiBadge color="hollow">{change.type}</EuiBadge>,
      x: timeseries[change.change_point].x,
    },
  ];
}

export function getChangeBadge(change: AnalyzedLogPattern['change']) {
  return (
    <EuiBadge className={badgeClassName} color={getSignificanceColor(change.significance)}>
      {change.significance ?? 'No change'}
    </EuiBadge>
  );
}
