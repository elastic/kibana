/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * "Attack chain" section rendered at the top of the BA-v.3 left tab content.
 * Displays the same MITRE ATT&CK chain visualization as the right-panel v.2
 * overview, but with labels under each dot (truncated + tooltip).
 *
 * Cleanup: deleted with the rest of the `behavioral_anomalies_v3/` folder.
 */

import React from 'react';
import { EuiAccordion, EuiLoadingChart, EuiSpacer, EuiTitle } from '@elastic/eui';
import { MitreAttackChainV3 } from '../../behavioral_anomalies/mitre/components/mitre_attack_chain_v3';
import { EMPTY_ATTACK_CHAIN_DATA_V3 } from '../mock_tab_data';
import { ATTACK_CHAIN_V3_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_ACCORDION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_LOADING_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_TEST_ID,
} from '../test_ids';
import { BehavioralAnomaliesV3BorderedVizPanel } from './bordered_viz_panel';
import { AttackChainVizHeightSizerV3 } from './attack_chain_viz_height_sizer';

interface AttackChainSectionV3Props {
  triggeredTactics: readonly string[];
  /**
   * Per-tactic anomaly counts whose total equals the in-range total shown in
   * the Anomalies table below. Each chip in the chain reads from this map so
   * the chain and the table can never drift.
   */
  anomalyCountByTactic: Readonly<Record<string, number>>;
  /** Currently selected tactic filter (drives the per-dot selected styling). */
  selectedTactic?: string | null;
  /** Click handler raised when a triggered dot is activated. */
  onSelectTactic?: (tactic: string) => void;
  /**
   * Prototype empty state — grey dots with zero counts. When true, the
   * `triggeredTactics` / `anomalyCountByTactic` props are ignored.
   */
  isEmptyState?: boolean;
  /** Prototype loading state — spinner inside the bordered viz panel. */
  isLoadingState?: boolean;
}

export const AttackChainSectionV3: React.FC<AttackChainSectionV3Props> = ({
  triggeredTactics,
  anomalyCountByTactic,
  selectedTactic,
  onSelectTactic,
  isEmptyState = false,
  isLoadingState = false,
}) => {
  const chainTriggeredTactics = isEmptyState
    ? EMPTY_ATTACK_CHAIN_DATA_V3.triggeredTactics
    : triggeredTactics;
  const chainAnomalyCountByTactic = isEmptyState
    ? EMPTY_ATTACK_CHAIN_DATA_V3.anomalyCountByTactic
    : anomalyCountByTactic;

  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_SECTION_TEST_ID}>
      <EuiAccordion
        id="behavioralAnomaliesV3AttackChainAccordion"
        data-test-subj={BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_ACCORDION_TEST_ID}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>{ATTACK_CHAIN_V3_TITLE}</h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        {/* Mirrors Attack discovery's bordered EuiPanel wrapper. The top
            padding is bumped (vs the 16px on the other sides) to leave room
            for the per-tactic hover chip rendered above each dot. */}
        <BehavioralAnomaliesV3BorderedVizPanel
          data-test-subj={
            isLoadingState ? BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_LOADING_TEST_ID : undefined
          }
        >
          {isLoadingState ? (
            <AttackChainVizHeightSizerV3>
              <EuiLoadingChart size="l" />
            </AttackChainVizHeightSizerV3>
          ) : (
            <MitreAttackChainV3
              triggeredTactics={chainTriggeredTactics}
              showLabels
              selectedTactic={isEmptyState ? null : selectedTactic}
              onSelectTactic={isEmptyState ? undefined : onSelectTactic}
              // Pass per-tactic counts so each dot renders the
              // DistributionBar-style hover chip used in Insights > Alerts.
              anomalyCountByTactic={chainAnomalyCountByTactic}
              showPersistentFirstTacticBadge={isEmptyState}
              data-test-subj={BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_TEST_ID}
            />
          )}
        </BehavioralAnomaliesV3BorderedVizPanel>
      </EuiAccordion>
    </div>
  );
};
