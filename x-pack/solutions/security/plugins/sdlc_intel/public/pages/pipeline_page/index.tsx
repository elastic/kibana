/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
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
import { PipelineLegend } from './components/pipeline_legend';
import { PipelineRoadmapBlock } from './components/pipeline_roadmap_block';
import { PipelineToolbar } from './components/pipeline_toolbar';
import { PipelineVisionPanel } from './components/pipeline_vision_panel';
import { usePipelineData } from './hooks/use_pipeline_data';
import { PHASE_DEFINITIONS } from './lib/phase_definitions';

export const PipelinePage = () => {
  const { euiTheme } = useEuiTheme();
  const [expandAll, setExpandAll] = useState(false);
  const [expandedCells, setExpandedCells] = useState<ReadonlySet<string>>(new Set());
  const {
    loading,
    error,
    roadmaps,
    scope,
    orgTeamOptions,
    subteamOptions,
    productRoadmapOptions,
    filters,
    setOrgTeamKey,
    setSubteamKey,
    setProductRoadmapId,
    setSearch,
    setGateStatus,
  } = usePipelineData();

  const expandableCellKeys = useMemo(
    () =>
      roadmaps.flatMap((roadmap) =>
        roadmap.epics.flatMap((epic) =>
          PHASE_DEFINITIONS.map((definition) => `${epic.id}|${definition.key}`)
        )
      ),
    [roadmaps]
  );

  const handleToggleCell = useCallback((cellKey: string) => {
    setExpandedCells((current) => {
      const next = new Set(current);
      if (next.has(cellKey)) {
        next.delete(cellKey);
      } else {
        next.add(cellKey);
      }
      return next;
    });
  }, []);

  const handleToggleExpandAll = useCallback(() => {
    setExpandAll((current) => {
      const next = !current;
      setExpandedCells(next ? new Set(expandableCellKeys) : new Set());
      return next;
    });
  }, [expandableCellKeys]);

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
              id="xpack.sdlcIntel.pipeline.pageTitle"
              defaultMessage="Development lifecycle — phase pipeline"
            />
          }
          description={
            <>
              <SyncStatusBanner />
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.pageSubtitle"
                  defaultMessage="Shared view for all Security teams — track every epic from PRD through production telemetry."
                />
              </EuiText>
            </>
          }
          bottomBorder
        />

        <EuiPageTemplate.Section paddingSize="none">
          <PipelineVisionPanel />
          <PipelineLegend />
          <EuiSpacer size="s" />

          {loading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}

          {!loading && error ? (
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.loadErrorTitle"
                  defaultMessage="Unable to load phase pipeline"
                />
              }
              color="danger"
              iconType="error"
            >
              <p>{error}</p>
            </EuiCallOut>
          ) : null}

          {!loading && !error ? (
            <>
              <PipelineToolbar
                scope={scope}
                orgTeamOptions={orgTeamOptions}
                subteamOptions={subteamOptions}
                productRoadmapOptions={productRoadmapOptions}
                search={filters.search}
                gateStatus={filters.gateStatus}
                expandAll={expandAll}
                onOrgTeamChange={setOrgTeamKey}
                onSubteamChange={setSubteamKey}
                onProductRoadmapChange={setProductRoadmapId}
                onSearchChange={setSearch}
                onGateStatusChange={setGateStatus}
                onToggleExpandAll={handleToggleExpandAll}
              />
              <EuiSpacer size="s" />
              {roadmaps.length === 0 ? (
                <EuiEmptyPrompt
                  iconType="search"
                  title={
                    <FormattedMessage
                      id="xpack.sdlcIntel.pipeline.empty.title"
                      defaultMessage="No epics match the current filters"
                    />
                  }
                />
              ) : (
                roadmaps.map((roadmap) => (
                  <PipelineRoadmapBlock
                    key={roadmap.id}
                    roadmap={roadmap}
                    expandedCells={expandedCells}
                    onToggleCell={handleToggleCell}
                    forceOpen={expandAll ? true : undefined}
                  />
                ))
              )}
            </>
          ) : null}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </div>
  );
};
