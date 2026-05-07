/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { css } from '@emotion/react';
import type { EuiCheckboxProps, EuiFieldTextProps } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getEmptyValue } from '../../../../../../common/components/empty_value';
import { useLicense } from '../../../../../../common/hooks/use_license';
import type { PolicyFormComponentCommonProps } from '../types';
import type { DeviceControlOSes } from '../../../types';
import { DeviceControlAccessLevel as DeviceControlAccessLevelEnum } from '../../../../../../../common/endpoint/types';
import { DefaultPolicyDeviceNotificationMessage } from '../../../../../../../common/endpoint/models/policy_config';
import { useGetCustomNotificationUnavailableComponent } from '../hooks/use_get_custom_notification_unavailable_component';
import { NOTIFY_USER_CHECKBOX_LABEL } from './shared_translations';

export type DeviceControlNotifyUserOptionProps = PolicyFormComponentCommonProps & {
  /** Per-OS row instance so checkbox `id`/`htmlFor` pairs stay unique when two rows render this control. */
  os: DeviceControlOSes;
};

export const DeviceControlNotifyUserOption = React.memo(
  ({
    policy,
    onChange,
    mode,
    os,
    'data-test-subj': dataTestSubj,
  }: DeviceControlNotifyUserOptionProps) => {
    const isEnterprise = useLicense().isEnterprise();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const CustomNotificationUpsellingComponent = useGetCustomNotificationUnavailableComponent();
    const { euiTheme } = useEuiTheme();

    const isEditMode = mode === 'edit';

    const isDeviceControlEnabled = Boolean(policy[os].device_control?.enabled);

    const currentAccessLevel = policy[os].device_control?.usb_storage;

    const userNotificationSelected = policy[os].popup.device_control?.enabled || false;
    const userNotificationMessage = policy[os].popup.device_control?.message || '';

    const handleUserNotificationCheckbox = useCallback<EuiCheckboxProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);
        const popup = newPayload[os].popup;

        popup.device_control = popup.device_control || {
          enabled: event.target.checked,
          message: DefaultPolicyDeviceNotificationMessage,
        };
        popup.device_control.enabled = event.target.checked;

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [os, policy, onChange]
    );

    const handleCustomUserNotification = useCallback<NonNullable<EuiFieldTextProps['onChange']>>(
      (event) => {
        const newPayload = cloneDeep(policy);
        const popup = newPayload[os].popup;

        popup.device_control = popup.device_control || {
          enabled: false,
          message: event.target.value,
        };
        popup.device_control.message = event.target.value;

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [os, policy, onChange]
    );

    const tooltipContent = useMemo(
      () => (
        <>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.deviceControl.notifyUserTooltip.a"
            defaultMessage="Selecting the user notification option will display a notification to the host user when device access is blocked or restricted."
          />
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.deviceControl.notifyUserTooltip.c"
            defaultMessage="The user notification can be customized in the text field beside this option. Bracketed tags can be used to dynamically populate the applicable action and device type."
          />
        </>
      ),
      []
    );

    const containerCss = css`
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      border: 1px solid ${euiTheme.colors.borderBaseSubdued};
      border-radius: ${euiTheme.border.radius.medium};
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      width: 100%;
    `;

    const checkboxLabelCss = css`
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      white-space: nowrap;
    `;

    const showCustomNotificationUpsell =
      Boolean(CustomNotificationUpsellingComponent) && userNotificationSelected;

    const messageFieldDisabled =
      !userNotificationSelected || !isDeviceControlEnabled || !isEditMode;

    if (!isEnterprise) {
      return null;
    }

    if (currentAccessLevel !== DeviceControlAccessLevelEnum.deny_all) {
      return null;
    }

    const checkboxId = `DeviceControlNotifyUserOptionCheckbox-${os}`;

    const rootCss = css`
      /* OsProtectionRow right column uses align-items: flex-start; stretch so the box + field span the row. */
      align-self: stretch;
      width: 100%;
      min-width: 0;
    `;

    return (
      <div data-test-subj={getTestId()} css={rootCss}>
        <div css={containerCss}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id={checkboxId}
                data-test-subj={getTestId('checkbox')}
                label={
                  <span css={checkboxLabelCss}>
                    <span>{NOTIFY_USER_CHECKBOX_LABEL}</span>
                    <EuiIconTip
                      type="question"
                      position="right"
                      data-test-subj={getTestId('tooltipInfo')}
                      anchorProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
                      content={tooltipContent}
                    />
                  </span>
                }
                checked={userNotificationSelected}
                disabled={!isEnterprise || !isDeviceControlEnabled || !isEditMode}
                onChange={handleUserNotificationCheckbox}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {!isEditMode ? (
                <EuiText size="s" data-test-subj={getTestId('customMessage')}>
                  {userNotificationMessage || getEmptyValue()}
                </EuiText>
              ) : (
                <>
                  {showCustomNotificationUpsell && CustomNotificationUpsellingComponent ? (
                    <>
                      <CustomNotificationUpsellingComponent />
                      <EuiSpacer size="s" />
                    </>
                  ) : null}
                  <EuiFieldText
                    placeholder={i18n.translate(
                      'xpack.securitySolution.endpoint.policyDetails.userNotification.placeholder',
                      { defaultMessage: 'Customize message' }
                    )}
                    value={userNotificationMessage}
                    onChange={handleCustomUserNotification}
                    disabled={messageFieldDisabled}
                    fullWidth
                    compressed
                    data-test-subj={getTestId('customMessage')}
                  />
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
);
DeviceControlNotifyUserOption.displayName = 'DeviceControlNotifyUserOption';
