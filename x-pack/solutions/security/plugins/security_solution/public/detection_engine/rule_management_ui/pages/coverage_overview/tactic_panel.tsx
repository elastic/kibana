/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiProgress, EuiSpacer, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useMemo } from 'react';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';
import { coverageOverviewPanelWidth } from './constants';
import * as i18n from './translations';
import { CoverageOverviewPanelRuleStats } from './shared_components/panel_rule_stats';
import { getNumOfCoveredTechniques } from '../../../rule_management/model/coverage_overview/mitre_technique';
import {
  getPrototypeEnabledDisabledCounts,
  getPrototypeRuleCount,
} from './prototype_coverage_colors';

export interface CoverageOverviewTacticPanelProps {
  tactic: CoverageOverviewMitreTactic;
  usePrototype?: boolean;
}

const CoverageOverviewTacticPanelComponent = ({
  tactic,
  usePrototype = false,
}: CoverageOverviewTacticPanelProps) => {
  const { euiTheme } = useEuiTheme();

  const realCoveredTechniques = useMemo(() => getNumOfCoveredTechniques(tactic), [tactic]);

  const coveredTechniques = useMemo(() => {
    if (!usePrototype) {
      return realCoveredTechniques;
    }
    return tactic.techniques.filter((_, index) => getPrototypeRuleCount(index) > 0).length;
  }, [realCoveredTechniques, tactic.techniques, usePrototype]);

  const { enabledRulesCount, disabledRulesCount } = useMemo(() => {
    if (!usePrototype) {
      return {
        enabledRulesCount: tactic.enabledRules.length,
        disabledRulesCount: tactic.disabledRules.length,
      };
    }
    return tactic.techniques.reduce(
      (acc, _, index) => {
        const counts = getPrototypeEnabledDisabledCounts(index);
        acc.enabledRulesCount += counts.enabledRules;
        acc.disabledRulesCount += counts.disabledRules;
        return acc;
      },
      { enabledRulesCount: 0, disabledRulesCount: 0 }
    );
  }, [tactic.disabledRules.length, tactic.enabledRules.length, tactic.techniques, usePrototype]);

  const ProgressLabel = useMemo(
    () => (
      <EuiText size="xs" color="success">
        <h5>{i18n.COVERED_MITRE_TECHNIQUES(coveredTechniques, tactic.techniques.length)}</h5>
      </EuiText>
    ),
    [tactic.techniques, coveredTechniques]
  );

  return (
    <EuiPanel
      data-test-subj="coverageOverviewTacticPanel"
      hasShadow={false}
      hasBorder
      paddingSize="s"
      css={css`
        background: ${euiTheme.colors.lightestShade};
        border-color: ${euiTheme.colors.mediumShade};
        width: ${coverageOverviewPanelWidth}px;
      `}
    >
      <EuiToolTip content={tactic.name}>
        <EuiText
          tabIndex={0}
          css={css`
            h4 {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          `}
          aria-label={tactic.name}
          title={tactic.name}
          grow={false}
          size="xs"
        >
          <h4>{tactic.name}</h4>
        </EuiText>
      </EuiToolTip>

      <EuiProgress
        color="success"
        value={coveredTechniques}
        label={ProgressLabel}
        max={tactic.techniques.length}
      />
      <EuiSpacer size="m" />
      <CoverageOverviewPanelRuleStats
        enabledRules={enabledRulesCount}
        disabledRules={disabledRulesCount}
      />
    </EuiPanel>
  );
};

export const CoverageOverviewTacticPanel = memo(CoverageOverviewTacticPanelComponent);
