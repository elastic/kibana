/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo, useCallback, useState } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { updateAntivirusRegistrationEnabled } from '../../../../../../common/endpoint/utils/update_antivirus_registration_enabled';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { AdvancedSection } from './components/advanced_section';
import { EventMergingBanner } from './components/event_merging_banner';
import { RelatedDetectionRulesCallout } from './components/related_detection_rules_callout';
import { useGetProtectionsUnavailableComponent } from './hooks/use_get_protections_unavailable_component';
import type { PolicyFormComponentCommonProps } from './types';
import { AiDataCollectionCard } from './ai_data_collection_card';
import { AntivirusRegistrationCard } from './antivirus_registration_card';
import { AttackSurfaceReductionCard } from './attack_surface_reduction_card';
import { BehaviourProtectionCard } from './behaviour_protection_card';
import { DeviceControlCard } from './device_control_card';
import { EventCollectionCard } from './event_collection_card';
import { MalwareProtectionsCard } from './malware_protections_card';
import { MemoryProtectionCard } from './memory_protection_card';
import { RansomwareProtectionCard } from './ransomware_protection_card';

const PROTECTIONS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.protections',
  { defaultMessage: 'Protections' }
);

const SETTINGS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.settings',
  { defaultMessage: 'Settings' }
);

const FORM_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.perOsFormDescription',
  {
    defaultMessage:
      'Configure how Elastic Defend protects your endpoints. Changes apply to all hosts assigned to this policy.',
  }
);

// The macOS row on the Ransomware card owns this field, so it is hidden from the advanced
// settings rather than offered twice.
const OMITTED_ADVANCED_KEYS: readonly string[] = ['mac.ransomware.mode'];

export type PolicySettingsFormProps = PolicyFormComponentCommonProps;

export const PolicySettingsForm = memo(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }: PolicySettingsFormProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const ProtectionsUpSellingComponent = useGetProtectionsUnavailableComponent();
    const trustedDevices = useIsExperimentalFeatureEnabled('trustedDevices');
    const endpointAiDataCollection = useIsExperimentalFeatureEnabled('endpointAiDataCollection');
    const { storage } = useKibana().services;
    const [showEventMergingBanner, setShowEventMergingBanner] = useState(
      storage.get('securitySolution.showEventMergingBanner') ?? true
    );
    const onBannerDismiss = useCallback(() => {
      setShowEventMergingBanner(false);
      storage.set('securitySolution.showEventMergingBanner', false);
    }, [storage]);
    const onChangeProxy: PolicyFormComponentCommonProps['onChange'] = ({
      isValid,
      updatedPolicy,
    }) => {
      updateAntivirusRegistrationEnabled(updatedPolicy);
      onChange({ isValid, updatedPolicy });
    };
    const commonProps = { policy, onChange, mode, 'data-test-subj': dataTestSubj };

    const renderDeviceControlSection = () => {
      if (!trustedDevices) {
        return null;
      }

      return (
        <>
          <DeviceControlCard {...commonProps} data-test-subj={getTestId('deviceControl')} />
          <EuiSpacer size="l" />
        </>
      );
    };

    return (
      <div data-test-subj={getTestId()}>
        <EuiText size="s" color="subdued" data-test-subj={getTestId('description')}>
          <p>{FORM_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {showEventMergingBanner && (
          <>
            <EventMergingBanner onDismiss={onBannerDismiss} />
            <EuiSpacer size="s" />
          </>
        )}
        <FormSectionTitle>{PROTECTIONS_SECTION_TITLE}</FormSectionTitle>

        {ProtectionsUpSellingComponent && (
          <>
            <EuiSpacer size="m" />
            <ProtectionsUpSellingComponent />
            <EuiSpacer size="l" />
          </>
        )}

        {!ProtectionsUpSellingComponent && (
          <>
            <RelatedDetectionRulesCallout />
            <EuiSpacer size="l" />
            <MalwareProtectionsCard
              {...commonProps}
              onChange={onChangeProxy}
              data-test-subj={getTestId('malware')}
            />
            <EuiSpacer size="l" />

            <BehaviourProtectionCard {...commonProps} data-test-subj={getTestId('behaviour')} />
            <EuiSpacer size="l" />
          </>
        )}

        <AntivirusRegistrationCard
          {...commonProps}
          onChange={onChangeProxy}
          data-test-subj={getTestId('antivirusRegistration')}
        />
        <EuiSpacer size="l" />

        {!ProtectionsUpSellingComponent && (
          <>
            <RansomwareProtectionCard {...commonProps} data-test-subj={getTestId('ransomware')} />
            <EuiSpacer size="l" />

            <MemoryProtectionCard {...commonProps} data-test-subj={getTestId('memory')} />
            <EuiSpacer size="l" />

            {renderDeviceControlSection()}

            <AttackSurfaceReductionCard
              {...commonProps}
              data-test-subj={getTestId('attackSurface')}
            />
            <EuiSpacer size="l" />
          </>
        )}

        {endpointAiDataCollection && (
          <>
            <AiDataCollectionCard {...commonProps} data-test-subj={getTestId('aiDataCollection')} />
            <EuiSpacer size="l" />
          </>
        )}

        <FormSectionTitle>{SETTINGS_SECTION_TITLE}</FormSectionTitle>
        <EuiSpacer size="s" />

        <EventCollectionCard {...commonProps} data-test-subj={getTestId('eventCollection')} />

        <EuiSpacer size="m" />
        <AdvancedSection
          {...commonProps}
          omitKeys={OMITTED_ADVANCED_KEYS}
          data-test-subj={getTestId('advancedSection')}
        />
      </div>
    );
  }
);
PolicySettingsForm.displayName = 'PolicySettingsForm';

const FormSectionTitle = memo<PropsWithChildren<unknown>>(({ children }) => {
  return (
    <EuiText size="xs" color="subdued">
      <h4>{children}</h4>
    </EuiText>
  );
});
FormSectionTitle.displayName = 'FormSectionTitle';
