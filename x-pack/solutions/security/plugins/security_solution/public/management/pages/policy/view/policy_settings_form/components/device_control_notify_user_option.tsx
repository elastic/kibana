/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloneDeep } from 'lodash';
import type { EuiCheckboxProps, EuiTextAreaProps } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getEmptyValue } from '../../../../../../common/components/empty_value';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { SettingCardHeader } from './setting_card';
import type { PolicyFormComponentCommonProps } from '../types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import { DefaultPolicyDeviceNotificationMessage } from '../../../../../../../common/endpoint/models/policy_config';
import { useGetCustomNotificationUnavailableComponent } from '../hooks/use_get_custom_notification_unavailable_component';
import {
  NOTIFY_USER_SECTION_TITLE,
  NOTIFY_USER_CHECKBOX_LABEL,
  NOTIFICATION_MESSAGE_LABEL,
  CUSTOMIZE_NOTIFICATION_MESSAGE_LABEL,
} from './shared_translations';

export type DeviceControlNotifyUserOptionProps = PolicyFormComponentCommonProps;

export const DeviceControlNotifyUserOption = React.memo(
  ({
    policy,
    onChange,
    mode,
    'data-test-subj': dataTestSubj,
  }: DeviceControlNotifyUserOptionProps) => {
    const isEnterprise = useLicense().isEnterprise();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const CustomNotificationUpsellingComponent = useGetCustomNotificationUnavailableComponent();

    const isEditMode = mode === 'edit';

    const isDeviceControlEnabled =
      policy.windows.device_control?.enabled || policy.mac.device_control?.enabled || false;

    const currentAccessLevel =
      policy.windows.device_control?.usb_storage || policy.mac.device_control?.usb_storage;

    const userNotificationSelected = policy.windows.popup.device_control?.enabled || false;
    const userNotificationMessage = policy.windows.popup.device_control?.message || '';

    const handleUserNotificationCheckbox = useCallback<EuiCheckboxProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);

        // Update Windows popup device control
        newPayload.windows.popup.device_control = newPayload.windows.popup.device_control || {
          enabled: event.target.checked,
          message: DefaultPolicyDeviceNotificationMessage,
        };
        newPayload.windows.popup.device_control.enabled = event.target.checked;

        // Update Mac popup device control
        newPayload.mac.popup.device_control = newPayload.mac.popup.device_control || {
          enabled: event.target.checked,
          message: DefaultPolicyDeviceNotificationMessage,
        };
        newPayload.mac.popup.device_control.enabled = event.target.checked;

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [policy, onChange]
    );

    const handleCustomUserNotification = useCallback<NonNullable<EuiTextAreaProps['onChange']>>(
      (event) => {
        const newPayload = cloneDeep(policy);
        // Update Windows popup device control message
        newPayload.windows.popup.device_control = newPayload.windows.popup.device_control || {
          enabled: false,
          message: event.target.value,
        };
        newPayload.windows.popup.device_control.message = event.target.value;

        // Update Mac popup device control message
        newPayload.mac.popup.device_control = newPayload.mac.popup.device_control || {
          enabled: false,
          message: event.target.value,
        };
        newPayload.mac.popup.device_control.message = event.target.value;

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [policy, onChange]
    );

    const customNotificationComponent = useMemo(() => {
      if (!userNotificationSelected) {
        return null;
      }

      if (CustomNotificationUpsellingComponent) {
        return <CustomNotificationUpsellingComponent />;
      }

      if (!isEditMode) {
        return (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <h4>{NOTIFICATION_MESSAGE_LABEL}</h4>
            </EuiText>
            <EuiSpacer size="xs" />
            <>{userNotificationMessage || getEmptyValue()}</>
          </>
        );
      }

      return (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj={getTestId('customMessageTitle')}>
                <h4>{CUSTOMIZE_NOTIFICATION_MESSAGE_LABEL}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                position="right"
                data-test-subj={getTestId('tooltipInfo')}
                anchorProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
                content={
                  <>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.policyDetailsConfig.deviceControl.notifyUserTooltip.a"
                      defaultMessage="Selecting the user notification option will display a notification to the host user when device access is blocked or restricted."
                    />
                    <EuiSpacer size="m" />
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.policyDetailsConfig.deviceControl.notifyUserTooltip.c"
                      defaultMessage="The user notification can be customized in the text box below. Bracketed tags can be used to dynamically populate the applicable action and device type."
                    />
                  </>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiTextArea
            value={userNotificationMessage}
            onChange={handleCustomUserNotification}
            fullWidth={true}
            disabled={!isEditMode}
            data-test-subj={getTestId('customMessage')}
          />
        </>
      );
    }, [
      CustomNotificationUpsellingComponent,
      getTestId,
      handleCustomUserNotification,
      isEditMode,
      userNotificationMessage,
      userNotificationSelected,
    ]);

    if (!isEnterprise) {
      return null;
    }

    if (currentAccessLevel !== DeviceControlAccessLevelEnum.deny_all) {
      return null;
    }

    return (
      <div data-test-subj={getTestId()}>
        <EuiSpacer size="m" />
        <SettingCardHeader>
          <EuiTitle size="xxs">
            <h5>{NOTIFY_USER_SECTION_TITLE}</h5>
          </EuiTitle>
        </SettingCardHeader>

        <EuiSpacer size="s" />

        <EuiCheckbox
          id={'DeviceControlNotifyUserOptionCheckbox'}
          data-test-subj={getTestId('checkbox')}
          label={NOTIFY_USER_CHECKBOX_LABEL}
          checked={userNotificationSelected}
          disabled={!isEnterprise || !isDeviceControlEnabled || !isEditMode}
          onChange={handleUserNotificationCheckbox}
        />

        {customNotificationComponent}
      </div>
    );
  }
);
DeviceControlNotifyUserOption.displayName = 'DeviceControlNotifyUserOption';
