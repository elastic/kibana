/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { MitreAttackChain } from './mitre_attack_chain';

interface MitreAttackChainPlaceholderProps {
  children?: React.ReactNode;
  showLabels?: boolean;
}

export const MitreAttackChainPlaceholder: React.FC<MitreAttackChainPlaceholderProps> = ({
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
      <MitreAttackChain triggeredTactics={[]} showLabels={showLabels} anomalyCountByTactic={{}} />
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
