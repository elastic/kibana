/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import {
  DeviceControlAccessLevel as DeviceControlAccessLevelEnum,
  type DeviceControlAccessLevel,
  type ImmutableArray,
} from '../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../types';

export interface DeviceControlSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  selected: boolean;
  protectionLabel?: string;
  osList: ImmutableArray<DeviceControlOSes>;
  /** Called when the user toggles the section master switch (before policy onChange). */
  onSectionActiveChange?: (active: boolean) => void;
}

interface DeviceControlOsSnapshot {
  enabled: boolean;
  usb_storage: DeviceControlAccessLevel;
  popupDeviceControl: {
    enabled: boolean;
    message: string;
  };
}

function applyDeviceControlToggleOff(
  os: DeviceControlOSes,
  policy: PolicyFormComponentCommonProps['policy'],
  newPayload: PolicyFormComponentCommonProps['policy'],
  saved: Partial<Record<DeviceControlOSes, DeviceControlOsSnapshot>>
): void {
  const dc = policy[os].device_control;
  const popup = policy[os].popup.device_control;
  const snapshot: DeviceControlOsSnapshot = {
    enabled: Boolean(dc?.enabled),
    usb_storage: dc?.usb_storage ?? DeviceControlAccessLevelEnum.audit,
    popupDeviceControl: {
      enabled: Boolean(popup?.enabled),
      message: popup?.message ?? '',
    },
  };
  saved[os] = snapshot;
  // Keep usb_storage in policy while the section is off so the UI still shows the prior access level
  // (grayed); only the active flag and popup are cleared.
  newPayload[os].device_control = {
    enabled: false,
    usb_storage: snapshot.usb_storage,
  };
  newPayload[os].popup.device_control = {
    enabled: false,
    message: newPayload[os].popup.device_control?.message ?? '',
  };
}

function applyDeviceControlToggleOn(
  os: DeviceControlOSes,
  newPayload: PolicyFormComponentCommonProps['policy'],
  saved: Partial<Record<DeviceControlOSes, DeviceControlOsSnapshot>>
): void {
  const existingDc = newPayload[os].device_control;
  const existingPopup = newPayload[os].popup.device_control;
  const restored =
    saved[os] ??
    ({
      enabled: Boolean(existingDc?.enabled),
      usb_storage: existingDc?.usb_storage ?? DeviceControlAccessLevelEnum.audit,
      popupDeviceControl: {
        enabled: Boolean(existingPopup?.enabled),
        message: existingPopup?.message ?? '',
      },
    } satisfies DeviceControlOsSnapshot);

  newPayload[os].device_control = {
    enabled: restored.enabled,
    usb_storage: restored.usb_storage,
  };
  newPayload[os].popup = newPayload[os].popup || {};
  newPayload[os].popup.device_control = {
    enabled: restored.popupDeviceControl.enabled,
    message: restored.popupDeviceControl.message,
  };
}

export const DeviceControlSettingCardSwitch = React.memo(
  ({
    protectionLabel,
    osList,
    onChange,
    onSectionActiveChange,
    policy,
    mode,
    selected,
    'data-test-subj': dataTestSubj,
  }: DeviceControlSettingCardSwitchProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEditMode = mode === 'edit';
    const savedOsRef = useRef<Partial<Record<DeviceControlOSes, DeviceControlOsSnapshot>>>({});

    const switchAriaLabel = useMemo(
      () =>
        protectionLabel?.trim() ||
        i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.toggleDeviceControlAriaLabel',
          {
            defaultMessage: 'Toggle device control for this policy section',
          }
        ),
      [protectionLabel]
    );

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        onSectionActiveChange?.(event.target.checked);
        const newPayload = cloneDeep(policy);

        if (event.target.checked === false) {
          for (const os of osList) {
            applyDeviceControlToggleOff(os, policy, newPayload, savedOsRef.current);
          }
        } else {
          for (const os of osList) {
            applyDeviceControlToggleOn(os, newPayload, savedOsRef.current);
          }
          for (const os of osList) {
            const dc = newPayload[os].device_control;
            const popup = newPayload[os].popup.device_control;
            if (dc && popup) {
              savedOsRef.current[os] = {
                enabled: dc.enabled,
                usb_storage: dc.usb_storage,
                popupDeviceControl: {
                  enabled: popup.enabled,
                  message: popup.message ?? '',
                },
              };
            }
          }
        }

        onChange({
          isValid: true,
          updatedPolicy: newPayload,
        });
      },
      [policy, onChange, onSectionActiveChange, osList]
    );

    return (
      <EuiSwitch
        showLabel={false}
        label={switchAriaLabel}
        checked={selected}
        disabled={!isEditMode}
        onChange={handleSwitchChange}
        data-test-subj={getTestId()}
      />
    );
  }
);

DeviceControlSettingCardSwitch.displayName = 'DeviceControlSettingCardSwitch';
