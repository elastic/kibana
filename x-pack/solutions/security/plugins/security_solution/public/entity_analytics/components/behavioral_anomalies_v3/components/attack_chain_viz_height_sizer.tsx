/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Invisible BA-v.3 attack chain used as a height sizer so the Anomaly
 * timeline empty/loading panels and the Attack chain loading panel match
 * the labeled chain container height.
 *
 * Cleanup: delete with the BA-v.3 folder.
 */

import React from 'react';
import { css } from '@emotion/react';
import { MitreAttackChainV3 } from '../../behavioral_anomalies/mitre/components/mitre_attack_chain_v3';
import { EMPTY_ATTACK_CHAIN_DATA_V3 } from '../mock_tab_data';

interface AttackChainVizHeightSizerV3Props {
  children?: React.ReactNode;
  /** Matches the labeled left-tab chain when true; compact right-panel chain when false. */
  showLabels?: boolean;
}

export const AttackChainVizHeightSizerV3: React.FC<AttackChainVizHeightSizerV3Props> = ({
  children,
  showLabels = true,
}) => (
  <div
    css={css`
      position: relative;
      width: 100%;
    `}
  >
    <div
      aria-hidden="true"
      css={css`
        visibility: hidden;
      `}
    >
      <MitreAttackChainV3
        triggeredTactics={EMPTY_ATTACK_CHAIN_DATA_V3.triggeredTactics}
        showLabels={showLabels}
        anomalyCountByTactic={EMPTY_ATTACK_CHAIN_DATA_V3.anomalyCountByTactic}
        showPersistentFirstTacticBadge={showLabels}
      />
    </div>
    {children !== undefined && (
      <div
        css={css`
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        {children}
      </div>
    )}
  </div>
);
