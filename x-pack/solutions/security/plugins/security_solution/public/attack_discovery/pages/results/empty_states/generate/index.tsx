/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from '../empty_prompt/translations';
import type { SettingsOverrideOptions } from '../../history/types';

interface Props {
  isDisabled?: boolean;
  hasConnectorsPrivilege?: boolean;
  isLoading: boolean;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
}

const GenerateComponent: React.FC<Props> = ({ isLoading, isDisabled = false, hasConnectorsPrivilege = true, onGenerate }) => {
  const disabled = isLoading || isDisabled;

  return (
    <EuiToolTip
      content={disabled ? (hasConnectorsPrivilege ? i18n.SELECT_A_CONNECTOR : i18n.NO_CONNECTORS_PRIVILEGE) : null}
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
