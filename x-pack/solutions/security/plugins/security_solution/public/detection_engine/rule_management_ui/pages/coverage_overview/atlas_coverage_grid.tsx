/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useFetchMitreEntitiesQuery } from '@kbn/mitre-attack-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewResponse } from '../../../../../common/api/detection_engine';
import { fetchCoverageOverview } from '../../../rule_management/api/api';
import { DEFAULT_QUERY_OPTIONS } from '../../../rule_management/api/hooks/constants';
import { buildCoverageOverviewDashboardModel } from '../../../rule_management/logic/coverage_overview/build_coverage_overview_dashboard_model';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';

const AtlasCoverageGridComponent = () => {
  const { services } = useKibana();
  const isManagedEnabled = services.mitreAttack?.isEnabled ?? false;
  const {
    state: { filter },
  } = useCoverageOverviewDashboardContext();

  const atlasQuery = useFetchMitreEntitiesQuery(
    services.http,
    { framework: 'atlas' },
    { enabled: isManagedEnabled }
  );

  // Same coverage endpoint the ATT&CK grid uses — the response keys every rule by its
  // threat IDs regardless of framework, so ATLAS IDs resolve against the ATLAS graph.
  const coverageQuery = useQuery<CoverageOverviewResponse>(
    ['POST', RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL, 'atlas', filter],
    ({ signal }) => fetchCoverageOverview({ signal, filter }),
    { ...DEFAULT_QUERY_OPTIONS, enabled: isManagedEnabled }
  );

  const mitreTactics = useMemo(() => {
    if (!atlasQuery.data || !coverageQuery.data) {
      return [];
    }
    return buildCoverageOverviewDashboardModel(coverageQuery.data, {
      tactics: atlasQuery.data.tactics,
      techniques: atlasQuery.data.techniques,
      subtechniques: atlasQuery.data.subtechniques,
    }).mitreTactics;
  }, [atlasQuery.data, coverageQuery.data]);

  if (!isManagedEnabled) {
    return (
      <EuiCallOut
        announceOnMount
        title="ATLAS coverage requires managed MITRE data"
        color="warning"
        iconType="warning"
      />
    );
  }

  if (atlasQuery.isLoading || coverageQuery.isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" data-test-subj="atlasCoverageLoadingSpinner">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (atlasQuery.isError || coverageQuery.isError) {
    return (
      <EuiCallOut
        announceOnMount
        title="Failed to load MITRE ATLAS coverage"
        color="danger"
        iconType="error"
        data-test-subj="atlasCoverageErrorCallout"
      />
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="m"
      className="eui-xScroll"
      tabIndex={0}
      data-test-subj="atlasCoverageOverviewMatrix"
    >
      {mitreTactics.map((tactic) => (
        <EuiFlexGroup
          data-test-subj={`atlasCoverageOverviewTacticGroup-${tactic.id}`}
          direction="column"
          key={tactic.id}
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <CoverageOverviewTacticPanel tactic={tactic} />
          </EuiFlexItem>

          {tactic.techniques.map((technique, techniqueKey) => (
            <EuiFlexItem grow={false} key={`${technique.id}-${techniqueKey}`}>
              <CoverageOverviewMitreTechniquePanelPopover technique={technique} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
};

export const AtlasCoverageGrid = memo(AtlasCoverageGridComponent);
