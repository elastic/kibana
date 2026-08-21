/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexItem, EuiHealth, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { OS_CONTROL_WIDTH } from './os_control_layout';

const PREVENT_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.perOs.protectionMode.detectAndPrevent',
  {
    defaultMessage: 'Detect & prevent',
  }
);

const DETECT_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.perOs.protectionMode.detect',
  {
    defaultMessage: 'Detect',
  }
);

const OFF_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.perOs.protectionMode.disable',
  {
    defaultMessage: 'Disable',
  }
);

const PROTECTION_MODE_SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.protectionModeSelectAriaLabel',
  {
    defaultMessage: 'Protection mode',
  }
);

const MODE_LABELS: Record<ProtectionModes, string> = {
  [ProtectionModes.prevent]: PREVENT_LABEL,
  [ProtectionModes.detect]: DETECT_LABEL,
  [ProtectionModes.off]: OFF_LABEL,
};

const MODE_HEALTH_COLOR: Record<ProtectionModes, 'success' | 'warning' | 'danger'> = {
  [ProtectionModes.prevent]: 'success',
  [ProtectionModes.detect]: 'warning',
  [ProtectionModes.off]: 'danger',
};

const renderModeOption = (mode: ProtectionModes) => (
  <EuiHealth color={MODE_HEALTH_COLOR[mode]} textSize="inherit">
    {MODE_LABELS[mode]}
  </EuiHealth>
);

const PROTECTION_MODE_OPTIONS: Array<EuiSuperSelectOption<ProtectionModes>> = [
  ProtectionModes.off,
  ProtectionModes.detect,
  ProtectionModes.prevent,
].map((mode) => ({
  value: mode,
  inputDisplay: renderModeOption(mode),
  dropdownDisplay: renderModeOption(mode),
}));

export interface OsProtectionModeSelectProps {
  mode: ProtectionModes;
  onModeChange: (mode: ProtectionModes) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export const OsProtectionModeSelect = memo<OsProtectionModeSelectProps>(
  ({ mode, onModeChange, disabled, 'data-test-subj': dataTestSubj }) => {
    const handleChange = useCallback(
      (selectedMode: ProtectionModes) => {
        onModeChange(selectedMode);
      },
      [onModeChange]
    );

    return (
      <EuiFlexItem
        grow={false}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-fixedWidth` : undefined}
        css={{ inlineSize: OS_CONTROL_WIDTH, maxInlineSize: '100%' }}
      >
        <EuiSuperSelect<ProtectionModes>
          options={PROTECTION_MODE_OPTIONS}
          valueOfSelected={mode}
          onChange={handleChange}
          disabled={disabled}
          fullWidth={true}
          data-test-subj={dataTestSubj}
          aria-label={PROTECTION_MODE_SELECT_ARIA_LABEL}
        />
      </EuiFlexItem>
    );
  }
);
OsProtectionModeSelect.displayName = 'OsProtectionModeSelect';
