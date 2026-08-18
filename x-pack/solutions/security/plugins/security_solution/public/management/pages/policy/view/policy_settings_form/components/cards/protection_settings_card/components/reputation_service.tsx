/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useTestIdGenerator } from '../../../../../../../../hooks/use_test_id_generator';
import type { PolicyProtection } from '../../../../../../types';
import type { PolicyFormComponentCommonProps } from '../../../../types';
import { ProtectionModes } from '../../../../../../../../../../common/endpoint/types';

interface ReputationServiceProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  /** Reads and writes only this OS's reputation_service flag. */
  os: 'windows' | 'mac' | 'linux';
  /** Prior mode when policy is `off` (section disabled); used for read-only checked state. */
  ghostProtectionMode?: ProtectionModes;
  /** Prior `reputation_service` when master switch cleared it in policy; pairs with `ghostProtectionMode`. */
  ghostReputationEnabled?: boolean;
  /** When false, the protection section master switch is off — keep the switch visible but disabled. */
  sectionFeatureEnabled?: boolean;
}

export const ReputationService = React.memo(
  ({
    policy,
    onChange,
    mode,
    protection,
    os,
    ghostProtectionMode,
    ghostReputationEnabled,
    sectionFeatureEnabled = true,
    'data-test-subj': dataTestSubj,
  }: ReputationServiceProps) => {
    const isEditMode = mode === 'edit';

    const getTestId = useTestIdGenerator(dataTestSubj);

    const policyMode = policy[os].behavior_protection.mode;
    const usingGhostForDisplay =
      policyMode === ProtectionModes.off &&
      ghostProtectionMode !== undefined &&
      ghostProtectionMode !== ProtectionModes.off;

    const switchChecked = usingGhostForDisplay
      ? Boolean(ghostReputationEnabled)
      : Boolean(
          policy[os].behavior_protection.reputation_service && policyMode !== ProtectionModes.off
        );

    const handleChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);
        newPayload[os].behavior_protection.reputation_service = event.target.checked;
        onChange({ isValid: true, updatedPolicy: newPayload });
      },
      [policy, onChange, os]
    );

    return (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        data-test-subj={getTestId()}
      >
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.securitySolution.endpoint.policyDetail.reputationService',
              { defaultMessage: 'Reputation service' }
            )}
            checked={switchChecked}
            onChange={handleChange}
            disabled={!sectionFeatureEnabled || policyMode === ProtectionModes.off || !isEditMode}
            data-test-subj={getTestId('switch')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj={getTestId('tooltipIcon')}>
          <EuiIconTip
            position="right"
            data-test-subj={getTestId('tooltip')}
            content={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyDetailsConfig.reputationServiceTooltip"
                defaultMessage="This option enables/disables the Reputation Service feature in Endpoint. When the option is ON, Endpoint will reach out to a Cloud API for additional detection coverage. When it's OFF, Endpoint will not reach out to the Cloud API, resulting in reduced efficacy."
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ReputationService.displayName = 'ReputationService';
