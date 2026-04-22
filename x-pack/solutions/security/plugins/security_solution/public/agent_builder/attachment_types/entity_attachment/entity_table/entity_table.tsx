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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { APP_UI_ID, ENTITY_ANALYTICS_PATH } from '../../../../../common/constants';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { RiskScoreCell } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';
import { EntitySourceBadge } from '../../../../flyout/entity_details/shared/components/entity_source_badge';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { useEntityForAttachment } from '../use_entity_for_attachment';
import type { EntityForAttachment } from '../use_entity_for_attachment';
import type { EntityAttachmentIdentifier } from '../types';
import { formatEntitySource } from './entity_data_source_utils';

interface EntityTableProps {
  entities: EntityAttachmentIdentifier[];
}

interface EntityRow {
  identifier: EntityAttachmentIdentifier;
  data?: EntityForAttachment;
  isLoading: boolean;
}

const PAGE_SIZE = 10;
const MAX_VISIBLE_SOURCES = 3;

const COLUMN_LABELS = {
  name: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.name', {
    defaultMessage: 'Name',
  }),
  type: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.type', {
    defaultMessage: 'Type',
  }),
  riskScore: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.table.riskScore',
    { defaultMessage: 'Risk score' }
  ),
  criticality: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.table.criticality',
    { defaultMessage: 'Criticality' }
  ),
  dataSource: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.table.dataSource',
    { defaultMessage: 'Data source' }
  ),
  lastSeen: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.lastSeen', {
    defaultMessage: 'Last seen',
  }),
};

const NAME_TOOLTIP_NO_ENTITY_ID = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.table.nameTooltipNoEntityId',
  { defaultMessage: 'Entity id not available' }
);

const SOURCES_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.table.dataSourceOverflowTitle',
  { defaultMessage: 'Additional data sources' }
);

const LAST_SEEN_TOOLTIP_FIELD_NAME = 'entity.lifecycle.last_activity';

const OPEN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.table.openEntityAnalytics',
  { defaultMessage: 'Open Entity Analytics' }
);

const identifierTypeToEntityType = (
  type: EntityAttachmentIdentifier['identifierType']
): EntityType => {
  switch (type) {
    case 'host':
      return EntityType.host;
    case 'user':
      return EntityType.user;
    case 'service':
      return EntityType.service;
    case 'generic':
    default:
      return EntityType.generic;
  }
};

const entityTypeLabels: Record<EntityType, string> = {
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.host',
    { defaultMessage: 'Host' }
  ),
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.user',
    { defaultMessage: 'User' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.service',
    { defaultMessage: 'Service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.generic',
    { defaultMessage: 'Entity' }
  ),
};

/**
 * Per-row loader. Keeps `useEntityForAttachment` one-per-component-instance
 * (Rules of Hooks) while letting the table re-render progressively as each
 * entity resolves. The parent owns the row map and merges results.
 */
const EntityRowLoader: React.FC<{
  identifier: EntityAttachmentIdentifier;
  onLoaded: (identifier: EntityAttachmentIdentifier, result: EntityRow) => void;
}> = ({ identifier, onLoaded }) => {
  const { data, isLoading } = useEntityForAttachment(identifier);

  React.useEffect(() => {
    onLoaded(identifier, { identifier, data: data ?? undefined, isLoading });
  }, [identifier, data, isLoading, onLoaded]);

  return null;
};

/**
 * Renders the resolved data sources for an entity row. Shows up to
 * `MAX_VISIBLE_SOURCES` formatted badges and collapses any overflow into a
 * single `+N more` badge whose tooltip lists the remaining sources. When no
 * sources are available we fall back to the legacy `EntitySourceBadge` so the
 * column still surfaces an "Entity Store" / "Observed" hint for older records.
 */
const EntityDataSourceBadges: React.FC<{
  sources: string[] | undefined;
  isEntityInStore: boolean;
  hasLastSeenDate: boolean;
}> = ({ sources, isEntityInStore, hasLastSeenDate }) => {
  const list = sources ?? [];

  if (list.length === 0) {
    return (
      <EntitySourceBadge
        isEntityInStore={isEntityInStore}
        hasLastSeenDate={hasLastSeenDate}
        data-test-subj="entityAttachmentTableSource"
      />
    );
  }

  const visible = list.slice(0, MAX_VISIBLE_SOURCES);
  const hidden = list.slice(MAX_VISIBLE_SOURCES);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="entityAttachmentTableSources"
    >
      {visible.map((source) => (
        <EuiFlexItem grow={false} key={source}>
          <EuiBadge color="hollow" data-test-subj="entityAttachmentTableSource">
            {formatEntitySource(source)}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {hidden.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            title={SOURCES_OVERFLOW_TOOLTIP_TITLE}
            content={hidden.map(formatEntitySource).join(', ')}
          >
            <EuiBadge color="hollow" data-test-subj="entityAttachmentTableSourcesOverflow">
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.entityAttachment.table.dataSourceOverflow',
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
};

export const EntityTable: React.FC<EntityTableProps> = ({ entities }) => {
  const { services } = useKibana<{ application: ApplicationStart }>();
  const [pageIndex, setPageIndex] = useState(0);
  const [rowsByKey, setRowsByKey] = useState<Record<string, EntityRow>>({});

  const keyFor = useCallback(
    (identifier: EntityAttachmentIdentifier) =>
      `${identifier.identifierType}:${identifier.identifier}`,
    []
  );

  const handleLoaded = useCallback(
    (identifier: EntityAttachmentIdentifier, result: EntityRow) => {
      setRowsByKey((prev) => {
        const existing = prev[keyFor(identifier)];
        if (
          existing &&
          existing.isLoading === result.isLoading &&
          existing.data === result.data
        ) {
          return prev;
        }
        return { ...prev, [keyFor(identifier)]: result };
      });
    },
    [keyFor]
  );

  const items = useMemo<EntityRow[]>(
    () =>
      entities.map(
        (identifier) =>
          rowsByKey[keyFor(identifier)] ?? {
            identifier,
            isLoading: true,
          }
      ),
    [entities, rowsByKey, keyFor]
  );

  const pagedItems = useMemo(
    () => items.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [items, pageIndex]
  );

  const handleOpenEntityAnalytics = useCallback(() => {
    services.application?.navigateToApp(APP_UI_ID, { path: ENTITY_ANALYTICS_PATH });
  }, [services.application]);

  const columns = useMemo<Array<EuiBasicTableColumn<EntityRow>>>(
    () => [
      {
        field: 'identifier.identifier',
        name: COLUMN_LABELS.name,
        render: (_value: unknown, row: EntityRow) => {
          const label = row.data?.displayName ?? row.identifier.identifier;
          const tooltipContent = row.data?.entityId ?? NAME_TOOLTIP_NO_ENTITY_ID;
          return (
            <EuiToolTip position="top" content={tooltipContent}>
              <EuiText size="xs" data-test-subj="entityAttachmentTableName">
                <strong>{label}</strong>
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'data.sources',
        name: COLUMN_LABELS.dataSource,
        render: (_value: unknown, row: EntityRow) => (
          <EntityDataSourceBadges
            sources={row.data?.sources}
            isEntityInStore={row.data?.isEntityInStore ?? false}
            hasLastSeenDate={Boolean(row.data?.lastSeen)}
          />
        ),
      },
      {
        field: 'identifier.identifierType',
        name: COLUMN_LABELS.type,
        render: (_value: unknown, row: EntityRow) => (
          <EuiBadge color="hollow">
            {entityTypeLabels[
              row.data?.entityType ?? identifierTypeToEntityType(row.identifier.identifierType)
            ]}
          </EuiBadge>
        ),
        width: '110px',
      },
      {
        field: 'data.riskScore',
        name: COLUMN_LABELS.riskScore,
        render: (_value: unknown, row: EntityRow) =>
          row.isLoading ? (
            <EuiSkeletonText lines={1} />
          ) : (
            <RiskScoreCell riskScore={row.data?.riskScore} />
          ),
        width: '110px',
      },
      {
        field: 'data.assetCriticality',
        name: COLUMN_LABELS.criticality,
        render: (_value: unknown, row: EntityRow) => (
          <AssetCriticalityBadge
            criticalityLevel={row.data?.assetCriticality ?? 'unassigned'}
            dataTestSubj="entityAttachmentTableCriticality"
          />
        ),
        width: '150px',
      },
      {
        field: 'data.lastSeen',
        name: COLUMN_LABELS.lastSeen,
        render: (_value: unknown, row: EntityRow) =>
          row.data?.lastSeen ? (
            <FormattedRelativePreferenceDate
              value={row.data.lastSeen}
              relativeThresholdInHrs={Number.MAX_SAFE_INTEGER}
              tooltipFieldName={LAST_SEEN_TOOLTIP_FIELD_NAME}
            />
          ) : (
            '—'
          ),
        width: '140px',
      },
    ],
    []
  );

  /**
   * EuiBasicTable's prop signature is split: passing `pagination` makes
   * `onChange` mandatory, and the inverse variant rejects an `undefined`
   * `pagination`. Conditionally spreading both keeps a single render path
   * while satisfying the discriminated union.
   */
  const paginationProps = useMemo(
    () =>
      items.length > PAGE_SIZE
        ? {
            pagination: {
              pageIndex,
              pageSize: PAGE_SIZE,
              totalItemCount: items.length,
              showPerPageOptions: false,
            },
            onChange: ({ page }: Criteria<EntityRow>) => {
              if (page) setPageIndex(page.index);
            },
          }
        : {},
    [items.length, pageIndex]
  );

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      data-test-subj="entityAttachmentTable"
    >
      {entities.map((identifier) => (
        <EntityRowLoader
          key={keyFor(identifier)}
          identifier={identifier}
          onLoaded={handleLoaded}
        />
      ))}
      <EuiBasicTable
        aria-label={i18n.translate(
          'xpack.securitySolution.agentBuilder.entityAttachment.table.caption',
          { defaultMessage: 'Entities referenced in this message' }
        )}
        items={pagedItems}
        columns={columns}
        itemId={(row) => keyFor(row.identifier)}
        tableLayout="auto"
        {...paginationProps}
      />
      <EuiFlexGroup gutterSize="s" wrap responsive={false} style={{ marginTop: 8 }}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            onClick={handleOpenEntityAnalytics}
            data-test-subj="entityAttachmentTableOpenEntityAnalytics"
            aria-label={OPEN_ENTITY_ANALYTICS_LABEL}
          >
            {OPEN_ENTITY_ANALYTICS_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
