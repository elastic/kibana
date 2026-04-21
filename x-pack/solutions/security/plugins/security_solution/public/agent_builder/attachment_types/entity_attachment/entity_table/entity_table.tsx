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
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
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
import { getContinueConversationBulkPrompt, getContinueConversationPrompt } from '../prompts';
import type { EntityAttachmentIdentifier } from '../types';

interface EntityTableProps {
  entities: EntityAttachmentIdentifier[];
  setComposerContent?: (text: string) => void;
}

interface EntityRow {
  identifier: EntityAttachmentIdentifier;
  data?: EntityForAttachment;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

const COLUMN_LABELS = {
  name: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.name', {
    defaultMessage: 'Name',
  }),
  type: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.type', {
    defaultMessage: 'Type',
  }),
  risk: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.risk', {
    defaultMessage: 'Risk',
  }),
  criticality: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.table.criticality',
    { defaultMessage: 'Criticality' }
  ),
  sources: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.sources', {
    defaultMessage: 'Sources',
  }),
  lastSeen: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.lastSeen', {
    defaultMessage: 'Last seen',
  }),
  actions: i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.table.actions', {
    defaultMessage: 'Actions',
  }),
};

const CONTINUE_CONVERSATION_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.table.actions.continueConversation',
  { defaultMessage: 'Continue the conversation' }
);

const INVESTIGATE_ALL_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.table.actions.investigateAll',
  { defaultMessage: 'Investigate these entities together' }
);

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

export const EntityTable: React.FC<EntityTableProps> = ({ entities, setComposerContent }) => {
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
        render: (_value: unknown, row: EntityRow) => (
          <EuiText size="xs">
            <strong>{row.data?.displayName ?? row.identifier.identifier}</strong>
          </EuiText>
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
        name: COLUMN_LABELS.risk,
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
        field: 'data.sources',
        name: COLUMN_LABELS.sources,
        render: (_value: unknown, row: EntityRow) => (
          <EntitySourceBadge
            isEntityInStore={row.data?.isEntityInStore ?? false}
            hasLastSeenDate={Boolean(row.data?.lastSeen)}
            data-test-subj="entityAttachmentTableSource"
          />
        ),
        width: '120px',
      },
      {
        field: 'data.lastSeen',
        name: COLUMN_LABELS.lastSeen,
        render: (_value: unknown, row: EntityRow) =>
          row.data?.lastSeen ? (
            <FormattedRelativePreferenceDate value={row.data.lastSeen} />
          ) : (
            '—'
          ),
        width: '140px',
      },
      {
        name: COLUMN_LABELS.actions,
        width: '160px',
        actions: [
          {
            name: CONTINUE_CONVERSATION_LABEL,
            description: CONTINUE_CONVERSATION_LABEL,
            icon: 'discuss',
            type: 'icon',
            available: () => Boolean(setComposerContent),
            onClick: (row: EntityRow) =>
              setComposerContent?.(getContinueConversationPrompt(row.identifier)),
            'data-test-subj': 'entityAttachmentTableContinueConversation',
          },
        ],
      },
    ],
    [setComposerContent]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: items.length,
      showPerPageOptions: false,
    }),
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
        pagination={pagination}
        onChange={({ page }) => setPageIndex(page.index)}
        itemId={(row) => keyFor(row.identifier)}
        tableLayout="auto"
      />
      <EuiFlexGroup gutterSize="s" wrap responsive={false} style={{ marginTop: 8 }}>
        {setComposerContent && entities.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="discuss"
              onClick={() => setComposerContent(getContinueConversationBulkPrompt(entities))}
              data-test-subj="entityAttachmentInvestigateAll"
              aria-label={INVESTIGATE_ALL_LABEL}
            >
              {INVESTIGATE_ALL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
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
