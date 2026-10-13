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
import { OnboardingEnableFooter } from './onboarding_enable_footer';

const renderFooter = (props: Partial<React.ComponentProps<typeof OnboardingEnableFooter>> = {}) => {
  const onEnable = jest.fn();
  const onBack = jest.fn();
  render(
    <I18nProvider>
      <EuiProvider>
        <OnboardingEnableFooter
          selectedCount={2}
          totalCount={6}
          isSaving={false}
          isEnableDisabled={false}
          onEnable={onEnable}
          onBack={onBack}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );
  return { onEnable, onBack };
};

describe('OnboardingEnableFooter', () => {
  it('shows how many workers are selected', () => {
    renderFooter({ selectedCount: 2, totalCount: 6 });
    expect(screen.getByTestId('alertZeroOnboardingSelectedCount')).toHaveTextContent(
      '2 of 6 Workers selected'
    );
  });

  it('calls onEnable and onBack from their buttons', () => {
    const { onEnable, onBack } = renderFooter();
    fireEvent.click(screen.getByTestId('alertZeroOnboardingEnableButton'));
    fireEvent.click(screen.getByTestId('alertZeroOnboardingBackButton'));
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables the Enable button when isEnableDisabled is set', () => {
    const { onEnable } = renderFooter({ isEnableDisabled: true });
    const button = screen.getByTestId('alertZeroOnboardingEnableButton');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('shows a loading Enable button and disables Back while saving', () => {
    renderFooter({ isSaving: true });
    expect(screen.getByTestId('alertZeroOnboardingBackButton')).toBeDisabled();
    expect(
      screen.getByTestId('alertZeroOnboardingEnableButton').querySelector('.euiLoadingSpinner')
    ).toBeInTheDocument();
  });
});
