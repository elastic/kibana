/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DeviceControlAccessLevel } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import { OS_CONTROL_WIDTH } from './os_control_layout';

const ALLOW_ALL_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl.allowReadWrite',
  {
    defaultMessage: 'Allow read, write and execute',
  }
);

const BLOCK_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl.blockAll',
  {
    defaultMessage: 'Block all',
  }
);

const READ_ONLY_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl.readOnly',
  {
    defaultMessage: 'Read only',
  }
);

const BLOCK_EXECUTE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl.executeOnly',
  {
    defaultMessage: 'Read and write',
  }
);

const ACCESS_LEVEL_SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl.accessLevelSelectAriaLabel',
  {
    defaultMessage: 'USB storage access level',
  }
);

const ACCESS_LEVEL_LABELS: Record<DeviceControlAccessLevel, string> = {
  [DeviceControlAccessLevelEnum.audit]: ALLOW_ALL_LABEL,
  [DeviceControlAccessLevelEnum.read_only]: READ_ONLY_LABEL,
  [DeviceControlAccessLevelEnum.no_execute]: BLOCK_EXECUTE_LABEL,
  [DeviceControlAccessLevelEnum.deny_all]: BLOCK_LABEL,
};

const ACCESS_LEVEL_OPTIONS: Array<EuiSuperSelectOption<DeviceControlAccessLevel>> = [
  DeviceControlAccessLevelEnum.audit,
  DeviceControlAccessLevelEnum.no_execute,
  DeviceControlAccessLevelEnum.read_only,
  DeviceControlAccessLevelEnum.deny_all,
].map((accessLevel) => ({
  value: accessLevel,
  inputDisplay: ACCESS_LEVEL_LABELS[accessLevel],
  dropdownDisplay: ACCESS_LEVEL_LABELS[accessLevel],
}));

export interface PerOsDeviceControlAccessLevelSelectProps {
  accessLevel: DeviceControlAccessLevel;
  onAccessLevelChange: (accessLevel: DeviceControlAccessLevel) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export const PerOsDeviceControlAccessLevelSelect = memo<PerOsDeviceControlAccessLevelSelectProps>(
  ({ accessLevel, onAccessLevelChange, disabled, 'data-test-subj': dataTestSubj }) => {
    const handleChange = useCallback(
      (selectedAccessLevel: DeviceControlAccessLevel) => {
        onAccessLevelChange(selectedAccessLevel);
      },
      [onAccessLevelChange]
    );

    return (
      <EuiFlexItem
        grow={false}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-fixedWidth` : undefined}
        css={{ inlineSize: OS_CONTROL_WIDTH, maxInlineSize: '100%' }}
      >
        <EuiSuperSelect<DeviceControlAccessLevel>
          options={ACCESS_LEVEL_OPTIONS}
          valueOfSelected={accessLevel}
          onChange={handleChange}
          disabled={disabled}
          fullWidth={true}
          data-test-subj={dataTestSubj}
          aria-label={ACCESS_LEVEL_SELECT_ARIA_LABEL}
        />
      </EuiFlexItem>
    );
  }
);
PerOsDeviceControlAccessLevelSelect.displayName = 'PerOsDeviceControlAccessLevelSelect';
