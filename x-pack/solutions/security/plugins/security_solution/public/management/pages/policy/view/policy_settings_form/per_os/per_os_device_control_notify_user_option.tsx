/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useId } from 'react';
import type { EuiCheckboxProps, EuiTextAreaProps } from '@elastic/eui';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel } from '../../../../../../../common/endpoint/types';
import { DefaultPolicyDeviceNotificationMessage } from '../../../../../../../common/endpoint/models/policy_config';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { DeviceControlOSes } from '../../../types';
import { useGetCustomNotificationUnavailableComponent } from '../hooks/use_get_custom_notification_unavailable_component';
import { NOTIFY_USER_CHECKBOX_LABEL } from '../components/shared_translations';
import type { PerOsPolicyAccessor } from './policy_accessor';
import { osRowPanelCss } from './os_control_layout';

export interface PerOsDeviceControlNotifyUserOptionProps {
  accessor: PerOsPolicyAccessor<DeviceControlOSes>;
  onChange: (options: { isValid: boolean; updatedPolicy: PolicyConfig }) => void;
  mode?: 'edit' | 'view';
  'data-test-subj'?: string;
}

export const PerOsDeviceControlNotifyUserOption = memo<PerOsDeviceControlNotifyUserOptionProps>(
  ({ accessor, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const isEnterprise = useLicense().isEnterprise();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const checkboxId = useId();
    const CustomNotificationUpsellingComponent = useGetCustomNotificationUnavailableComponent();
    const isEditMode = mode === 'edit';
    const osPolicy = accessor.read();
    const deviceControl = osPolicy.device_control;
    const currentAccessLevel = deviceControl?.usb_storage ?? DeviceControlAccessLevel.audit;
    const userNotificationSelected = osPolicy.popup.device_control?.enabled ?? false;
    const userNotificationMessage = osPolicy.popup.device_control?.message ?? '';

    const handleUserNotificationCheckbox = useCallback<EuiCheckboxProps['onChange']>(
      (event) => {
        const updatedPolicy = accessor.update((currentOsPolicy) => {
          currentOsPolicy.popup.device_control ??= {
            enabled: event.target.checked,
            message: DefaultPolicyDeviceNotificationMessage,
          };
          currentOsPolicy.popup.device_control.enabled = event.target.checked;
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [accessor, onChange]
    );

    const handleCustomUserNotification = useCallback<NonNullable<EuiTextAreaProps['onChange']>>(
      (event) => {
        const updatedPolicy = accessor.update((currentOsPolicy) => {
          currentOsPolicy.popup.device_control ??= {
            enabled: false,
            message: event.target.value,
          };
          currentOsPolicy.popup.device_control.message = event.target.value;
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [accessor, onChange]
    );

    // Custom notification is a paid control: show its upsell only after opt-in.
    // When unchecked, keep the disabled textarea unless an upsell is active (then nothing).
    const customNotificationComponent = !CustomNotificationUpsellingComponent ? (
      <EuiTextArea
        placeholder={i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.customizeMessagePlaceholder',
          { defaultMessage: 'Customize message' }
        )}
        aria-label={i18n.translate(
          'xpack.securitySolution.endpoint.policyDetails.customizeMessageAriaLabel',
          { defaultMessage: 'Customize message' }
        )}
        value={userNotificationMessage}
        onChange={handleCustomUserNotification}
        disabled={!userNotificationSelected || !deviceControl?.enabled || !isEditMode}
        fullWidth={true}
        // One line tall by default to keep the OS row compact; the control stays a textarea so
        // multi-line messages can still be authored and are shown in full when the user resizes.
        rows={1}
        data-test-subj={getTestId('customMessage')}
      />
    ) : userNotificationSelected ? (
      <CustomNotificationUpsellingComponent />
    ) : null;

    if (!isEnterprise || currentAccessLevel !== DeviceControlAccessLevel.deny_all) {
      return null;
    }

    return (
      <EuiPanel
        color="subdued"
        paddingSize="s"
        hasShadow={false}
        data-test-subj={getTestId()}
        css={osRowPanelCss}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiCheckbox
                  id={checkboxId}
                  data-test-subj={getTestId('checkbox')}
                  label={NOTIFY_USER_CHECKBOX_LABEL}
                  checked={userNotificationSelected}
                  disabled={!deviceControl?.enabled || !isEditMode}
                  onChange={handleUserNotificationCheckbox}
                />
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
                      {/* No bracketed tags here on purpose: unlike the other protections, the
                          device-control default message carries no placeholders and none are
                          documented, so naming tokens would invite the user to type ones the
                          endpoint never substitutes. */}
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.deviceControl.perOs.notifyUserTooltip.customization"
                        defaultMessage="The user notification can be customized in the text box."
                      />
                    </>
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>{customNotificationComponent}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
PerOsDeviceControlNotifyUserOption.displayName = 'PerOsDeviceControlNotifyUserOption';
