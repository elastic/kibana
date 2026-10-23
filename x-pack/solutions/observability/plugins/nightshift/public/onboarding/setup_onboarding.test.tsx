/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { NightshiftSetupOnboarding } from './setup_onboarding';

jest.mock('../app/header', () => ({
  NightshiftHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
jest.mock('../service_account/nightshift_setup_prompt', () => ({
  NightshiftSetupPrompt: () => <div data-test-subj="nightshiftSetupPromptStub" />,
}));

const renderSetup = (isLoading = false) =>
  render(
    <I18nProvider>
      <NightshiftSetupOnboarding status={undefined} isLoading={isLoading} />
    </I18nProvider>
  );

describe('NightshiftSetupOnboarding', () => {
  it('puts the setup step first, below the intro video', () => {
    renderSetup();

    const banner = screen.getByTestId('nightshiftOnboardingIntroBanner');
    const prompt = screen.getByTestId('nightshiftSetupPromptStub');
    expect(banner.compareDocumentPosition(prompt)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('nightshiftOnboardingStep-enable')).toHaveAttribute(
      'aria-current',
      'step'
    );
    for (const step of ['connect', 'investigate', 'automate']) {
      expect(screen.getByTestId(`nightshiftOnboardingStep-${step}`)).not.toHaveAttribute(
        'aria-current'
      );
    }
  });

  it('waits for the setup status before showing the setup card', () => {
    renderSetup(true);

    expect(screen.queryByTestId('nightshiftSetupPromptStub')).not.toBeInTheDocument();
  });
});
