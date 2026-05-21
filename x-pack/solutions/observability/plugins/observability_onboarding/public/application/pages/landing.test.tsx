/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render } from '@testing-library/react';
import React from 'react';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../common/feature_flags';
import { LandingPage } from './landing';

jest.mock('../onboarding_flow_form/onboarding_flow_form', () => ({
  OnboardingFlowForm: () => null,
}));

const renderWithFlag = (enabled: boolean) => {
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue.mockImplementation((id, fallback) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? enabled : fallback
  );
  return render(
    <I18nProvider>
      <KibanaContextProvider services={coreStart}>
        <LandingPage />
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('LandingPage', () => {
  it('renders the V2 layout when the flag is on', () => {
    expect(renderWithFlag(true).queryByTestId('addDataPageV2')).toBeInTheDocument();
  });

  it('does not render the V2 layout when the flag is off', () => {
    expect(renderWithFlag(false).queryByTestId('addDataPageV2')).not.toBeInTheDocument();
  });
});
