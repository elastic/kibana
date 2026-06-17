/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
  APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH,
  SYNTHTRACE_STATUS_API_PATH,
} from './constants';
import { DemoDataSection } from './demo_data_section';

const renderSection = (synthtraceAvailable: boolean) => {
  const coreStart = coreMock.createStart();

  coreStart.http.get.mockImplementation((pathOrOptions) => {
    const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
    if (path === APM_ANOMALY_DETECTION_ENVIRONMENTS_API_PATH) {
      return Promise.resolve({ environments: ['dev', 'production'] });
    }
    if (path === SYNTHTRACE_STATUS_API_PATH) {
      return synthtraceAvailable
        ? Promise.resolve({ available: true })
        : Promise.reject(new Error('not found'));
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
  it('renders the section with the three capability tabs', async () => {
    renderSection(false);

    expect(await screen.findByTestId('observabilityOnboardingDemoDataSection')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alerts & SLOs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ML jobs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Synthtrace data' })).toBeInTheDocument();
  });

  it('offers Copy CLI but hides Run when the synthtrace runner is unavailable', async () => {
    renderSection(false);

    await screen.findByTestId('observabilityOnboardingDemoDataSection');
    await userEvent.click(screen.getByRole('tab', { name: 'Synthtrace data' }));

    expect(
      await screen.findByTestId('observabilityOnboardingDemoDataSynthtraceCopyButton')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByTestId('observabilityOnboardingDemoDataSynthtraceRunButton')
      ).not.toBeInTheDocument()
    );
  });
});
