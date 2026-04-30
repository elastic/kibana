/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEventHandler } from 'react';
import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiText } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { shouldEnableAntivirusRegistrationForSync } from '../../../../../../../../common/endpoint/utils/update_antivirus_registration_enabled';
import { AntivirusRegistrationModes } from '../../../../../../../../common/endpoint/types';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { SettingCard } from '../setting_card';
import { OsProtectionRow } from '../os_protection_row';
import type { PolicyFormComponentCommonProps } from '../../types';
import { ANTIVIRUS_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';

const CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
  { defaultMessage: 'Antivirus solution' }
);

const ENABLED = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent.enabled',
  { defaultMessage: 'enabled' }
);

const DISABLED = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent.disabled',
  { defaultMessage: 'disabled' }
);

const SYNC_MODE_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent',
  { defaultMessage: 'Sync with malware protection level' }
);

export type AntivirusRegistrationCardProps = PolicyFormComponentCommonProps;

export const AntivirusRegistrationCard = memo<AntivirusRegistrationCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const isEditMode = mode === 'edit';
    const currentMode = policy.windows.antivirus_registration.mode;

    const options = useMemo(() => {
      const syncCurrentOutcome = shouldEnableAntivirusRegistrationForSync(policy)
        ? ENABLED
        : DISABLED;
      return [
        {
          value: AntivirusRegistrationModes.disabled,
          text: i18n.translate(
            'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.disable',
            { defaultMessage: 'Disable' }
          ),
        },
        {
          value: AntivirusRegistrationModes.enabled,
          text: i18n.translate(
            'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.enable',
            { defaultMessage: 'Enable' }
          ),
        },
        {
          value: AntivirusRegistrationModes.sync,
          text: i18n.translate(
            'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncOptionDisplayWithCurrentOutcome',
            {
              defaultMessage:
                'Sync with malware protection level (Current level: {currentOutcome})',
              values: { currentOutcome: syncCurrentOutcome },
            }
          ),
        },
      ];
    }, [policy]);

    const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
      const updatedPolicy = cloneDeep(policy);
      updatedPolicy.windows.antivirus_registration.mode = event.target
        .value as AntivirusRegistrationModes;
      onChange({ isValid: true, updatedPolicy });
    };

    if (!isProtectionsAllowed) {
      return null;
    }

    const selectedOption = options.find((o) => o.value === currentMode);

    return (
      <SettingCard
        type={CARD_TITLE}
        supportedOss={[OperatingSystem.WINDOWS]}
        sectionDescription={ANTIVIRUS_POLICY_SECTION_DESCRIPTION}
        dataTestSubj={getTestId()}
        osRestriction={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.av.windowsServerNotSupported',
          {
            defaultMessage:
              'Windows Server operating systems unsupported because Antivirus registration requires Windows Security Center, which is not included in Windows Server operating systems.',
          }
        )}
      >
        <OsProtectionRow
          isLast
          os={OperatingSystem.WINDOWS}
          data-test-subj={getTestId('windowsRow')}
        >
          {isEditMode ? (
            <div
              css={css`
                align-self: flex-start;
                flex-shrink: 0;
                width: fit-content;
                min-width: 440px;
              `}
            >
              <EuiSelect
                options={options}
                value={currentMode}
                onChange={handleChange}
                compressed
                fullWidth
                aria-label={i18n.translate(
                  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.selectAriaLabel',
                  { defaultMessage: 'Antivirus solution mode' }
                )}
                data-test-subj={getTestId('modeSelect')}
              />
            </div>
          ) : (
            <EuiText size="s" data-test-subj={getTestId('modeSelect')}>
              {currentMode === AntivirusRegistrationModes.sync
                ? SYNC_MODE_LABEL
                : selectedOption?.text ?? currentMode}
              {currentMode === AntivirusRegistrationModes.sync && (
                <EuiText size="xs" color="subdued" component="span">
                  {' '}
                  {i18n.translate(
                    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncCurrentOutcomeView',
                    {
                      defaultMessage: '(Current level: {currentOutcome})',
                      values: {
                        currentOutcome: shouldEnableAntivirusRegistrationForSync(policy)
                          ? ENABLED
                          : DISABLED,
                      },
                    }
                  )}
                </EuiText>
              )}
            </EuiText>
          )}
        </OsProtectionRow>
      </SettingCard>
    );
  }
);
AntivirusRegistrationCard.displayName = 'AntivirusRegistrationCard';
