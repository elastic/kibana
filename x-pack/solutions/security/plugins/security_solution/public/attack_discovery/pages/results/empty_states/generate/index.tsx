/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import * as i18n from '../empty_prompt/translations';
import type { SettingsOverrideOptions } from '../../history/types';

interface Props {
  isDisabled?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
}

const GenerateComponent: React.FC<Props> = ({ isLoading, isDisabled = false, onGenerate }) => {
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const disabled = isLoading || isDisabled || !hasAssistantPrivilege;

  const tooltipContent = !hasAssistantPrivilege
    ? i18n.MISSING_PRIVILEGES
    : disabled
    ? i18n.SELECT_A_CONNECTOR
    : null;

  return (
    <EuiToolTip
      content={tooltipContent}
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
