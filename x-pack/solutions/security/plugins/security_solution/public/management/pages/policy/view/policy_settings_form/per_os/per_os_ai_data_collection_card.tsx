/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiBetaBadge, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Immutable, PolicyConfig } from '../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { TECHNICAL_PREVIEW } from '../../../../../../common/translations';
import type { AiDataCollectionOSes } from '../../../types';
import { PerOsSettingCard } from './per_os_setting_card';
import { SupportedVersionForProtectionNotice } from '../components/notify_user_option';
import type { PolicyFormComponentCommonProps } from '../types';
import { OsRow, POLICY_OS_TO_OPERATING_SYSTEM } from './os_row';
import { POLICY_SETTING_SECTION_DESCRIPTIONS } from './policy_setting_section_descriptions';
import { createAiDataCollectionPolicyAccessor } from './policy_accessor';

const AI_DATA_COLLECTION_OS_VALUES: Immutable<AiDataCollectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

export const PER_OS_AI_DATA_COLLECTION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.aiDataCollection',
  {
    defaultMessage: 'AI Data Collection',
  }
);

const AI_DATA_COLLECTION_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.aiDataCollection.switchLabel',
  {
    defaultMessage: 'AI event enrichment',
  }
);

export type PerOsAiDataCollectionCardProps = PolicyFormComponentCommonProps;

export const PerOsAiDataCollectionCard = memo<PerOsAiDataCollectionCardProps>(
  ({ policy, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <PerOsSettingCard
        title={PER_OS_AI_DATA_COLLECTION_CARD_TITLE}
        titleAppend={
          <EuiBetaBadge
            label={TECHNICAL_PREVIEW}
            size="s"
            data-test-subj={getTestId('technicalPreviewBadge')}
          />
        }
        description={POLICY_SETTING_SECTION_DESCRIPTIONS.aiDataCollection}
        dataTestSubj={getTestId()}
        mode={mode}
        rightCorner={
          <SupportedVersionForProtectionNotice
            protection="ai_data_collection"
            data-test-subj={getTestId('supportedVersion')}
          />
        }
      >
        {AI_DATA_COLLECTION_OS_VALUES.map((os, index) => (
          <PerOsAiDataCollectionRow
            key={os}
            os={os}
            policy={policy}
            onChange={onChange}
            mode={mode}
            isLast={index === AI_DATA_COLLECTION_OS_VALUES.length - 1}
            data-test-subj={getTestId(os)}
          />
        ))}
      </PerOsSettingCard>
    );
  }
);
PerOsAiDataCollectionCard.displayName = 'PerOsAiDataCollectionCard';

interface PerOsAiDataCollectionRowProps {
  os: AiDataCollectionOSes;
  policy: PolicyConfig;
  onChange: PolicyFormComponentCommonProps['onChange'];
  mode: 'edit' | 'view';
  isLast: boolean;
  'data-test-subj'?: string;
}

const PerOsAiDataCollectionRow = memo<PerOsAiDataCollectionRowProps>(
  ({ os, policy, onChange, mode, isLast, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    // Absent `ai_data_collection` means the field was never configured for this OS and is
    // treated as disabled, matching how Endpoint itself interprets a missing block.
    const checked = policy[os].ai_data_collection?.enabled === true;

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const accessor = createAiDataCollectionPolicyAccessor(policy, os);
        const updatedPolicy = accessor.update((osPolicy) => {
          osPolicy.ai_data_collection = { enabled: event.target.checked };
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, os, policy]
    );

    return (
      <OsRow
        os={POLICY_OS_TO_OPERATING_SYSTEM[os]}
        primaryControl={
          <EuiSwitch
            label={AI_DATA_COLLECTION_SWITCH_LABEL}
            checked={checked}
            disabled={mode !== 'edit'}
            onChange={handleSwitchChange}
            data-test-subj={getTestId('enableDisableSwitch')}
            labelProps={{ 'data-test-subj': getTestId('switchLabel') }}
          />
        }
        isLast={isLast}
        data-test-subj={getTestId()}
      />
    );
  }
);
PerOsAiDataCollectionRow.displayName = 'PerOsAiDataCollectionRow';
