/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { WorkerSelectionDescription } from './worker_selection_description';

describe('WorkerSelectionDescription', () => {
  const renderDescription = (onWatchSettingsClick = jest.fn(), isSaving = false) => {
    render(
      <I18nProvider>
        <EuiProvider>
          <WorkerSelectionDescription
            isSaving={isSaving}
            onWatchSettingsClick={onWatchSettingsClick}
          />
        </EuiProvider>
      </I18nProvider>
    );
    return { onWatchSettingsClick };
  };

  it('explains what a Watch is', () => {
    renderDescription();
    expect(screen.getByText(/A Watch is a small team of Workers/)).toBeInTheDocument();
  });

  it('calls onWatchSettingsClick from the Watch settings link', () => {
    const { onWatchSettingsClick } = renderDescription();
    fireEvent.click(screen.getByTestId('alertZeroOnboardingWatchSettingsLink'));
    expect(onWatchSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('disables the Watch settings link while saving', () => {
    const { onWatchSettingsClick } = renderDescription(jest.fn(), true);
    const link = screen.getByTestId('alertZeroOnboardingWatchSettingsLink');
    expect(link).toBeDisabled();
    fireEvent.click(link);
    expect(onWatchSettingsClick).not.toHaveBeenCalled();
  });

  it('renders the Read more link in the same paragraph, opening the docs URL in a new tab', () => {
    renderDescription();
    const link = screen.getByTestId('alertZeroOnboardingReadMoreLink');
    expect(link).toHaveAttribute('href', ONBOARDING_READ_MORE_URL_PLACEHOLDER);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.closest('p')).toContainElement(
      screen.getByTestId('alertZeroOnboardingWatchSettingsLink')
    );
  });
});
