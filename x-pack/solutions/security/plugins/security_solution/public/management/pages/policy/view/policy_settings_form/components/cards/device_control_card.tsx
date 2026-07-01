/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiSelect, EuiText } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { useDeviceControlSectionSelected } from '../../hooks/use_device_control_section_selected';
import { policySectionDeviceControlDropdownWrapperCss } from '../policy_section_layout';
import { OS_TITLES } from '../../../../../../common/translations';
import type { PolicyFormComponentCommonProps } from '../../types';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import { SettingCard } from '../setting_card';
import { OsProtectionRow } from '../os_protection_row';
import { DeviceControlSettingCardSwitch } from '../device_control_setting_card_switch';
import { DeviceControlNotifyUserOption } from '../device_control_notify_user_option';
import {
  DeviceControlAccessLevel as DeviceControlAccessLevelEnum,
  PolicyOperatingSystem,
  type Immutable,
  type DeviceControlAccessLevel,
} from '../../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../../types';
import { DefaultPolicyDeviceNotificationMessage } from '../../../../../../../../common/endpoint/models/policy_config';
import { DEVICE_CONTROL_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';

export type DeviceControlProps = PolicyFormComponentCommonProps;

export const DEVICE_CONTROL_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl',
  { defaultMessage: 'Device control' }
);

const DEVICE_CONTROL_OS_VALUES: Immutable<DeviceControlOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
];

const DEVICE_CONTROL_OS_LIST: ReadonlyArray<{
  os: DeviceControlOSes;
  operatingSystem: OperatingSystem;
}> = [
  { os: PolicyOperatingSystem.windows, operatingSystem: OperatingSystem.WINDOWS },
  { os: PolicyOperatingSystem.mac, operatingSystem: OperatingSystem.MAC },
];

const ACCESS_LEVEL_OPTIONS = [
  {
    value: DeviceControlAccessLevelEnum.audit,
    text: i18n.translate(
      'xpack.securitySolution.endpoint.policy.details.deviceControl.allowReadWrite',
      { defaultMessage: 'Allow read, write and execute' }
    ),
  },
  {
    value: DeviceControlAccessLevelEnum.no_execute,
    text: i18n.translate(
      'xpack.securitySolution.endpoint.policy.details.deviceControl.executeOnly',
      { defaultMessage: 'Read and write' }
    ),
  },
  {
    value: DeviceControlAccessLevelEnum.read_only,
    text: i18n.translate('xpack.securitySolution.endpoint.policy.details.deviceControl.readOnly', {
      defaultMessage: 'Read only',
    }),
  },
  {
    value: DeviceControlAccessLevelEnum.deny_all,
    text: i18n.translate('xpack.securitySolution.endpoint.policy.details.deviceControl.blockAll', {
      defaultMessage: 'Block all',
    }),
  },
];

export const DeviceControlCard = React.memo<DeviceControlProps>(
  ({ policy, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEnterprise = useLicense().isEnterprise();

    const deviceControlExists =
      policy.windows.device_control !== undefined && policy.mac.device_control !== undefined;

    const { sectionSelected: selected, onSectionActiveChange } = useDeviceControlSectionSelected(
      policy,
      DEVICE_CONTROL_OS_VALUES
    );

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.deviceControl',
      { defaultMessage: 'Device control' }
    );

    if (!isEnterprise) {
      return (
        <SettingLockedCard
          title={DEVICE_CONTROL_CARD_TITLE}
          licenseType="enterprise"
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={DEVICE_CONTROL_CARD_TITLE}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC]}
        sectionDescription={DEVICE_CONTROL_POLICY_SECTION_DESCRIPTION}
        dataTestSubj={getTestId()}
        selected={deviceControlExists ? selected : false}
        mode={mode}
        rightCorner={
          <DeviceControlSettingCardSwitch
            selected={deviceControlExists ? selected : false}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protectionLabel={protectionLabel}
            osList={DEVICE_CONTROL_OS_VALUES}
            onSectionActiveChange={onSectionActiveChange}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        {DEVICE_CONTROL_OS_LIST.map(({ os, operatingSystem }, index) => {
          const currentLevel =
            policy[os].device_control?.usb_storage ?? DeviceControlAccessLevelEnum.audit;
          const isOsEnabled = Boolean(policy[os].device_control?.enabled);
          const isBlock = currentLevel === DeviceControlAccessLevelEnum.deny_all;

          return (
            <OsProtectionRow
              key={os}
              os={operatingSystem}
              isLast={index === DEVICE_CONTROL_OS_LIST.length - 1}
              data-test-subj={getTestId(`${os}Row`)}
            >
              <OsAccessLevelSelect
                os={os}
                policy={policy}
                onChange={onChange}
                mode={mode}
                currentLevel={currentLevel}
                isOsDeviceControlEnabled={isOsEnabled}
                sectionFeatureEnabled={selected}
                data-test-subj={getTestId(`${os}AccessLevel`)}
              />
              {isOsEnabled && isBlock && (
                <OsDeviceControlNotifyUser
                  os={os}
                  policy={policy}
                  onChange={onChange}
                  mode={mode}
                  data-test-subj={getTestId(`${os}NotifyUser`)}
                />
              )}
            </OsProtectionRow>
          );
        })}
      </SettingCard>
    );
  }
);
DeviceControlCard.displayName = 'DeviceControlCard';

// --- Per-OS access level select ---

type OsAccessLevelSelectProps = PolicyFormComponentCommonProps & {
  os: DeviceControlOSes;
  currentLevel: DeviceControlAccessLevel;
  /** Per-OS `device_control.enabled` in policy (USB control active for this OS). */
  isOsDeviceControlEnabled: boolean;
  /** Device control section master switch — when on, access level is editable even if this OS is still disabled in policy until the user picks a level. */
  sectionFeatureEnabled: boolean;
};

const OsAccessLevelSelect = memo<OsAccessLevelSelectProps>(
  ({
    os,
    policy,
    onChange,
    mode,
    currentLevel,
    isOsDeviceControlEnabled,
    sectionFeatureEnabled,
    'data-test-subj': dataTestSubj,
  }) => {
    const isEditMode = mode === 'edit';
    const isAccessLevelInteractive =
      isEditMode && (sectionFeatureEnabled || isOsDeviceControlEnabled);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newLevel = event.target.value as DeviceControlAccessLevel;
        const newPayload = cloneDeep(policy);

        if (!newPayload[os].device_control) {
          newPayload[os].device_control = { enabled: true, usb_storage: newLevel };
        } else {
          const dc = newPayload[os].device_control;
          if (dc) {
            dc.enabled = true;
            dc.usb_storage = newLevel;
          }
        }

        // Auto-manage notify user: enable on Block, disable otherwise.
        const popupKey = `popup` as const;
        if (!newPayload[os][popupKey].device_control) {
          newPayload[os][popupKey].device_control = {
            enabled: newLevel === DeviceControlAccessLevelEnum.deny_all,
            message: DefaultPolicyDeviceNotificationMessage,
          };
        } else {
          const popup = newPayload[os][popupKey].device_control;
          if (popup) popup.enabled = newLevel === DeviceControlAccessLevelEnum.deny_all;
        }

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [os, policy, onChange]
    );

    const selectedOption = ACCESS_LEVEL_OPTIONS.find((o) => o.value === currentLevel);

    if (!isEditMode) {
      return (
        <EuiText size="s" data-test-subj={dataTestSubj}>
          {selectedOption?.text ?? currentLevel}
        </EuiText>
      );
    }

    const ariaLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.details.deviceControl.osAccessLevelAriaLabel',
      {
        defaultMessage: '{osName} USB access level',
        values: { osName: OS_TITLES[os as OperatingSystem] },
      }
    );

    return (
      <div css={policySectionDeviceControlDropdownWrapperCss}>
        <EuiSelect
          options={ACCESS_LEVEL_OPTIONS}
          value={currentLevel}
          onChange={handleChange}
          disabled={!isAccessLevelInteractive}
          compressed
          fullWidth
          aria-label={ariaLabel}
          data-test-subj={dataTestSubj}
        />
      </div>
    );
  }
);
OsAccessLevelSelect.displayName = 'OsAccessLevelSelect';

// --- Per-OS device control notify user ---

type OsDeviceControlNotifyUserProps = PolicyFormComponentCommonProps & {
  os: DeviceControlOSes;
};

const OsDeviceControlNotifyUser = memo<OsDeviceControlNotifyUserProps>(
  ({ os, policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    return (
      <DeviceControlNotifyUserOption
        policy={policy}
        onChange={onChange}
        mode={mode}
        os={os}
        data-test-subj={dataTestSubj}
      />
    );
  }
);
OsDeviceControlNotifyUser.displayName = 'OsDeviceControlNotifyUser';
