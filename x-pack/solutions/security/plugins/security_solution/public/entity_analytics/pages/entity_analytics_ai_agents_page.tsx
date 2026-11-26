/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { useAiAgentsInventory } from '../components/ai_agents/hooks/use_ai_agents';
import { AiAgentsTable } from '../components/ai_agents/components/ai_agents_table';
import { AI_AGENTS_SCOPE_ID } from '../components/ai_agents/constants';
import type { AgentInventoryRow } from '../components/ai_agents/types';
import {
  ALERTS_UNAVAILABLE,
  EMPTY_BODY,
  EMPTY_TITLE,
  LOAD_ERROR,
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  POC_BADGE,
  TILE_INSTALLS,
  TILE_RUNS_AS_ROOT,
  TILE_SHARED_ACCOUNTS,
  TILE_WITH_ALERTS,
} from '../components/ai_agents/translations';

export const AI_AGENTS_PAGE_TEST_ID = 'entityAnalyticsAiAgentsPage';

const countSharedAccounts = (rows: readonly AgentInventoryRow[]): number => {
  const installsByEmail = new Map<string, number>();
  rows.forEach((row) =>
    row.accountEmails.forEach((email) =>
      installsByEmail.set(email, (installsByEmail.get(email) ?? 0) + 1)
    )
  );
  return [...installsByEmail.values()].filter((installs) => installs > 1).length;
};

/** AI agents page (proof of concept): one row per install from the Entity Store. */
export const EntityAnalyticsAiAgentsPage = () => {
  const { data, isLoading, isError } = useAiAgentsInventory();
  const { openAiAgentFlyout } = useFlyoutApi();
  const rows = useMemo(() => data?.rows ?? [], [data]);

  const onOpenAgent = useCallback(
    (row: AgentInventoryRow) =>
      openAiAgentFlyout({
        entityId: row.entityId,
        entityName: row.entityName,
        scopeId: AI_AGENTS_SCOPE_ID,
      }),
    [openAiAgentFlyout]
  );

  const tiles = useMemo(
    () => [
      { title: rows.length, description: TILE_INSTALLS },
      { title: rows.filter((row) => row.alertCount > 0).length, description: TILE_WITH_ALERTS },
      { title: countSharedAccounts(rows), description: TILE_SHARED_ACCOUNTS },
      {
        title: rows.filter((row) => row.userName === 'root').length,
        description: TILE_RUNS_AS_ROOT,
      },
    ],
    [rows]
  );

  return (
    <SecuritySolutionPageWrapper data-test-subj={AI_AGENTS_PAGE_TEST_ID}>
      <HeaderPage
        title={PAGE_TITLE}
        subtitle={[PAGE_DESCRIPTION]}
        badgeOptions={{ beta: true, text: POC_BADGE }}
        backOptions={{ pageId: SecurityPageName.entityAnalyticsHomePage, text: ENTITY_ANALYTICS }}
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
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            {tiles.map((tile) => (
              <EuiFlexItem key={tile.description}>
                <EuiPanel hasBorder paddingSize="m">
                  <EuiStat
                    title={tile.title}
                    description={tile.description}
                    titleSize="m"
                    isLoading={isLoading}
                  />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          {data?.alertsUnavailable && (
            <>
              <KbnWarningCallout announceOnMount size="s" title={ALERTS_UNAVAILABLE} />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiPanel hasBorder>
            <AiAgentsTable
              rows={rows}
              loading={isLoading}
              alertsUnavailable={!!data?.alertsUnavailable}
              onOpenAgent={onOpenAgent}
            />
          </EuiPanel>
        </>
      )}
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </SecuritySolutionPageWrapper>
  );
};
