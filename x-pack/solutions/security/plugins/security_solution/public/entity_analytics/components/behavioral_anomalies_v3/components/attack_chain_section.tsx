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
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { MitreAttackChainV3 } from '../../behavioral_anomalies/mitre/components/mitre_attack_chain_v3';
import { ATTACK_CHAIN_V3_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_ACCORDION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_TEST_ID,
} from '../test_ids';

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
}

export const AttackChainSectionV3: React.FC<AttackChainSectionV3Props> = ({
  triggeredTactics,
  anomalyCountByTactic,
  selectedTactic,
  onSelectTactic,
}) => {
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
        <EuiPanel
          color="plain"
          hasBorder
          paddingSize="none"
          css={css`
            padding: 16px 24px;
          `}
        >
          <MitreAttackChainV3
            triggeredTactics={triggeredTactics}
            showLabels
            selectedTactic={selectedTactic}
            onSelectTactic={onSelectTactic}
            // Pass per-tactic counts so each dot renders the
            // DistributionBar-style hover chip used in Insights > Alerts.
            anomalyCountByTactic={anomalyCountByTactic}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_ATTACK_CHAIN_TEST_ID}
          />
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
