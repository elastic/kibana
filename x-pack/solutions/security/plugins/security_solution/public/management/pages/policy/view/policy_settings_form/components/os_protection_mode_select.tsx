/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, useEuiTheme } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyFormComponentCommonProps } from '../types';
import type { MacPolicyProtection, LinuxPolicyProtection, PolicyProtection } from '../../../types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { OS_TITLES } from '../../../../../common/translations';
import { policySectionDropdownWrapperCss } from './policy_section_layout';

const DISABLE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.protectionModeDisable',
  {
    defaultMessage: 'Disable',
  }
);

const DETECT_LABEL = i18n.translate('xpack.securitySolution.endpoint.policy.details.detect', {
  defaultMessage: 'Detect',
});

const DETECT_PREVENT_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.detectPrevent',
  { defaultMessage: 'Detect & prevent' }
);

const optionLabelCss = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

export interface OsProtectionModeSelectProps extends PolicyFormComponentCommonProps {
  os: 'windows' | 'mac' | 'linux';
  protection: PolicyProtection;
  /** When policy mode is `off` (e.g. section master switch), show this prior mode in the control (disabled). */
  displayModeWhenPolicyOff?: ProtectionModes;
  /**
   * When false, the protection section master switch is off — keep the dropdown but disabled so
   * policy cannot be edited until the section is turned on again.
   */
  sectionFeatureEnabled?: boolean;
}

export const OsProtectionModeSelect = memo<OsProtectionModeSelectProps>(
  ({
    os,
    protection,
    policy,
    onChange,
    mode,
    displayModeWhenPolicyOff,
    sectionFeatureEnabled = true,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEditMode = mode === 'edit';
    const { euiTheme } = useEuiTheme();

    const dotCss = useCallback(
      (color: string) => css`
        display: block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: ${color};
        flex-shrink: 0;
      `,
      []
    );

    const modeOptions = useMemo<Array<EuiSuperSelectOption<ProtectionModes>>>(
      () => [
        {
          value: ProtectionModes.off,
          inputDisplay: (
            <span css={optionLabelCss}>
              <span css={dotCss(euiTheme.colors.danger)} />
              {DISABLE_LABEL}
            </span>
          ),
        },
        {
          value: ProtectionModes.detect,
          inputDisplay: (
            <span css={optionLabelCss}>
              <span css={dotCss(euiTheme.colors.warning)} />
              {DETECT_LABEL}
            </span>
          ),
        },
        {
          value: ProtectionModes.prevent,
          inputDisplay: (
            <span css={optionLabelCss}>
              <span css={dotCss(euiTheme.colors.success)} />
              {DETECT_PREVENT_LABEL}
            </span>
          ),
        },
      ],
      [euiTheme, dotCss]
    );

    const currentMode = useMemo(() => {
      if (os === 'windows') return policy.windows[protection].mode;
      if (os === 'mac') return policy.mac[protection as MacPolicyProtection].mode;
      return policy.linux[protection as LinuxPolicyProtection].mode;
    }, [os, policy, protection]);

    const displayMode =
      currentMode === ProtectionModes.off && displayModeWhenPolicyOff !== undefined
        ? displayModeWhenPolicyOff
        : currentMode;

    const ariaLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.details.osProtectionModeAriaLabel',
      {
        defaultMessage: '{osName} protection mode',
        values: { osName: OS_TITLES[os as OperatingSystem] },
      }
    );

    const selectedModeDisplay = useMemo(() => {
      const option = modeOptions.find((o) => o.value === displayMode);
      return (
        option?.inputDisplay ?? (
          <span css={optionLabelCss}>
            <span css={dotCss(euiTheme.colors.danger)} />
            {DISABLE_LABEL}
          </span>
        )
      );
    }, [displayMode, modeOptions, dotCss, euiTheme.colors.danger]);

    const handleChange = useCallback(
      (newMode: ProtectionModes) => {
        const newPayload = cloneDeep(policy);

        if (os === 'windows') {
          newPayload.windows[protection].mode = newMode;
          if (isPlatinumPlus) {
            newPayload.windows.popup[protection].enabled = newMode === ProtectionModes.prevent;
          }
        } else if (os === 'mac') {
          newPayload.mac[protection as MacPolicyProtection].mode = newMode;
          if (isPlatinumPlus) {
            (newPayload.mac.popup as Record<string, { enabled: boolean }>)[protection].enabled =
              newMode === ProtectionModes.prevent;
          }
        } else if (os === 'linux') {
          newPayload.linux[protection as LinuxPolicyProtection].mode = newMode;
          if (isPlatinumPlus) {
            (newPayload.linux.popup as Record<string, { enabled: boolean }>)[protection].enabled =
              newMode === ProtectionModes.prevent;
          }
        }

        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [os, protection, policy, onChange, isPlatinumPlus]
    );

    if (!isEditMode) {
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{selectedModeDisplay}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div css={policySectionDropdownWrapperCss}>
        <EuiSuperSelect<ProtectionModes>
          options={modeOptions}
          valueOfSelected={displayMode}
          onChange={handleChange}
          compressed
          fullWidth
          disabled={!sectionFeatureEnabled}
          aria-label={ariaLabel}
          data-test-subj={getTestId()}
        />
      </div>
    );
  }
);
OsProtectionModeSelect.displayName = 'OsProtectionModeSelect';
