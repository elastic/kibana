/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * "Attack chain" section rendered at the top of the BA-v.2 left tab content.
 * Displays the same MITRE ATT&CK chain visualization as the right-panel v.2
 * overview, but with labels under each dot (truncated + tooltip).
 *
 * Cleanup: deleted with the rest of the `behavioral_anomalies_v2/` folder.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { MitreAttackChain } from '../../behavioral_anomalies/mitre/components/mitre_attack_chain';
import { ATTACK_CHAIN_V2_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_SECTION_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_TEST_ID,
} from '../test_ids';

interface AttackChainSectionV2Props {
  triggeredTactics: readonly string[];
  /** Currently selected tactic filter (drives the per-dot selected styling). */
  selectedTactic?: string | null;
  /** Click handler raised when a triggered dot is activated. */
  onSelectTactic?: (tactic: string) => void;
}

export const AttackChainSectionV2: React.FC<AttackChainSectionV2Props> = ({
  triggeredTactics,
  selectedTactic,
  onSelectTactic,
}) => {
  return (
    <div data-test-subj={BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_SECTION_TEST_ID}>
      <EuiTitle size="xs">
        <h3>{ATTACK_CHAIN_V2_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {/* Mirrors Attack discovery's bordered EuiPanel wrapper but with the
          plain background + 16px vertical / 24px horizontal padding called
          out by the BA-v.2 design. */}
      <EuiPanel
        color="plain"
        hasBorder
        paddingSize="none"
        css={css`
          padding: 16px 24px;
        `}
      >
        <MitreAttackChain
          triggeredTactics={triggeredTactics}
          showLabels
          selectedTactic={selectedTactic}
          onSelectTactic={onSelectTactic}
          data-test-subj={BEHAVIORAL_ANOMALIES_V2_ATTACK_CHAIN_TEST_ID}
        />
      </EuiPanel>
    </div>
  );
};
