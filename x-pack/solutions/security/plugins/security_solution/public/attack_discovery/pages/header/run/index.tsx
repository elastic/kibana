/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as sharedI18n from '../../../ai_privilege_translations';
import type { SettingsOverrideOptions } from '../../results/history/types';
import * as i18n from './translations';

interface Props {
  hasAssistantPrivilege: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  isDisabled?: boolean;
}

const runButtonStyles = css`
  border-bottom-right-radius: 0;
  border-top-right-radius: 0;
  min-width: 74px;
  width: 74px;
`;

const getTooltip = ({
  hasAssistantPrivilege,
  isDisabled,
}: Pick<Props, 'hasAssistantPrivilege' | 'isDisabled'>) => {
  if (!hasAssistantPrivilege) {
    return sharedI18n.NO_AI_ASSISTANT_PRIVILEGE_CONTROL_TOOLTIP;
  }
  if (isDisabled) {
    return i18n.DISABLED_TOOLTIP;
  }
  return i18n.RUN_TOOLTIP;
};

const RunComponent: React.FC<Props> = ({ hasAssistantPrivilege, isLoading, onGenerate, isDisabled }) => (
  <EuiToolTip
    content={getTooltip({ hasAssistantPrivilege, isDisabled })}
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
