/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH } from './constants';
import { DemoDataSection } from './demo_data_section';

const renderSection = () => {
  const coreStart = coreMock.createStart();

  coreStart.http.get.mockImplementation((pathOrOptions) => {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
    if (path === APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH) {
      return Promise.resolve({ environments: ['dev', 'production'] });
    }
    return Promise.resolve({});
  });

  return render(
    <I18nProvider>
      <KibanaContextProvider services={coreStart}>
        <DemoDataSection />
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('DemoDataSection', () => {
  it('renders the section with the capability tabs', async () => {
    renderSection();

    expect(await screen.findByTestId('observabilityOnboardingDemoDataSection')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alerts & SLOs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ML jobs' })).toBeInTheDocument();
  });
});
