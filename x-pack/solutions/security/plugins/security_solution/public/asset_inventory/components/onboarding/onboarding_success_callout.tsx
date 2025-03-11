/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useOnboardingSuccessCallout } from './hooks/use_onboarding_success_callout';
import { TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT } from '../../constants';

export const OnboardingSuccessCallout = () => {
  const { isOnboardingSuccessCalloutVisible, hideOnboardingSuccessCallout } =
    useOnboardingSuccessCallout();

  return isOnboardingSuccessCalloutVisible ? (
    <>
      <EuiCallOut
        onDismiss={hideOnboardingSuccessCallout}
        title={
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.onboarding.enabledSuccessfullyTitle"
            defaultMessage="Asset Inventory Enabled Successfully"
          />
        }
        color="success"
        iconType="check"
        data-test-subj={TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT}
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.onboarding.enabledSuccessfully"
            defaultMessage="Asset Inventory is now set up and ready to use. You can start managing your assets with enhanced visibility and context, empowering your security team to make informed decisions."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  ) : null;
};
