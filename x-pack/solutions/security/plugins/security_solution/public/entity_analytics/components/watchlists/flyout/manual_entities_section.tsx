/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  type Criteria,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { WatchlistManualEntity } from '../../../../../common/api/entity_analytics/watchlists/entities/list_manual.gen';
import { useManualWatchlistEntities } from '../../../api/hooks/use_manual_watchlist_entities';
import { useUnassignWatchlistEntity } from '../../../api/hooks/use_unassign_watchlist_entity';
import { useWatchlistsPrivileges } from '../../../api/hooks/use_watchlists_privileges';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const i18nStrings = {
  title: i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.manualEntities.title', {
    defaultMessage: 'Manually added entities',
  }),
  description: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.description',
    {
      defaultMessage:
        'Entities added to this watchlist by hand. Removing one only removes that assignment: it stays on the watchlist if a rule also matches it.',
    }
  ),
  tableCaption: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.tableCaption',
    { defaultMessage: 'Manually added entities' }
  ),
  entityColumn: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.entityColumn',
    { defaultMessage: 'Entity' }
  ),
  typeColumn: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.typeColumn',
    { defaultMessage: 'Type' }
  ),
  empty: i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.manualEntities.empty', {
    defaultMessage: 'No entities have been added to this watchlist by hand',
  }),
  loadError: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.loadError',
    { defaultMessage: 'Unable to load the manually added entities' }
  ),
  removeTooltip: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.removeTooltip',
    { defaultMessage: 'Remove from this watchlist' }
  ),
  noPermissionTooltip: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.noPermissionTooltip',
    { defaultMessage: 'You do not have permission to modify watchlists' }
  ),
  removeLabel: (entity: string, watchlist: string) =>
    i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.manualEntities.removeLabel', {
      defaultMessage: 'Remove {entity} from {watchlist}',
      values: { entity, watchlist },
    }),
};

interface ManualEntitiesSectionProps {
  watchlistId: string;
  watchlistName: string;
}

/**
 * The entities added to a watchlist by hand, in the watchlist's edit flyout, each with a remove
 * icon. It removes at once, like the entity flyout's resolution group; an entity that a rule also
 * matches leaves this list and stays on the watchlist.
 */
export const ManualEntitiesSection = ({
  watchlistId,
  watchlistName,
}: ManualEntitiesSectionProps) => {
  const {
    data: privileges,
    error: privilegesError,
    isLoading: isPrivilegesLoading,
  } = useWatchlistsPrivileges();
  const canRemove =
    !isPrivilegesLoading && !privilegesError && (privileges?.has_all_required ?? false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const { data, isLoading, isError } = useManualWatchlistEntities({
    watchlistId,
    page: pageIndex + 1,
    perPage: pageSize,
  });
  const { mutate: unassign, isLoading: isRemoving, variables } = useUnassignWatchlistEntity();

  const entities = data?.entities ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<Array<EuiBasicTableColumn<WatchlistManualEntity>>>(
    () => [
      {
        field: 'name',
        name: i18nStrings.entityColumn,
        truncateText: true,
        render: (_: unknown, { euid, name }: WatchlistManualEntity) => name ?? euid,
      },
      { field: 'type', name: i18nStrings.typeColumn, width: '25%' },
      {
        width: '48px',
        render: ({ euid, name }: WatchlistManualEntity) => {
          const label = name ?? euid;
          return (
            <EuiToolTip
              content={canRemove ? i18nStrings.removeTooltip : i18nStrings.noPermissionTooltip}
              disableScreenReaderOutput={canRemove}
            >
              <EuiButtonIcon
                iconType="cross"
                color="primary"
                aria-label={i18nStrings.removeLabel(label, watchlistName)}
                disabled={!canRemove || isRemoving}
                isLoading={isRemoving && variables?.euid === euid}
                onClick={() => unassign({ watchlistId, euid })}
                data-test-subj={`watchlistManualEntityRemove-${euid}`}
              />
            </EuiToolTip>
          );
        },
      },
    ],
    [canRemove, isRemoving, unassign, variables?.euid, watchlistId, watchlistName]
  );

  const onTableChange = ({ page }: Criteria<WatchlistManualEntity>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <div data-test-subj="watchlistManualEntitiesSection">
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{i18nStrings.title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>{i18nStrings.description}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiLoadingSpinner size="m" data-test-subj="watchlistManualEntitiesLoading" />
      ) : isError ? (
        <KbnDangerCallout
          announceOnMount
          size="s"
          title={i18nStrings.loadError}
          data-test-subj="watchlistManualEntitiesError"
        />
      ) : total === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="watchlistManualEntitiesEmpty">
          <p>{i18nStrings.empty}</p>
        </EuiText>
      ) : (
        <EuiBasicTable<WatchlistManualEntity>
          tableCaption={i18nStrings.tableCaption}
          items={entities}
          itemId="euid"
          columns={columns}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: total,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
          onChange={onTableChange}
          data-test-subj="watchlistManualEntitiesTable"
        />
      )}
    </div>
  );
};
