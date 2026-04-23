/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import type { EntityType } from '../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../common/search_strategy';
import { APP_UI_ID } from '../../../common/constants';
import { FormattedRelativePreferenceDate } from '../../common/components/formatted_date';
import { getEmptyTagValue } from '../../common/components/empty_value';
import {
  navigateToSecurityEntityInApp,
  type SecurityAgentBuilderChrome,
} from './entity_explore_navigation';
import { formatRiskScore } from '../../entity_analytics/common';
import { CRITICALITY_LEVEL_TITLE } from '../../entity_analytics/components/asset_criticality/translations';
import { RiskScoreLevel } from '../../entity_analytics/components/severity/common';
import { EntityIconByType } from '../../entity_analytics/components/entity_store/helpers';
import { formatEntitySource } from './entity_attachment/entity_table/entity_data_source_utils';

export interface EntityListRow {
  entity_type: 'host' | 'user' | 'service' | 'generic';
  entity_id: string;
  entity_name?: string;
  source?: unknown;
  risk_score_norm?: number;
  risk_level?: string;
  criticality?: string;
  first_seen?: string;
  last_seen?: string;
}

const parseRiskLevel = (raw?: string): RiskSeverity => {
  if (!raw) {
    return RiskSeverity.Unknown;
  }
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const allowed = Object.values(RiskSeverity) as string[];
  if (allowed.includes(normalized)) {
    return normalized as RiskSeverity;
  }
  return RiskSeverity.Unknown;
};

const criticalityLabel = (raw?: string): string | undefined => {
  if (!raw) {
    return undefined;
  }
  return CRITICALITY_LEVEL_TITLE[raw as CriticalityLevelWithUnassigned] ?? raw;
};

/**
 * Maximum number of `entity.source` badges rendered inline in the Source
 * column before the remainder collapses into a single `+N more` badge with a
 * tooltip. Matches the sibling EntityTable attachment (MAX_VISIBLE_SOURCES)
 * so the two tables feel like the same component when they render side by
 * side in the same conversation.
 */
const MAX_VISIBLE_SOURCES = 3;

const LAST_SEEN_TOOLTIP_FIELD_NAME = '@timestamp';
const FIRST_SEEN_TOOLTIP_FIELD_NAME = 'entity.lifecycle.first_seen';

/**
 * Coerce the `source` column value into the multi-value string array shape of
 * `entity.source`. Rows from the entity store project `entity.source` as
 * either a single string (legacy) or an array of strings. We accept either
 * and drop anything non-string so the badge renderer only has to deal with
 * `string[]`.
 */
const normalizeEntitySources = (source: unknown): string[] => {
  if (typeof source === 'string') {
    return source ? [source] : [];
  }
  if (Array.isArray(source)) {
    return source.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  return [];
};

const NAME_COLUMN_WIDTH = '260px';

/**
 * Horizontal scroll wrapper for the entity list table. The canvas preview panel
 * can be narrower than the sum of the table's 8 columns (Name, Source,
 * Criticality, Risk score, Risk level, First seen, Last seen, Entity ID),
 * especially on laptop-width screens. We keep the table at a readable minimum
 * width and let it overflow with a scrollbar instead of squeezing columns into
 * character-by-character wrapping. The wrapper establishes its own horizontal
 * scroll container so the outer dashboard panel (title, risk breakdown,
 * highlights, by-type stats) continues to fit the visible width.
 *
 * The min-width (1000px) is tuned to fit the explicit Name and Source column
 * widths plus enough room for the remaining six columns without forcing the
 * Name cell to wrap common email-style entity names.
 *
 * We also pin the first header + body cells to NAME_COLUMN_WIDTH. Under
 * tableLayout="auto" the column's `width` prop is only a hint and the browser
 * can reallocate space between pages (noticeable when pagination swaps in
 * rows whose other-column content has different widths). Forcing
 * width/min-width/max-width on the cells themselves makes the Name column
 * stable across pages.
 */
const tableScrollStyles = css`
  overflow-x: auto;

  .euiTable {
    min-width: 1000px;
  }

  .euiTable .euiTableHeaderCell:first-of-type,
  .euiTable .euiTableRowCell:first-child {
    width: ${NAME_COLUMN_WIDTH};
    min-width: ${NAME_COLUMN_WIDTH};
    max-width: ${NAME_COLUMN_WIDTH};
  }
`;

export const EntityListTable: React.FC<{
  entities: EntityListRow[];
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  openSidebarConversation?: () => void;
  searchSession?: ISessionService;
}> = ({ entities, application, agentBuilder, chrome, openSidebarConversation, searchSession }) => {
  const { euiTheme } = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<EntityListRow>> = useMemo(
    () => [
      {
        field: 'entity_name',
        name: i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.col.name', {
          defaultMessage: 'Name',
        }),
        width: NAME_COLUMN_WIDTH,
        render: (_: string, row: EntityListRow) => {
          const icon = EntityIconByType[row.entity_type as EntityType] ?? 'globe';
          const label = row.entity_name ?? row.entity_id;
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={icon}
                  display="empty"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.agentBuilder.entityListAttachment.openEntityAria',
                    {
                      defaultMessage: 'Open entity in Security',
                    }
                  )}
                  onClick={() => {
                    navigateToSecurityEntityInApp({
                      application,
                      appId: APP_UI_ID,
                      row,
                      agentBuilder,
                      chrome,
                      openSidebarConversation,
                      searchSession,
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                <EuiToolTip position="top" content={label}>
                  <EuiText
                    size="s"
                    tabIndex={0}
                    css={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {label}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'source',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.source',
          {
            defaultMessage: 'Source',
          }
        ),
        width: '200px',
        render: (source: unknown) => {
          const list = normalizeEntitySources(source);
          if (list.length === 0) {
            return getEmptyTagValue();
          }
          const visible = list.slice(0, MAX_VISIBLE_SOURCES);
          const hidden = list.slice(MAX_VISIBLE_SOURCES);
          return (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              wrap
              responsive={false}
              data-test-subj="entityListAttachmentTableSources"
            >
              {visible.map((s) => (
                <EuiFlexItem grow={false} key={s}>
                  <EuiBadge color="hollow" data-test-subj="entityListAttachmentTableSource">
                    {formatEntitySource(s)}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
              {hidden.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    position="top"
                    title={i18n.translate(
                      'xpack.securitySolution.agentBuilder.entityListAttachment.col.sourceOverflowTitle',
                      { defaultMessage: 'Additional data sources' }
                    )}
                    content={hidden.map(formatEntitySource).join(', ')}
                  >
                    <EuiBadge
                      color="hollow"
                      data-test-subj="entityListAttachmentTableSourcesOverflow"
                    >
                      {i18n.translate(
                        'xpack.securitySolution.agentBuilder.entityListAttachment.col.sourceOverflow',
                        {
                          defaultMessage: '+{count} more',
                          values: { count: hidden.length },
                        }
                      )}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'criticality',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.criticality',
          {
            defaultMessage: 'Criticality',
          }
        ),
        render: (c: string | undefined) => {
          const title = criticalityLabel(c);
          return title ? <EuiText size="s">{title}</EuiText> : getEmptyTagValue();
        },
      },
      {
        field: 'risk_score_norm',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.riskScore',
          {
            defaultMessage: 'Risk score',
          }
        ),
        dataType: 'number',
        render: (score: number | undefined) =>
          score != null ? (
            <EuiText size="s" data-test-subj="entity-list-risk-score">
              {formatRiskScore(score)}
            </EuiText>
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        field: 'risk_level',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.riskLevel',
          {
            defaultMessage: 'Risk level',
          }
        ),
        render: (_: string | undefined, row: EntityListRow) => (
          <RiskScoreLevel severity={parseRiskLevel(row.risk_level)} />
        ),
      },
      {
        field: 'first_seen',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.firstSeen',
          {
            defaultMessage: 'First seen',
          }
        ),
        render: (value: string | undefined) =>
          value ? (
            <FormattedRelativePreferenceDate
              value={value}
              relativeThresholdInHrs={Number.MAX_SAFE_INTEGER}
              tooltipFieldName={FIRST_SEEN_TOOLTIP_FIELD_NAME}
            />
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        field: 'last_seen',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.lastSeen',
          {
            defaultMessage: 'Last seen',
          }
        ),
        render: (value: string | undefined) =>
          value ? (
            <FormattedRelativePreferenceDate
              value={value}
              relativeThresholdInHrs={Number.MAX_SAFE_INTEGER}
              tooltipFieldName={LAST_SEEN_TOOLTIP_FIELD_NAME}
            />
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        field: 'entity_id',
        name: i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.col.euid', {
          defaultMessage: 'Entity ID (EUID)',
        }),
        truncateText: true,
        render: (id: string) => (
          <EuiText size="xs" css={{ fontFamily: euiTheme.font.familyCode }}>
            {id}
          </EuiText>
        ),
      },
    ],
    [
      agentBuilder,
      application,
      chrome,
      euiTheme.font.familyCode,
      openSidebarConversation,
      searchSession,
    ]
  );

  return (
    <div css={tableScrollStyles}>
      <EuiInMemoryTable<EntityListRow>
        tableCaption={i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.tableCaption',
          {
            defaultMessage: 'Security entities referenced in this conversation',
          }
        )}
        items={entities}
        columns={columns}
        pagination={entities.length > 10 ? { pageSizeOptions: [10, 25, 50] } : false}
        sorting={true}
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </div>
  );
};
