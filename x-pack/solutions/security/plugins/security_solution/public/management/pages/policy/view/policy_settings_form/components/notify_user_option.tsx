/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION } from '../protection_notice_supported_endpoint_version';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getEmptyValue } from '../../../../../../common/components/empty_value';
import { useLicense } from '../../../../../../common/hooks/use_license';
import type { PolicyFormComponentCommonProps } from '../types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyProtection, MacPolicyProtection, LinuxPolicyProtection } from '../../../types';
import { useGetCustomNotificationUnavailableComponent } from '../hooks/use_get_custom_notification_unavailable_component';
import { NOTIFY_USER_CHECKBOX_LABEL } from './shared_translations';

export interface NotifyUserOptionProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  /** When provided, reads and writes only this OS's popup config. */
  os: 'windows' | 'mac' | 'linux';
  /** When false, the protection section master switch is off — keep controls visible but disabled. */
  sectionFeatureEnabled?: boolean;
}

export const NotifyUserOption = React.memo(
  ({
    policy,
    onChange,
    mode,
    protection,
    os,
    sectionFeatureEnabled = true,
    'data-test-subj': dataTestSubj,
  }: NotifyUserOptionProps) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const CustomNotificationUpsellingComponent = useGetCustomNotificationUnavailableComponent();
    const { euiTheme } = useEuiTheme();

    const isEditMode = mode === 'edit';

    const protectionMode = useMemo(() => {
      if (os === 'mac') return policy.mac[protection as MacPolicyProtection].mode;
      if (os === 'linux') return policy.linux[protection as LinuxPolicyProtection].mode;
      return policy.windows[protection].mode;
    }, [os, policy, protection]);

    const userNotificationSelected = useMemo(() => {
      if (os === 'mac')
        return (
          (policy.mac.popup as Record<string, { enabled: boolean }>)[protection]?.enabled ?? false
        );
      if (os === 'linux')
        return (
          (policy.linux.popup as Record<string, { enabled: boolean }>)[protection]?.enabled ?? false
        );
      return policy.windows.popup[protection].enabled;
    }, [os, policy, protection]);

    const userNotificationMessage = useMemo(() => {
      if (os === 'mac')
        return (policy.mac.popup as Record<string, { message: string }>)[protection]?.message ?? '';
      if (os === 'linux')
        return (
          (policy.linux.popup as Record<string, { message: string }>)[protection]?.message ?? ''
        );
      return policy.windows.popup[protection].message;
    }, [os, policy, protection]);

    const handleUserNotificationCheckbox = useCallback<EuiCheckboxProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);

        if (os === 'windows') {
          newPayload.windows.popup[protection].enabled = event.target.checked;
        } else if (os === 'mac') {
          (newPayload.mac.popup as Record<string, { enabled: boolean }>)[protection].enabled =
            event.target.checked;
        } else if (os === 'linux') {
          (newPayload.linux.popup as Record<string, { enabled: boolean }>)[protection].enabled =
            event.target.checked;
        }

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [policy, onChange, os, protection]
    );

    const handleCustomUserNotification = useCallback<NonNullable<EuiFieldTextProps['onChange']>>(
      (event) => {
        const newPayload = cloneDeep(policy);

        if (os === 'windows') {
          newPayload.windows.popup[protection].message = event.target.value;
        } else if (os === 'mac') {
          (newPayload.mac.popup as Record<string, { message: string }>)[protection].message =
            event.target.value;
        } else if (os === 'linux') {
          (newPayload.linux.popup as Record<string, { message: string }>)[protection].message =
            event.target.value;
        }

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [policy, onChange, os, protection]
    );

    const version =
      PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION[
        protection as keyof typeof PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION
      ];

    const tooltipContent = useMemo(() => {
      const protectionText =
        protection === 'memory_protection'
          ? i18n.translate('xpack.securitySolution.endpoint.policyDetail.memoryProtectionTooltip', {
              defaultMessage: 'memory threat',
            })
          : protection === 'behavior_protection'
          ? i18n.translate(
              'xpack.securitySolution.endpoint.policyDetail.behaviorProtectionTooltip',
              { defaultMessage: 'malicious behavior' }
            )
          : protection;

      const bracketText =
        protection === 'memory_protection' || protection === 'behavior_protection'
          ? i18n.translate('xpack.securitySolution.endpoint.policyDetail.rule', {
              defaultMessage: 'rule',
            })
          : i18n.translate('xpack.securitySolution.endpoint.policyDetail.filename', {
              defaultMessage: 'filename',
            });

      return (
        <>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.notifyUserTooltip.a"
            defaultMessage="Selecting the user notification option will display a notification to the host user when { protectionName } is prevented or detected."
            values={{ protectionName: protectionText }}
          />
          <br />
          <br />
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.notifyUserTooltip.c"
            defaultMessage="The user notification can be customized in the text field beside this option. Bracketed tags can be used to dynamically populate the applicable action (such as prevented or detected) and the { bracketText }."
            values={{ bracketText }}
          />
        </>
      );
    }, [protection]);

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

    const versionLabel = version
      ? i18n.translate('xpack.securitySolution.endpoint.policyDetails.notifyUser.agentVersion', {
          defaultMessage: '(agent version {version})',
          values: { version },
        })
      : null;

    const showCustomNotificationUpsell =
      Boolean(CustomNotificationUpsellingComponent) &&
      (!isPlatinumPlus || userNotificationSelected);

    return (
      <div css={containerCss} data-test-subj={getTestId()}>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              data-test-subj={getTestId('checkbox')}
              id={`${protection}-${os}-userNotificationCheckbox`}
              onChange={handleUserNotificationCheckbox}
              checked={userNotificationSelected}
              disabled={
                !sectionFeatureEnabled ||
                !isEditMode ||
                protectionMode === ProtectionModes.off ||
                !isPlatinumPlus
              }
              label={
                <span css={checkboxLabelCss}>
                  <span>{NOTIFY_USER_CHECKBOX_LABEL}</span>
                  {versionLabel && (
                    <EuiText size="xs" color="subdued" component="span">
                      {versionLabel}
                    </EuiText>
                  )}
                  <EuiIconTip
                    type="question"
                    position="right"
                    data-test-subj={getTestId('tooltipInfo')}
                    anchorProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
                    content={tooltipContent}
                  />
                </span>
              }
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
                  disabled={
                    !sectionFeatureEnabled ||
                    !userNotificationSelected ||
                    !isPlatinumPlus ||
                    protectionMode === ProtectionModes.off
                  }
                  fullWidth
                  compressed
                  data-test-subj={getTestId('customMessage')}
                />
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
NotifyUserOption.displayName = 'NotifyUserOption';

export const SupportedVersionForProtectionNotice = React.memo(
  ({
    protection,
    'data-test-subj': dataTestSubj,
  }: {
    protection: string;
    'data-test-subj'?: string;
  }) => {
    const version = useMemo(() => {
      return PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION[
        protection as keyof typeof PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION
      ];
    }, [protection]);

    if (!version) {
      return null;
    }

    return (
      <EuiText color="subdued" size="xs" data-test-subj={dataTestSubj}>
        <i>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetails.supportedVersion"
            defaultMessage="Agent version {version}"
            values={{ version }}
          />
        </i>
      </EuiText>
    );
  }
);
SupportedVersionForProtectionNotice.displayName = 'SupportedVersionForProtectionNotice';
