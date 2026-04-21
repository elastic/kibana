/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
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
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { AssetCriticalityModal } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { useGetWatchlists } from '../../../../entity_analytics/api/hooks/use_get_watchlists';
import { getWatchlistName } from '../../../../../common/entity_analytics/watchlists/constants';
import { getEmptyTagValue } from '../../../../common/components/empty_value';

interface EntitySummaryGridProps {
  entityRecord: Entity;
  criticalityLevel?: CriticalityLevelWithUnassigned | null;
  onCriticalitySave?: (value: CriticalityLevelWithUnassigned) => void;
}

export const EntitySummaryGrid = memo(
  ({ entityRecord, criticalityLevel, onCriticalitySave }: EntitySummaryGridProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const entityId = entityRecord.entity?.id;

    const watchlistIds = useMemo(() => {
      const attrs = (entityRecord.entity as Record<string, unknown>)?.attributes as
        | Record<string, unknown>
        | undefined;
      return (attrs?.watchlists as string[] | undefined) ?? [];
    }, [entityRecord]);

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
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
              <EuiFlexItem className="eui-textTruncate">
                <EuiToolTip content={entityId}>
                  <EuiText size="s" className="eui-textTruncate">
                    {entityId ?? getEmptyTagValue()}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
              {entityId && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.securitySolution.flyout.entityDetails.grid.copyToClipboard',
                      { defaultMessage: 'Copy to clipboard' }
                    )}
                  >
                    <EuiCopy textToCopy={entityId}>
                      {(copy) => (
                        <EuiButtonIcon
                          iconType="copy"
                          aria-label={i18n.translate(
                            'xpack.securitySolution.flyout.entityDetails.grid.copyToClipboard',
                            { defaultMessage: 'Copy to clipboard' }
                          )}
                          onClick={copy}
                          iconSize="s"
                          color="text"
                        />
                      )}
                    </EuiCopy>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </SummaryPanel>
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.dataSourceLabel',
              { defaultMessage: 'Data source' }
            )}
          >
            <EuiText size="s">{entityRecord.entity?.source ?? getEmptyTagValue()}</EuiText>
          </SummaryPanel>
          <SummaryPanel
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.grid.assetCriticalityLabel',
              { defaultMessage: 'Asset criticality' }
            )}
          >
            <AssetCriticalityCell
              criticalityLevel={criticalityLevel}
              canEdit={!!onCriticalitySave}
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
        {modalVisible && onCriticalitySave && (
          <AssetCriticalityModal
            initialCriticalityLevel={
              criticalityLevel === 'unassigned' ? undefined : criticalityLevel
            }
            onSave={(value) => {
              onCriticalitySave(value);
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

const SummaryPanel = memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <EuiPanel hasBorder paddingSize="m" style={{ minWidth: 0 }}>
    <EuiText size="s">
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
        <AssetCriticalityBadge criticalityLevel={criticalityLevel ?? 'unassigned'} />
      </EuiFlexItem>
      {canEdit && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="arrowDown" size="s" aria-hidden={true} />
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

  const resolvedNames = useMemo(() => {
    if (watchlistIds.length === 0) return [];
    return watchlistIds
      .map((id) => {
        const watchlistName = watchlistNamesById.get(id) ?? getWatchlistName(id);
        // If all we have is the ID, the watchlist has likely been deleted
        return watchlistName !== id ? watchlistName : undefined;
      })
      .filter((name) => name !== undefined);
  }, [watchlistIds, watchlistNamesById]);

  if (resolvedNames.length === 0) {
    return <EuiText size="s">{getEmptyTagValue()}</EuiText>;
  }

  const firstName = resolvedNames[0];
  const moreCount = resolvedNames.length - 1;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{firstName}</EuiText>
      </EuiFlexItem>
      {moreCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={resolvedNames.slice(1).join(', ')}>
            <EuiButtonEmpty size="xs" flush="left">
              {`+${moreCount} `}
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.grid.watchlistsMore"
                defaultMessage="More"
              />
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
WatchlistsCell.displayName = 'WatchlistsCell';
