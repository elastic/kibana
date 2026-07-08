/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype bordered panel wrapper shared by the Attack chain and Anomaly
 * timeline sections (empty + loading states).
 *
 * Cleanup: delete with the BA-v.3 folder.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';

interface BehavioralAnomaliesV3BorderedVizPanelProps {
  children: React.ReactNode;
  heightPx?: number;
  centerContent?: boolean;
  'data-test-subj'?: string;
}

export const BehavioralAnomaliesV3BorderedVizPanel: React.FC<
  BehavioralAnomaliesV3BorderedVizPanelProps
> = ({ children, heightPx, centerContent = false, 'data-test-subj': dataTestSubj }) => (
  <EuiPanel
    color="plain"
    hasBorder
    paddingSize="none"
    data-test-subj={dataTestSubj}
    css={css`
      padding: 16px 24px;
      ${heightPx !== undefined ? `height: ${heightPx}px;` : ''}
      ${centerContent
        ? `
          display: flex;
          align-items: center;
          justify-content: center;
        `
        : ''}
    `}
  >
    {children}
  </EuiPanel>
);
