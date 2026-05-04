/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash/fp';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskStats, RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreCell } from '../../../../entity_analytics/components/home/entities_table/risk_score_cell';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import {
  columnsArray,
  getItems,
} from '../../../../entity_analytics/components/risk_summary_flyout/common';

interface RiskSummaryMiniProps {
  entityType: EntityType;
  displayName: string;
  riskScore?: number;
  riskLevel?: RiskSeverity;
  riskStats?: RiskStats;
  resolutionRiskScore?: number;
  resolutionRiskLevel?: RiskSeverity;
  resolutionRiskStats?: RiskStats;
  privmonModifierEnabled: boolean;
  watchlistEnabled: boolean;
}

const TITLE = (entityType: EntityType) =>
  i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.risk.title', {
    defaultMessage: '{entity} risk summary',
    values: { entity: capitalize(entityType) },
  });

const ENTITY_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.risk.entityScore',
  { defaultMessage: 'Entity risk score' }
);

const RESOLUTION_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.risk.resolutionGroupScore',
  { defaultMessage: 'Resolution group risk score' }
);

const ScoreBlock: React.FC<{
  label: string;
  score?: number;
  level?: RiskSeverity;
  testSubj: string;
}> = ({ label, score, level, testSubj }) => (
  <EuiPanel hasBorder paddingSize="s" data-test-subj={testSubj}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            <RiskScoreCell riskScore={score} />
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      {level && (
        <EuiFlexItem grow={false}>
          <RiskScoreLevel severity={level} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiPanel>
);

const ContributionsTable: React.FC<{
  displayName: string;
  riskStats?: RiskStats;
  privmonModifierEnabled: boolean;
  watchlistEnabled: boolean;
  testSubj: string;
}> = ({ displayName, riskStats, privmonModifierEnabled, watchlistEnabled, testSubj }) => {
  const items = useMemo(
    () =>
      getItems(
        riskStats ? { name: displayName, risk: riskStats } : undefined,
        privmonModifierEnabled,
        watchlistEnabled
      ),
    [displayName, riskStats, privmonModifierEnabled, watchlistEnabled]
  );

  return (
    <EuiBasicTable
      data-test-subj={testSubj}
      responsiveBreakpoint={false}
      columns={columnsArray}
      items={items}
      compressed
    />
  );
};

/**
 * Chat-scale recreation of the flyout's `FlyoutRiskSummary`. Uses the risk
 * stats embedded on the entity store record (fed by `useEntityForAttachment`)
 * instead of the heavy `useRiskScore` search-strategy hook so it works
 * outside the Security Solution Redux store. Visuals (score block + basic
 * table of Category/Score/Inputs) match the flyout so users see the same
 * data in chat and in the flyout.
 */
export const RiskSummaryMini: React.FC<RiskSummaryMiniProps> = ({
  entityType,
  displayName,
  riskScore,
  riskLevel,
  riskStats,
  resolutionRiskScore,
  resolutionRiskLevel,
  resolutionRiskStats,
  privmonModifierEnabled,
  watchlistEnabled,
}) => {
  if (!riskStats && riskScore == null) {
    return null;
  }

  const showResolution =
    !!resolutionRiskStats || resolutionRiskScore != null || !!resolutionRiskLevel;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="none"
      data-test-subj="entityAttachmentRiskSummaryMini"
    >
      <EuiTitle size="xs">
        <h3>{TITLE(entityType)}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" direction="row" wrap>
        <EuiFlexItem grow={1} style={{ minWidth: 160 }}>
          <ScoreBlock
            label={ENTITY_RISK_LABEL}
            score={riskScore}
            level={riskLevel}
            testSubj="entityAttachmentEntityRiskScoreBlock"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2} style={{ minWidth: 220 }}>
          <ContributionsTable
            displayName={displayName}
            riskStats={riskStats}
            privmonModifierEnabled={privmonModifierEnabled}
            watchlistEnabled={watchlistEnabled}
            testSubj="entityAttachmentRiskContributionsTable"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showResolution && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup gutterSize="s" direction="row" wrap>
            <EuiFlexItem grow={1} style={{ minWidth: 160 }}>
              <ScoreBlock
                label={RESOLUTION_RISK_LABEL}
                score={resolutionRiskScore}
                level={resolutionRiskLevel}
                testSubj="entityAttachmentResolutionRiskScoreBlock"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2} style={{ minWidth: 220 }}>
              <ContributionsTable
                displayName={displayName}
                riskStats={resolutionRiskStats}
                privmonModifierEnabled={privmonModifierEnabled}
                watchlistEnabled={watchlistEnabled}
                testSubj="entityAttachmentResolutionContributionsTable"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
