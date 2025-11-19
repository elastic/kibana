/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import type { ImmutableArray } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../types';

export interface DeviceControlSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  selected: boolean;
  protectionLabel?: string;
  osList: ImmutableArray<DeviceControlOSes>;
}

export const DeviceControlSettingCardSwitch = React.memo(
  ({
    protectionLabel,
    osList,
    onChange,
    policy,
    mode,
    selected,
    'data-test-subj': dataTestSubj,
  }: DeviceControlSettingCardSwitchProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEditMode = mode === 'edit';

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);

        if (event.target.checked === false) {
          // Disable device control for Windows and Mac
          newPayload.windows.device_control = {
            enabled: false,
            usb_storage: DeviceControlAccessLevelEnum.audit,
          };
          newPayload.windows.popup.device_control = {
            enabled: false,
            message: newPayload.windows.popup.device_control?.message || '',
          };

          newPayload.mac.device_control = {
            enabled: false,
            usb_storage: DeviceControlAccessLevelEnum.audit,
          };
          newPayload.mac.popup.device_control = {
            enabled: false,
            message: newPayload.mac.popup.device_control?.message || '',
          };
        } else {
          // Enable device control for Windows and Mac
          newPayload.windows.device_control = {
            enabled: true,
            usb_storage: DeviceControlAccessLevelEnum.deny_all,
          };
          newPayload.windows.popup = newPayload.windows.popup || {};
          newPayload.windows.popup.device_control = {
            enabled: true,
            message: newPayload.windows.popup.device_control?.message || '',
          };

          newPayload.mac.device_control = {
            enabled: true,
            usb_storage: DeviceControlAccessLevelEnum.deny_all,
          };
          newPayload.mac.popup = newPayload.mac.popup || {};
          newPayload.mac.popup.device_control = {
            enabled: true,
            message: newPayload.mac.popup.device_control?.message || '',
          };
        }

        onChange({
          isValid: true,
          updatedPolicy: newPayload,
        });
      },
      [policy, onChange]
    );

    return (
      <EuiSwitch
        label={protectionLabel}
        labelProps={{ 'data-test-subj': getTestId('label') }}
        checked={selected}
        disabled={!isEditMode}
        onChange={handleSwitchChange}
        data-test-subj={getTestId()}
      />
    );
  }
);

DeviceControlSettingCardSwitch.displayName = 'DeviceControlSettingCardSwitch';
