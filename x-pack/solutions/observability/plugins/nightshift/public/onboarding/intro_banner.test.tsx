/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';
import { OnboardingIntroBanner } from './intro_banner';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const STORAGE_KEY = 'nightshift.onboarding.introBannerDismissed:/s/sre';

const setup = () => {
  (useKibana as jest.Mock).mockReturnValue({
    services: { http: { basePath: { get: () => '/s/sre' } } },
  });
  return render(
    <I18nProvider>
      <OnboardingIntroBanner />
    </I18nProvider>
  );
};

describe('OnboardingIntroBanner', () => {
  beforeEach(() => window.localStorage.clear());

  it('pitches Nightshift next to the video, without a live example to point to yet', () => {
    setup();

    expect(screen.getByTestId('nightshiftOnboardingIntroBanner')).toHaveTextContent(
      'Elastic nightshift is an SRE coworker'
    );
    expect(screen.getByTestId('nightshiftOnboardingIntroBanner')).toHaveTextContent(
      'Once you add data, it will start analyzing.'
    );
    expect(screen.queryByTestId('nightshiftOnboardingExploreLiveExample')).not.toBeInTheDocument();
  });

  it('is dismissed for the space in this browser', () => {
    const { unmount } = setup();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingIntroBannerDismiss'));

    expect(screen.queryByTestId('nightshiftOnboardingIntroBanner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');

    unmount();
    setup();
    expect(screen.queryByTestId('nightshiftOnboardingIntroBanner')).not.toBeInTheDocument();
  });
});
