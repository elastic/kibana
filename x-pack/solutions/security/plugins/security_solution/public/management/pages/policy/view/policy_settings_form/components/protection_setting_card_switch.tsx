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
import { useLicense } from '../../../../../../common/hooks/use_license';
import type {
  ImmutableArray,
  PolicyConfig,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { LinuxPolicyProtection, MacPolicyProtection, PolicyProtection } from '../../../types';

export interface ProtectionSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  selected: boolean;
  protectionLabel?: string;
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  additionalOnSwitchChange?: ({
    value,
    policyConfigData,
    protectionOsList,
  }: {
    value: boolean;
    policyConfigData: PolicyConfig;
    protectionOsList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  }) => PolicyConfig;
  /**
   * Fired when the section master switch turns off, after per-OS modes are saved and the draft
   * policy is updated to `off`. Passes saved modes and the policy before toggle (e.g. for UI that
   * still shows reputation / notify state while disabled).
   */
  onMasterSwitchTurnedOff?: (
    savedModes: Partial<Record<keyof UIPolicyConfig, ProtectionModes>>,
    policyBeforeToggle: PolicyConfig
  ) => void;
  /** Called when the user toggles the section master switch (before policy onChange). */
  onSectionActiveChange?: (active: boolean) => void;
}

function applyToggleOffForOs(
  os: Partial<keyof UIPolicyConfig>,
  protection: PolicyProtection,
  isPlatinumPlus: boolean,
  policy: PolicyConfig,
  newPayload: PolicyConfig,
  savedModes: Partial<Record<keyof UIPolicyConfig, ProtectionModes>>
): void {
  if (os === 'windows') {
    savedModes.windows = policy.windows[protection].mode;
    newPayload.windows[protection].mode = ProtectionModes.off;
    if (isPlatinumPlus) {
      newPayload.windows.popup[protection].enabled = false;
    }
  } else if (os === 'mac') {
    savedModes.mac = policy.mac[protection as MacPolicyProtection].mode;
    newPayload.mac[protection as MacPolicyProtection].mode = ProtectionModes.off;
    if (isPlatinumPlus) {
      (newPayload.mac.popup as Record<string, { enabled: boolean }>)[protection].enabled = false;
    }
  } else if (os === 'linux') {
    savedModes.linux = policy.linux[protection as LinuxPolicyProtection].mode;
    newPayload.linux[protection as LinuxPolicyProtection].mode = ProtectionModes.off;
    if (isPlatinumPlus) {
      (newPayload.linux.popup as Record<string, { enabled: boolean }>)[protection].enabled = false;
    }
  }
}

function applyToggleOnForOs(
  os: Partial<keyof UIPolicyConfig>,
  protection: PolicyProtection,
  isPlatinumPlus: boolean,
  newPayload: PolicyConfig,
  savedModes: Partial<Record<keyof UIPolicyConfig, ProtectionModes>>
): void {
  if (os === 'windows') {
    const restored = savedModes.windows ?? ProtectionModes.off;
    newPayload.windows[protection].mode = restored;
    if (isPlatinumPlus) {
      newPayload.windows.popup[protection].enabled = restored === ProtectionModes.prevent;
    }
  } else if (os === 'mac') {
    const restored = savedModes.mac ?? ProtectionModes.off;
    newPayload.mac[protection as MacPolicyProtection].mode = restored;
    if (isPlatinumPlus) {
      (newPayload.mac.popup as Record<string, { enabled: boolean }>)[protection].enabled =
        restored === ProtectionModes.prevent;
    }
  } else if (os === 'linux') {
    const restored = savedModes.linux ?? ProtectionModes.off;
    newPayload.linux[protection as LinuxPolicyProtection].mode = restored;
    if (isPlatinumPlus) {
      (newPayload.linux.popup as Record<string, { enabled: boolean }>)[protection].enabled =
        restored === ProtectionModes.prevent;
    }
  }
}

export const ProtectionSettingCardSwitch = React.memo(
  ({
    protection,
    protectionLabel,
    osList,
    additionalOnSwitchChange,
    onMasterSwitchTurnedOff,
    onSectionActiveChange,
    onChange,
    policy,
    mode,
    selected,
    'data-test-subj': dataTestSubj,
  }: ProtectionSettingCardSwitchProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEditMode = mode === 'edit';

    const switchAriaLabel = useMemo(
      () =>
        protectionLabel?.trim() ||
        i18n.translate('xpack.securitySolution.endpoint.policy.details.toggleProtectionAriaLabel', {
          defaultMessage: 'Toggle protection for this policy section',
        }),
      [protectionLabel]
    );

    // Snapshot per-OS modes before toggling off so they can be restored on toggle-on.
    const savedModesRef = useRef<Partial<Record<keyof UIPolicyConfig, ProtectionModes>>>({});

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        onSectionActiveChange?.(event.target.checked);
        const newPayload = cloneDeep(policy);

        if (event.target.checked === false) {
          const policyBeforeToggle = cloneDeep(policy);
          for (const os of osList) {
            applyToggleOffForOs(
              os,
              protection,
              isPlatinumPlus,
              policy,
              newPayload,
              savedModesRef.current
            );
          }
          onMasterSwitchTurnedOff?.(cloneDeep(savedModesRef.current), policyBeforeToggle);
        } else {
          for (const os of osList) {
            applyToggleOnForOs(os, protection, isPlatinumPlus, newPayload, savedModesRef.current);
          }
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
      [
        policy,
        onChange,
        additionalOnSwitchChange,
        onMasterSwitchTurnedOff,
        onSectionActiveChange,
        osList,
        isPlatinumPlus,
        protection,
      ]
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

ProtectionSettingCardSwitch.displayName = 'ProtectionSettingCardSwitch';
