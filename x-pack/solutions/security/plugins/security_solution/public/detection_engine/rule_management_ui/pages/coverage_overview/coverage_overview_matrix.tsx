/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';

const CoverageOverviewMatrixComponent = () => {
  const {
    state: { data },
  } = useCoverageOverviewDashboardContext();

  return (
    <EuiFlexGroup
      gutterSize="m"
      className="eui-xScroll"
      tabIndex={0}
      data-test-subj="coverageOverviewMatrix"
    >
      {data?.mitreTactics.map((tactic) => (
        <EuiFlexGroup
          data-test-subj={`coverageOverviewTacticGroup-${tactic.id}`}
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

export const CoverageOverviewMatrix = React.memo(CoverageOverviewMatrixComponent);
