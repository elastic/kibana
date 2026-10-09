/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { SettingsOverrideOptions } from '../../results/history/types';
import * as i18n from './translations';

interface Props {
  /** `false` when the user lacks the Workflows Management `execute` privilege. */
  hasWorkflowsExecute?: boolean;
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
}

const runButtonStyles = css`
  border-bottom-right-radius: 0;
  border-top-right-radius: 0;
  min-width: 74px;
`;

const RunComponent: React.FC<Props> = ({
  hasWorkflowsExecute = true,
  isDisabled,
  isLoading,
  onGenerate,
}) => {
  const missingWorkflowsExecute = !hasWorkflowsExecute;

  const tooltipContent = missingWorkflowsExecute
    ? i18n.MISSING_WORKFLOWS_EXECUTE_TOOLTIP
    : isDisabled
    ? i18n.DISABLED_TOOLTIP
    : i18n.RUN_TOOLTIP;

  return (
    <EuiToolTip content={tooltipContent} data-test-subj="runTooltip" position="bottom">
      <EuiButton
        color="primary"
        css={runButtonStyles}
        data-test-subj="run"
        iconType="play"
        isDisabled={isLoading || isDisabled || missingWorkflowsExecute}
        onClick={() => onGenerate()}
      >
        {i18n.RUN}
      </EuiButton>
    </EuiToolTip>
  );
};

RunComponent.displayName = 'Run';

export const Run = React.memo(RunComponent);
