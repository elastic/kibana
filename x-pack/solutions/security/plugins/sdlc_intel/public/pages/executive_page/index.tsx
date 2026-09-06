/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyncStatusBanner } from '../../components/sync_status_banner';
import { ExecutiveToolbar } from './components/executive_toolbar';
import { PortfolioMetrics } from './components/portfolio_metrics';
import { RiskBanner } from './components/risk_banner';
import { RoadmapList } from './components/roadmap_list';
import { useExecutiveRoadmaps } from './hooks/use_executive_roadmaps';

export const ExecutivePage = () => {
  const { euiTheme } = useEuiTheme();
  const [expandAll, setExpandAll] = useState(false);
  const {
    loading,
    error,
    response,
    summary,
    derived,
    roadmaps,
    ownerOptions,
    productOptions,
    filters,
    setSearch,
    setProduct,
    setOwner,
    setCoverage,
    engineeringTeamOptions,
    setEngineeringTeam,
    setDeckBucket,
  } = useExecutiveRoadmaps();

  return (
    <div
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiPageTemplate restrictWidth={false} paddingSize="none" offset={0} grow={false}>
        <EuiPageTemplate.Header
          pageTitle={
            <FormattedMessage
              id="xpack.sdlcIntel.executive.pageTitle"
              defaultMessage="Development lifecycle — executive view"
            />
          }
          description={
            <>
              <SyncStatusBanner />
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.scopeHint"
                  defaultMessage="Scoped to Security org teams (SIEM, Security Intelligence, SDE, XDR, Platform Delivery), grouped by subteam."
                />
              </EuiText>
            </>
          }
          bottomBorder
        />

        <EuiPageTemplate.Section paddingSize="none">
          {loading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.sdlcIntel.executive.loading"
                    defaultMessage="Loading roadmap data…"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}

          {!loading && error ? (
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.loadErrorTitle"
                  defaultMessage="Unable to load executive dashboard"
                />
              }
              color="danger"
              iconType="error"
            >
              <p>{error}</p>
            </EuiCallOut>
          ) : null}

          {!loading && !error && !response ? (
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.emptyResponseTitle"
                  defaultMessage="Roadmap data did not load"
                />
              }
              color="warning"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.sdlcIntel.executive.emptyResponseBody"
                defaultMessage="Sync status is available, but the roadmaps API returned no payload. Check the browser network tab for /internal/sdlc/roadmaps and reload the page."
              />
            </EuiCallOut>
          ) : null}

          {!loading && !error && response && summary && derived ? (
            <>
              <RiskBanner summary={summary} onShowAtRisk={() => setCoverage('risk')} />
              <EuiSpacer size="m" />
              <PortfolioMetrics summary={summary} derived={derived} />
              <EuiSpacer size="m" />
              <ExecutiveToolbar
                search={filters.search}
                product={filters.product}
                owner={filters.owner}
                coverage={filters.coverage}
                engineeringTeam={filters.engineeringTeam}
                deckBucket={filters.deckBucket}
                productOptions={productOptions}
                ownerOptions={ownerOptions}
                engineeringTeamOptions={engineeringTeamOptions}
                expandAll={expandAll}
                onSearchChange={setSearch}
                onProductChange={setProduct}
                onOwnerChange={setOwner}
                onCoverageChange={setCoverage}
                onEngineeringTeamChange={setEngineeringTeam}
                onDeckBucketChange={setDeckBucket}
                onToggleExpandAll={() => setExpandAll((current) => !current)}
              />
              <EuiSpacer size="m" />
              {roadmaps.length === 0 ? (
                <EuiText color="subdued">
                  <FormattedMessage
                    id="xpack.sdlcIntel.executive.noData"
                    defaultMessage="No roadmap data yet. Run the SDLC GitHub sync orchestrator to populate indices."
                  />
                </EuiText>
              ) : (
                <RoadmapList roadmaps={roadmaps} expandAll={expandAll} filters={filters} />
              )}
            </>
          ) : null}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </div>
  );
};
