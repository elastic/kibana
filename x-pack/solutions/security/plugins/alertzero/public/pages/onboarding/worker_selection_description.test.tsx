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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { ONBOARDING_READ_MORE_URL_PLACEHOLDER } from './constants';
import { WorkerSelectionDescription } from './worker_selection_description';

describe('WorkerSelectionDescription', () => {
  const renderDescription = (onWatchSettingsClick = jest.fn(), isSaving = false) => {
    const core = coreMock.createStart();
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={core}>
            <WorkerSelectionDescription
              isSaving={isSaving}
              onWatchSettingsClick={onWatchSettingsClick}
            />
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );
    return { onWatchSettingsClick };
  };

  it('explains what a Watch is', () => {
    renderDescription();
    expect(
      screen.getByText(
        /Each Worker belongs to a Watch, a team of Workers with one area of expertise/
      )
    ).toBeInTheDocument();
  });

  it('tells users to enable the settings their Workers need', () => {
    renderDescription();
    expect(
      screen.getByText(/To start using AlertZero, enable the settings your Workers need/)
    ).toBeInTheDocument();
  });

  it('names the Enable and run button in bold', () => {
    renderDescription();
    expect(screen.getByText('Enable and run').tagName).toBe('STRONG');
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
