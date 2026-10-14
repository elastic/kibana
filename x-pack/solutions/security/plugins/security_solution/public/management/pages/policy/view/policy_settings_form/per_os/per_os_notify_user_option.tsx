/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
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
import type { PolicyConfig, ProtectionFields } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type {
  BehaviorProtectionOSes,
  MalwareProtectionOSes,
  MemoryProtectionOSes,
  PolicyProtection,
  RansomwareProtectionOSes,
} from '../../../types';
import { useGetCustomNotificationUnavailableComponent } from '../hooks/use_get_custom_notification_unavailable_component';
import { NOTIFY_USER_CHECKBOX_LABEL } from '../components/shared_translations';
import { SupportedVersionForProtectionNotice } from '../components/notify_user_option';
import { osRowPanelCss } from './os_control_layout';
import type { PerOsPolicyAccessor } from './policy_accessor';

interface ProtectionOperatingSystems {
  malware: MalwareProtectionOSes;
  memory_protection: MemoryProtectionOSes;
  behavior_protection: BehaviorProtectionOSes;
  ransomware: RansomwareProtectionOSes;
}

interface NotificationFields {
  enabled: boolean;
  message: string;
}

type NotificationPolicyBranch<Protection extends PolicyProtection> = {
  [Key in Protection]: ProtectionFields;
} & {
  popup: { [Key in Protection]: NotificationFields };
};
type ReadonlyNotificationPolicyBranch<Protection extends PolicyProtection> = {
  readonly [Key in Protection]: Readonly<ProtectionFields>;
} & {
  readonly popup: { readonly [Key in Protection]: Readonly<NotificationFields> };
};

/** The notification branches this component writes; optional, since an older policy may lack one. */
type MutableNotificationBranches = Partial<Record<PolicyProtection, NotificationFields>>;

/** Rule-based protections describe their notification's dynamic content as a detection { rule }; the rest describe it as a { filename }. */
const isRuleBasedNotificationProtection = (protectionType: PolicyProtection): boolean =>
  protectionType === 'memory_protection' || protectionType === 'behavior_protection';

type NotifyUserOSes = ProtectionOperatingSystems[PolicyProtection];

export type PerOsNotifyUserOptionProps = {
  onChange: (options: { isValid: boolean; updatedPolicy: PolicyConfig }) => void;
  mode?: 'edit' | 'view';
  'data-test-subj'?: string;
} & {
  [Protection in PolicyProtection]: {
    protection: Protection;
    accessor: PerOsPolicyAccessor<ProtectionOperatingSystems[Protection]>;
  };
}[PolicyProtection];

export const PerOsNotifyUserOption = memo<PerOsNotifyUserOptionProps>(
  ({ accessor, onChange, mode = 'edit', protection, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const CustomNotificationUpsellingComponent = useGetCustomNotificationUnavailableComponent();
    const isEditMode = mode === 'edit';
    const osPolicy = accessor.read() as ReadonlyNotificationPolicyBranch<PolicyProtection>;
    const selected = osPolicy[protection]?.mode;
    // The popup branch can be missing on a policy stored before it existed; an absent notification
    // is an unchecked box with an empty message rather than a crash.
    const userNotificationSelected = osPolicy.popup[protection]?.enabled ?? false;
    const userNotificationMessage = osPolicy.popup[protection]?.message ?? '';

    const handleUserNotificationCheckbox = useCallback<EuiCheckboxProps['onChange']>(
      (event) => {
        const updatedPolicy = accessor.update((currentOsPolicy) => {
          const notificationPolicy = currentOsPolicy as PolicyConfig[NotifyUserOSes] &
            NotificationPolicyBranch<PolicyProtection>;
          // Narrowing to an optional branch keeps the union-indexed write legal and lets a policy
          // that predates the notification branch gain it here.
          const popupBranches = notificationPolicy.popup as MutableNotificationBranches;
          const popupBranch = popupBranches[protection] ?? { enabled: false, message: '' };
          popupBranch.enabled = event.target.checked;
          popupBranches[protection] = popupBranch;
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [accessor, onChange, protection]
    );

    const handleCustomUserNotification = useCallback<NonNullable<EuiTextAreaProps['onChange']>>(
      (event) => {
        const updatedPolicy = accessor.update((currentOsPolicy) => {
          const notificationPolicy = currentOsPolicy as PolicyConfig[NotifyUserOSes] &
            NotificationPolicyBranch<PolicyProtection>;
          const popupBranches = notificationPolicy.popup as MutableNotificationBranches;
          const popupBranch = popupBranches[protection] ?? { enabled: false, message: '' };
          popupBranch.message = event.target.value;
          popupBranches[protection] = popupBranch;
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [accessor, onChange, protection]
    );

    const tooltipProtectionText = useCallback((protectionType: PolicyProtection) => {
      if (protectionType === 'memory_protection') {
        return i18n.translate(
          'xpack.securitySolution.endpoint.policyDetail.memoryProtectionTooltip',
          { defaultMessage: 'memory threat' }
        );
      }

      if (protectionType === 'behavior_protection') {
        return i18n.translate(
          'xpack.securitySolution.endpoint.policyDetail.behaviorProtectionTooltip',
          { defaultMessage: 'malicious behavior' }
        );
      }

      return protectionType;
    }, []);

    const tooltipBracketText = useCallback((protectionType: PolicyProtection) => {
      if (isRuleBasedNotificationProtection(protectionType)) {
        return i18n.translate('xpack.securitySolution.endpoint.policyDetail.rule', {
          defaultMessage: 'rule',
        });
      }

      return i18n.translate('xpack.securitySolution.endpoint.policyDetail.filename', {
        defaultMessage: 'filename',
      });
    }, []);

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
        disabled={!isEditMode || !userNotificationSelected || selected === ProtectionModes.off}
        fullWidth={true}
        // One line tall by default to keep the OS row compact; the control stays a textarea so
        // multi-line messages can still be authored and are shown in full when the user resizes.
        rows={1}
        data-test-subj={getTestId('customMessage')}
      />
    ) : userNotificationSelected ? (
      <CustomNotificationUpsellingComponent />
    ) : null;

    if (!isPlatinumPlus) {
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
                  data-test-subj={getTestId('checkbox')}
                  id={`${dataTestSubj ?? protection}UserNotificationCheckbox`}
                  onChange={handleUserNotificationCheckbox}
                  checked={userNotificationSelected}
                  disabled={!isEditMode || selected === ProtectionModes.off}
                  label={NOTIFY_USER_CHECKBOX_LABEL}
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
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.notifyUserTooltip.a"
                        defaultMessage="Selecting the user notification option will display a notification to the host user when { protectionName } is prevented or detected."
                        values={{ protectionName: tooltipProtectionText(protection) }}
                      />
                      <EuiSpacer size="m" />
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.perOs.notifyUserTooltip.customization"
                        defaultMessage="The user notification can be customized in the text box. Bracketed tags are replaced at runtime: {actionToken} becomes the applicable action, such as prevented or detected, and {contentToken} becomes the {contentName}."
                        values={{
                          actionToken: '{action}',
                          contentToken: isRuleBasedNotificationProtection(protection)
                            ? '{rule}'
                            : '{filename}',
                          contentName: tooltipBracketText(protection),
                        }}
                      />
                      <EuiSpacer size="s" />
                      <SupportedVersionForProtectionNotice
                        protection={protection}
                        data-test-subj={getTestId('supportedVersion')}
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
PerOsNotifyUserOption.displayName = 'PerOsNotifyUserOption';
