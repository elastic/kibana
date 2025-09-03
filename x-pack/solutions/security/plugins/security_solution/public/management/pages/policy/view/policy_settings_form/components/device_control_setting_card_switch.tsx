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
import type { ImmutableArray, PolicyConfig } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../types';

export interface DeviceControlSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  selected: boolean;
  protectionLabel?: string;
  osList: ImmutableArray<DeviceControlOSes>;
  additionalOnSwitchChange?: ({
    value,
    policyConfigData,
    protectionOsList,
  }: {
    value: boolean;
    policyConfigData: PolicyConfig;
    protectionOsList: ImmutableArray<DeviceControlOSes>;
  }) => PolicyConfig;
}

export const DeviceControlSettingCardSwitch = React.memo(
  ({
    protectionLabel,
    osList,
    additionalOnSwitchChange,
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
          newPayload.windows.device_control = newPayload.windows.device_control || {
            enabled: false,
            usb_storage: DeviceControlAccessLevelEnum.audit,
          };
          newPayload.windows.device_control.enabled = false;
          newPayload.windows.popup.device_control = newPayload.windows.popup.device_control || {
            enabled: false,
            message: 'Elastic Security {action} {rule}',
          };
          newPayload.windows.popup.device_control.enabled = false;

          newPayload.mac.device_control = newPayload.mac.device_control || {
            enabled: false,
            usb_storage: DeviceControlAccessLevelEnum.audit,
          };
          newPayload.mac.device_control.enabled = false;
          newPayload.mac.popup.device_control = newPayload.mac.popup.device_control || {
            enabled: false,
            message: 'Elastic Security {action} {rule}',
          };
          newPayload.mac.popup.device_control.enabled = false;
        } else {
          // Enable device control for Windows and Mac
          newPayload.windows.device_control = {
            enabled: true,
            usb_storage: DeviceControlAccessLevelEnum.deny_all,
          };
          newPayload.windows.popup.device_control = newPayload.windows.popup.device_control || {
            enabled: true,
            message: 'Elastic Security {action} {rule}',
          };
          newPayload.windows.popup.device_control.enabled = true;

          newPayload.mac.device_control = {
            enabled: true,
            usb_storage: DeviceControlAccessLevelEnum.deny_all,
          };
          newPayload.mac.popup.device_control = newPayload.mac.popup.device_control || {
            enabled: true,
            message: 'Elastic Security {action} {rule}',
          };
          newPayload.mac.popup.device_control.enabled = true;
        }

        onChange({
          isValid: true,
          updatedPolicy: additionalOnSwitchChange
            ? additionalOnSwitchChange({
                value: event.target.checked,
                policyConfigData: newPayload,
                protectionOsList: osList,
              })
            : newPayload,
        });
      },
      [policy, onChange, additionalOnSwitchChange, osList]
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
