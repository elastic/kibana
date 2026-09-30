/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSpacer, EuiSwitch, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { cloneDeep } from 'lodash';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useIsCustomYaraSignaturesAvailable } from '../../hooks/use_is_custom_yara_signatures_available';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_level';
import type { ProtectionSettingCardSwitchProps } from '../protection_setting_card_switch';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { SettingLockedCard } from '../setting_locked_card';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../common/endpoint/types';
import {
  clearCustomYaraSignaturesIfEnabled,
  setCustomYaraSignatures,
} from '../../../../../../../../common/endpoint/models/policy_config_helpers';
import type { MemoryProtectionOSes } from '../../../../types';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';

export const LOCKED_CARD_MEMORY_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.memory',
  {
    defaultMessage: 'Memory Threat',
  }
);

const CUSTOM_YARA_SIGNATURES_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.protections.customYaraSignaturesLabel',
  {
    defaultMessage: 'Apply custom YARA signatures in detection mode',
  }
);

const CUSTOM_YARA_SIGNATURES_HINT = i18n.translate(
  'xpack.securitySolution.endpoint.policyDetailsConfig.customYaraSignaturesTooltip',
  {
    defaultMessage:
      'Endpoints enabled with this policy will apply custom YARA signatures from the custom YARA signatures page.',
  }
);

export const CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.protections.customYaraSignaturesLicenseTooltip',
  {
    defaultMessage: 'Custom YARA signatures require an Enterprise license.',
  }
);

type AdjustSubfeatureOnProtectionSwitch = NonNullable<
  ProtectionSettingCardSwitchProps['additionalOnSwitchChange']
>;

const MEMORY_PROTECTION_OS_VALUES: Immutable<MemoryProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

export type MemoryProtectionCardProps = PolicyFormComponentCommonProps;

export const MemoryProtectionCard = memo<MemoryProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
      'customYaraSignaturesEnabled'
    );
    const {
      isAvailable: isCustomYaraSignaturesAvailable,
      upsellMessage,
      isGatedByLicenseOnly,
    } = useIsCustomYaraSignaturesAvailable();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const protection = 'memory_protection';
    const selected = (policy && policy.windows[protection].mode) !== ProtectionModes.off;

    // Custom YARA signatures follow the Memory threat switch, but only while the feature is
    // available: writing `true` when it is not would be rejected by license validation, and
    // writing `false` would manufacture an opt-out for a user who never had the toggle.
    //
    // A leftover `true` only needs proactive clearing when license is the sole blocker: the
    // server rejects that combination with a 403 on save. When the flag or product feature is
    // off, the server already strips a leftover `true` to absent by itself, so leaving the field
    // untouched here avoids manufacturing a `false` the sanitizer would otherwise never write.
    const adjustCustomYaraSignaturesOnProtectionSwitch =
      useCallback<AdjustSubfeatureOnProtectionSwitch>(
        ({ value, policyConfigData, protectionOsList }) => {
          if (isCustomYaraSignaturesAvailable) {
            setCustomYaraSignatures(policyConfigData, value, protectionOsList);
          } else if (isGatedByLicenseOnly) {
            clearCustomYaraSignaturesIfEnabled(policyConfigData, protectionOsList);
          }

          return policyConfigData;
        },
        [isCustomYaraSignaturesAvailable, isGatedByLicenseOnly]
      );

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.memory',
      {
        defaultMessage: 'Memory threat protections',
      }
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard title={LOCKED_CARD_MEMORY_TITLE} data-test-subj={getTestId('locked')} />
      );
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.memory_protection', {
          defaultMessage: 'Memory threat',
        })}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={MEMORY_PROTECTION_OS_VALUES}
            additionalOnSwitchChange={adjustCustomYaraSignaturesOnProtectionSwitch}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        <DetectPreventProtectionLevel
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
          data-test-subj={getTestId('protectionLevel')}
        />

        {isCustomYaraSignaturesEnabled && (
          <>
            <EuiSpacer size="m" />
            <CustomYaraSignaturesSwitch
              policy={policy}
              onChange={onChange}
              mode={mode}
              isAvailable={isCustomYaraSignaturesAvailable}
              upsellMessage={upsellMessage}
              data-test-subj={getTestId('customYaraSignatures')}
            />
          </>
        )}

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
          data-test-subj={getTestId('notifyUser')}
        />
      </SettingCard>
    );
  }
);
MemoryProtectionCard.displayName = 'MemoryProtectionCard';

interface CustomYaraSignaturesSwitchProps extends PolicyFormComponentCommonProps {
  isAvailable: boolean;
  upsellMessage: string | undefined;
}

const CustomYaraSignaturesSwitch = memo<CustomYaraSignaturesSwitchProps>(
  ({ policy, onChange, mode, isAvailable, upsellMessage, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const isEditMode = mode === 'edit';
    const isDisabled =
      !isAvailable || policy.windows.memory_protection.mode === ProtectionModes.off || !isEditMode;

    const tooltipContent = isAvailable
      ? CUSTOM_YARA_SIGNATURES_HINT
      : upsellMessage ?? CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL;

    const handleCustomYaraSignaturesSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const value = event.target.checked;
        const newPayload = cloneDeep(policy);

        setCustomYaraSignatures(newPayload, value, MEMORY_PROTECTION_OS_VALUES);

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [onChange, policy]
    );

    return (
      <EuiFlexGroup gutterSize="xs" data-test-subj={getTestId()}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={CUSTOM_YARA_SIGNATURES_LABEL}
            checked={Boolean(policy.windows.memory_protection.custom_yara_signatures)}
            onChange={handleCustomYaraSignaturesSwitchChange}
            disabled={isDisabled}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            position="right"
            content={tooltipContent}
            anchorProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
CustomYaraSignaturesSwitch.displayName = 'CustomYaraSignaturesSwitch';
