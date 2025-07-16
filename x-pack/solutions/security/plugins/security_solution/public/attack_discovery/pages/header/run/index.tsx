/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  onGenerate: (
    overrideConnectorId?: string,
    overrideOptions?: {
      overrideEnd?: string;
      overrideFilter?: Record<string, unknown>;
      overrideSize?: number;
      overrideStart?: string;
    }
  ) => void;
  isDisabled?: boolean;
}

const runButtonStyles = css`
  border-bottom-right-radius: 0;
  border-top-right-radius: 0;
  min-width: 74px;
  width: 74px;
`;

const RunComponent: React.FC<Props> = ({ isLoading, onGenerate, isDisabled }) => (
  <EuiToolTip
    content={isDisabled ? i18n.DISABLED_TOOLTIP : i18n.RUN_TOOLTIP}
    data-test-subj="runTooltip"
    position="bottom"
  >
    <EuiButton
      color="primary"
      css={runButtonStyles}
      data-test-subj="run"
      iconType="play"
      isDisabled={isLoading || isDisabled}
      onClick={() => onGenerate()}
    >
      {i18n.RUN}
    </EuiButton>
  </EuiToolTip>
);

RunComponent.displayName = 'Run';

export const Run = React.memo(RunComponent);
