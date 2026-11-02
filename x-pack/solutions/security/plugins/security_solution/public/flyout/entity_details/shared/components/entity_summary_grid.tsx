/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { AssetCriticalityModal } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { useGetWatchlists } from '../../../../entity_analytics/api/hooks/use_get_watchlists';
import { getWatchlistName } from '../../../../../common/entity_analytics/watchlists/constants';
import { EntitySourceValue, TruncatedBadgeList } from './entity_source_value';
import {
  getMaxCriticality,
  getUnionEntitySources,
  getUnionWatchlistIds,
  isEntityGroupView,
} from '../entity_store_group_utils';

const WATCHLISTS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.grid.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

const ENTITY_IDS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.grid.entityIdsOverflowTitle',
  { defaultMessage: 'Additional entity IDs' }
);

interface EntitySummaryGridProps {
  /** Primary record: its id is the one shown (and copied) in the Entity ID panel. */
  entityRecord: Entity;
  /**
   * Other records that resolve to `entityRecord` (its aliases). When non-empty, the Entity ID panel
   * lists the alias ids behind a `+N` badge, asset criticality shows the most severe level across
   * the group, and data sources and watchlists are the union across the group; criticality is
   * read-only in that mode because a single edit can't target all members.
   */
  aliasRecords?: readonly Entity[];
  criticalityLevel?: CriticalityLevelWithUnassigned | null;
  onCriticalitySave?: (value: CriticalityLevelWithUnassigned) => void;
}

export const EntitySummaryGrid = memo(
  ({ entityRecord, aliasRecords, criticalityLevel, onCriticalitySave }: EntitySummaryGridProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const entityId = entityRecord.entity?.id;
    const isGroupView = isEntityGroupView(aliasRecords);

    const groupRecords = isGroupView ? [entityRecord, ...aliasRecords] : [entityRecord];
    const aliasEntityIds = isGroupView ? getAliasEntityIds(aliasRecords, entityId) : [];
    const dataSources = getUnionEntitySources(groupRecords);
    const watchlistIds = getUnionWatchlistIds(groupRecords);
    const displayedCriticality = isGroupView ? getMaxCriticality(groupRecords) : criticalityLevel;

    const criticalitySaveHandler = isGroupView ? undefined : onCriticalitySave;

    return (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGrid columns={2} gutterSize="s">
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.entityIdLabel',
              { defaultMessage: 'Entity ID' }
            )}
          >
            <TruncatedBadgeList
              values={entityId ? [entityId, ...aliasEntityIds] : []}
              overflowTooltipTitle={ENTITY_IDS_OVERFLOW_TOOLTIP_TITLE}
              showValueTooltip
              trailing={entityId ? <CopyEntityIdButton entityId={entityId} /> : undefined}
              data-test-subj="entityIdCell"
              textSize="xs"
            />
          </SummaryPanel>
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.dataSourceLabel',
              { defaultMessage: 'Data source' }
            )}
          >
            <EntitySourceValue values={dataSources} textSize="xs" />
          </SummaryPanel>
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.assetCriticalityLabel',
              { defaultMessage: 'Asset criticality' }
            )}
          >
            <AssetCriticalityCell
              criticalityLevel={displayedCriticality}
              canEdit={!!criticalitySaveHandler}
              onOpenModal={() => setModalVisible(true)}
            />
          </SummaryPanel>
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.watchlistsLabel',
              { defaultMessage: 'Watchlists' }
            )}
          >
            <WatchlistsCell watchlistIds={watchlistIds} />
          </SummaryPanel>
        </EuiFlexGrid>
        <EuiSpacer size="s" />
        {modalVisible && criticalitySaveHandler && (
          <AssetCriticalityModal
            initialCriticalityLevel={
              displayedCriticality === 'unassigned' ? undefined : displayedCriticality
            }
            onSave={(value) => {
              criticalitySaveHandler(value);
              setModalVisible(false);
            }}
            toggle={setModalVisible}
          />
        )}
      </>
    );
  }
);
EntitySummaryGrid.displayName = 'EntitySummaryGrid';

/** Distinct `entity.id`s of the aliases, in the order they were loaded, never repeating the target's. */
const getAliasEntityIds = (
  aliasRecords: readonly Entity[],
  targetEntityId: string | undefined
): string[] =>
  Array.from(
    new Set(
      aliasRecords
        .map((record) => record.entity?.id)
        .filter((id): id is string => !!id && id !== targetEntityId)
    )
  );

const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.grid.copyToClipboard',
  { defaultMessage: 'Copy to clipboard' }
);

const CopyEntityIdButton = memo(({ entityId }: { entityId: string }) => (
  // Height 0 with visible overflow keeps the button from pushing the text down; the button is
  // translated up by half its height to center it vertically.
  <div
    css={css`
      height: 0;
      overflow: visible;
      align-self: center;
    `}
  >
    <EuiCopy textToCopy={entityId}>
      {(copy) => (
        <EuiToolTip content={COPY_TO_CLIPBOARD} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="copy"
            aria-label={COPY_TO_CLIPBOARD}
            onClick={copy}
            iconSize="s"
            color="text"
            css={css`
              transform: translateY(-50%);
            `}
          />
        </EuiToolTip>
      )}
    </EuiCopy>
  </div>
));
CopyEntityIdButton.displayName = 'CopyEntityIdButton';

const SummaryPanel = memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <EuiPanel
    hasBorder
    paddingSize="s"
    css={css`
      min-width: 0;
      padding: 8px 12px 10px;
    `}
  >
    <EuiText size="xs">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    {children}
  </EuiPanel>
));
SummaryPanel.displayName = 'SummaryPanel';

const AssetCriticalityCell = memo(
  ({
    criticalityLevel,
    canEdit,
    onOpenModal,
  }: {
    criticalityLevel?: CriticalityLevelWithUnassigned | null;
    canEdit: boolean;
    onOpenModal: () => void;
  }) => (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={
        canEdit
          ? css`
              cursor: pointer;
            `
          : undefined
      }
      onClick={canEdit ? onOpenModal : undefined}
    >
      <EuiFlexItem grow={false}>
        <AssetCriticalityBadge criticalityLevel={criticalityLevel ?? 'unassigned'} textSize="xs" />
      </EuiFlexItem>
      {canEdit && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="chevronSingleDown"
            size="s"
            aria-hidden={true}
            data-test-subj="asset-criticality-edit-chevron"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);
AssetCriticalityCell.displayName = 'AssetCriticalityCell';

const WatchlistsCell = memo(({ watchlistIds }: { watchlistIds: string[] }) => {
  const { data: watchlistsData } = useGetWatchlists();

  const watchlistNamesById = useMemo(() => {
    const map = new Map<string, string>();
    (watchlistsData ?? []).forEach((watchlist: { id?: string; name: string }) => {
      if (watchlist.id) {
        map.set(watchlist.id, watchlist.name);
      }
    });
    return map;
  }, [watchlistsData]);

  const resolvedNames = useMemo<string[]>(() => {
    if (watchlistIds.length === 0) return [];
    return watchlistIds
      .map((id) => {
        const watchlistName = watchlistNamesById.get(id) ?? getWatchlistName(id);
        // If all we have is the ID, the watchlist has likely been deleted
        return watchlistName !== id ? watchlistName : undefined;
      })
      .filter((name): name is string => name !== undefined);
  }, [watchlistIds, watchlistNamesById]);

  return (
    <TruncatedBadgeList
      values={resolvedNames}
      overflowTooltipTitle={WATCHLISTS_OVERFLOW_TOOLTIP_TITLE}
      data-test-subj="entityWatchlistsCell"
      textSize="xs"
    />
  );
});
WatchlistsCell.displayName = 'WatchlistsCell';
