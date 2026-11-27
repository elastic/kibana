/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { GroupSelector } from '@kbn/grouping/src/components/group_selector';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { getUnsanctionedAiAgentsWatchlistSavedObjectId } from '../../../common/entity_analytics/watchlists/constants';
import { useAiAgentsInventory } from '../components/ai_security/hooks/use_ai_agents';
import { useWatchlistLookup } from '../components/ai_security/hooks/use_watchlist_lookup';
import { AiAgentsTable } from '../components/ai_security/components/ai_agents_table';
import { AiAgentsGroups } from '../components/ai_security/components/ai_agents_groups';
import { AiAgentTiles } from '../components/ai_security/components/ai_agent_tiles';
import { HuntAiAgentsButton } from '../components/ai_security/components/hunt_ai_agents_button';
import { UnsanctionedSetupCallout } from '../components/ai_security/components/unsanctioned_setup_callout';
import {
  filterBySearch,
  isUnsanctioned,
  matchesTile,
  type AiAgentTileId,
  type TileContext,
} from '../components/ai_security/components/agent_filters';
import {
  AGENT_GROUP_BY_OPTIONS,
  type AgentGroupByOption,
} from '../components/ai_security/components/agent_groups';
import { AI_SECURITY_SCOPE_ID } from '../components/ai_security/constants';
import type { AgentInventoryRow } from '../components/ai_security/types';
import { getAgentTitle } from '../components/ai_security/utils';
import {
  ALERTS_UNAVAILABLE,
  EMPTY_BODY,
  EMPTY_TITLE,
  GROUP_BY_HOST,
  GROUP_BY_PERSON,
  GROUP_BY_TITLE,
  INSTALLS_SHOWN,
  LOAD_ERROR,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  POC_BADGE,
  SEARCH_PLACEHOLDER,
  TILES_TITLE,
} from '../components/ai_security/translations';

export const AI_SECURITY_PAGE_TEST_ID = 'entityAnalyticsAiSecurityPage';

type GroupBy = 'none' | AgentGroupByOption;

const GROUP_BY_LABELS: Readonly<Record<AgentGroupByOption, string>> = {
  person: GROUP_BY_PERSON,
  host: GROUP_BY_HOST,
};
const GROUP_BY_OPTIONS = AGENT_GROUP_BY_OPTIONS.map((key) => ({
  key,
  label: GROUP_BY_LABELS[key],
}));
const GROUP_BY_SETTINGS = { hideCustomFieldOption: true };

const isGroupByOption = (key: string): key is AgentGroupByOption =>
  AGENT_GROUP_BY_OPTIONS.some((option) => option === key);

/** AI security page (proof of concept): one row per install from the Entity Store. */
export const EntityAnalyticsAiSecurityPage = () => {
  const spaceId = useSpaceId();
  const { data, isLoading, isError, dataUpdatedAt } = useAiAgentsInventory();
  const { openAiAgentFlyout } = useFlyoutApi();
  const watchlistLookup = useWatchlistLookup();
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const unsanctionedWatchlistId = getUnsanctionedAiAgentsWatchlistSavedObjectId(
    spaceId ?? 'default'
  );

  const [activeTile, setActiveTile] = useState<AiAgentTileId | null>(null);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const tileContext = useMemo(
    (): TileContext => ({ unsanctionedWatchlistId, now: dataUpdatedAt || Date.now() }),
    [unsanctionedWatchlistId, dataUpdatedAt]
  );
  const shownRows = useMemo(() => {
    const tileRows = activeTile
      ? rows.filter((row) => matchesTile(activeTile, row, tileContext))
      : rows;
    return filterBySearch(tileRows, search, watchlistLookup);
  }, [rows, activeTile, tileContext, search, watchlistLookup]);
  const hasUnsanctionedRows = useMemo(
    () => rows.some((row) => isUnsanctioned(row, unsanctionedWatchlistId)),
    [rows, unsanctionedWatchlistId]
  );

  const onToggleTile = useCallback(
    (tileId: AiAgentTileId) => setActiveTile((current) => (current === tileId ? null : tileId)),
    []
  );
  const onGroupChange = useCallback(
    (key: string) =>
      setGroupBy((current) => (isGroupByOption(key) && key !== current ? key : 'none')),
    []
  );

  const onOpenAgent = useCallback(
    (row: AgentInventoryRow) =>
      openAiAgentFlyout({
        entityId: row.entityId,
        entityName: getAgentTitle(row, row.hostName),
        scopeId: AI_SECURITY_SCOPE_ID,
      }),
    [openAiAgentFlyout]
  );

  return (
    <SecuritySolutionPageWrapper data-test-subj={AI_SECURITY_PAGE_TEST_ID}>
      <HeaderPage
        title={PAGE_TITLE}
        subtitle={[PAGE_DESCRIPTION]}
        badgeOptions={{ beta: true, text: POC_BADGE }}
        backOptions={{ pageId: SecurityPageName.entityAnalyticsHomePage, text: ENTITY_ANALYTICS }}
        rightSideItems={[<HuntAiAgentsButton key="huntWithAi" />]}
      />
      {isError ? (
        <KbnDangerCallout announceOnMount title={LOAD_ERROR} />
      ) : !isLoading && rows.length === 0 ? (
        <EuiEmptyPrompt
          iconType="sparkles"
          title={<h2>{EMPTY_TITLE}</h2>}
          body={<p>{EMPTY_BODY}</p>}
        />
      ) : (
        <>
          <EuiTitle size="xs">
            <h4>{TILES_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AiAgentTiles
            rows={rows}
            isLoading={isLoading}
            context={tileContext}
            activeTile={activeTile}
            onToggleTile={onToggleTile}
          />
          <EuiSpacer size="l" />
          {!isLoading && (
            <UnsanctionedSetupCallout
              watchlistId={unsanctionedWatchlistId}
              hasMemberRows={hasUnsanctionedRows}
            />
          )}
          {data?.alertsUnavailable && (
            <>
              <KbnWarningCallout announceOnMount size="s" title={ALERTS_UNAVAILABLE} />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiPanel hasBorder>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  incremental
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={SEARCH_PLACEHOLDER}
                  aria-label={SEARCH_PLACEHOLDER}
                  data-test-subj="aiSecuritySearch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="aiSecurityInstallsShown">
                  {INSTALLS_SHOWN(shownRows.length, rows.length)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <GroupSelector
                  groupingId="ai-security-group-by"
                  groupsSelected={[groupBy]}
                  onGroupChange={onGroupChange}
                  options={GROUP_BY_OPTIONS}
                  fields={[]}
                  title={GROUP_BY_TITLE}
                  maxGroupingLevels={1}
                  settings={GROUP_BY_SETTINGS}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {groupBy === 'none' ? (
              <AiAgentsTable
                rows={shownRows}
                loading={isLoading}
                alertsUnavailable={!!data?.alertsUnavailable}
                unsanctionedWatchlistId={unsanctionedWatchlistId}
                onOpenAgent={onOpenAgent}
              />
            ) : (
              <AiAgentsGroups
                groupBy={groupBy}
                rows={shownRows}
                alertsUnavailable={!!data?.alertsUnavailable}
                unsanctionedWatchlistId={unsanctionedWatchlistId}
                onOpenAgent={onOpenAgent}
              />
            )}
          </EuiPanel>
        </>
      )}
      <SpyRoute pageName={SecurityPageName.entityAnalyticsAiSecurity} />
    </SecuritySolutionPageWrapper>
  );
};
