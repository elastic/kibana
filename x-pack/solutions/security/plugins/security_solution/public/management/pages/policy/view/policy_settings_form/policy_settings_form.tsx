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
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import { updateAntivirusRegistrationEnabled } from '../../../../../../common/endpoint/utils/update_antivirus_registration_enabled';
import { useGetProtectionsUnavailableComponent } from './hooks/use_get_protections_unavailable_component';
import { EventMergingBanner } from './components/event_merging_banner';
import { AntivirusRegistrationCard } from './components/cards/antivirus_registration_card';
import { EventCollectionSection } from './components/event_collection_section';
import { AttackSurfaceReductionCard } from './components/cards/attack_surface_reduction_card';
import { BehaviourProtectionCard } from './components/cards/protection_settings_card/behaviour_protection_card';
import { MemoryProtectionCard } from './components/cards/memory_protection_card';
import { RelatedDetectionRulesCallout } from './components/related_detection_rules_callout';
import { RansomwareProtectionCard } from './components/cards/ransomware_protection_card';
import { MalwareProtectionsCard } from './components/cards/malware_protections_card';
import type { PolicyFormComponentCommonProps } from './types';
import { AdvancedSection } from './components/advanced_section';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useGetDeviceControlUpsellComponent } from './hooks/use_get_device_control_component';
import { DeviceControlCard } from './components/cards/device_control_card';

const PROTECTIONS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.protections',
  { defaultMessage: 'Protections' }
);

export type PolicySettingsFormProps = PolicyFormComponentCommonProps;

export const PolicySettingsForm = memo<PolicySettingsFormProps>((props) => {
  const getTestId = useTestIdGenerator(props['data-test-subj']);
  const ProtectionsUpSellingComponent = useGetProtectionsUnavailableComponent();
  const DeviceControlUpSellingComponent = useGetDeviceControlUpsellComponent();

  const { storage } = useKibana().services;

  const trustedDevices = useIsExperimentalFeatureEnabled('trustedDevices');

  const renderDeviceControlSection = () => {
    if (!trustedDevices) {
      return null;
    }

    return (
      <>
        {DeviceControlUpSellingComponent ? (
          <DeviceControlUpSellingComponent />
        ) : (
          <DeviceControlCard {...props} data-test-subj={getTestId('deviceControl')} />
        )}
        <EuiSpacer size="l" />
      </>
    );
  };

  const [showEventMergingBanner, setShowEventMergingBanner] = useState(
    storage.get('securitySolution.showEventMergingBanner') ?? true
  );
  const onBannerDismiss = useCallback(() => {
    setShowEventMergingBanner(false);
    storage.set('securitySolution.showEventMergingBanner', false);
  }, [storage]);

  const onChangeProxy: PolicySettingsFormProps['onChange'] = ({ isValid, updatedPolicy }) => {
    // perform tasks that synchronises changes between settings
    updateAntivirusRegistrationEnabled(updatedPolicy);

    props.onChange({ isValid, updatedPolicy });
  };

  return (
    <div data-test-subj={getTestId()}>
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
            {...props}
            onChange={onChangeProxy}
            data-test-subj={getTestId('malware')}
          />
          <EuiSpacer size="l" />

          <AntivirusRegistrationCard
            {...props}
            onChange={onChangeProxy}
            data-test-subj={getTestId('antivirusRegistration')}
          />
          <EuiSpacer size="l" />

          <BehaviourProtectionCard {...props} data-test-subj={getTestId('behaviour')} />
          <EuiSpacer size="l" />

          <RansomwareProtectionCard {...props} data-test-subj={getTestId('ransomware')} />
          <EuiSpacer size="l" />

          <MemoryProtectionCard {...props} data-test-subj={getTestId('memory')} />
          <EuiSpacer size="l" />

          {renderDeviceControlSection()}

          <AttackSurfaceReductionCard {...props} data-test-subj={getTestId('attackSurface')} />
          <EuiSpacer size="l" />
        </>
      )}

      <EventCollectionSection {...props} data-test-subj={getTestId('eventCollection')} />

      <EuiSpacer size="m" />
      <AdvancedSection {...props} data-test-subj={getTestId('advancedSection')} />
    </div>
  );
});
PolicySettingsForm.displayName = 'PolicySettingsForm';

const FormSectionTitle = memo<PropsWithChildren<unknown>>(({ children }) => {
  return (
    <EuiText size="xs" color="subdued">
      <h4>{children}</h4>
    </EuiText>
  );
});
FormSectionTitle.displayName = 'FormSectionTitle';
