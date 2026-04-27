/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as sharedI18n from '../../../../ai_privilege_translations';
import * as i18n from '../empty_prompt/translations';
import type { SettingsOverrideOptions } from '../../history/types';

interface Props {
  hasAssistantPrivilege: boolean;
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
}

const getTooltip = ({
  disabled,
  hasAssistantPrivilege,
}: {
  disabled: boolean;
  hasAssistantPrivilege: boolean;
}) => {
  if (!hasAssistantPrivilege) {
    return sharedI18n.NO_AI_ASSISTANT_PRIVILEGE_CONTROL_TOOLTIP;
  }
  if (disabled) {
    return i18n.SELECT_A_CONNECTOR;
  }
  return null;
};

const GenerateComponent: React.FC<Props> = ({
  hasAssistantPrivilege,
  isLoading,
  isDisabled = false,
  onGenerate,
}) => {
  const disabled = isLoading || isDisabled;

  return (
    <EuiToolTip
      content={getTooltip({ disabled, hasAssistantPrivilege })}
      data-test-subj="generateTooltip"
    >
      <EuiButton
        color="primary"
        data-test-subj="generate"
        disabled={disabled}
        onClick={() => onGenerate()}
      >
        {i18n.GENERATE}
      </EuiButton>
    </EuiToolTip>
  );
};

GenerateComponent.displayName = 'Generate';

export const Generate = React.memo(GenerateComponent);
