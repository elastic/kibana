/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateFlyoutFooter } from './create_flyout_footer';

const renderFooter = (props: Partial<React.ComponentProps<typeof CreateFlyoutFooter>> = {}) => {
  const handlers = { onEnabledChange: jest.fn(), onSave: jest.fn() };
  render(
    <I18nProvider>
      <CreateFlyoutFooter isEnabled={false} canSave isSaving={false} {...handlers} {...props} />
    </I18nProvider>
  );
  return handlers;
};

describe('CreateFlyoutFooter', () => {
  it('shows the disabled state and toggles it', () => {
    const { onEnabledChange } = renderFooter();

    expect(screen.getByText('Saves as disabled')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automationEnabledSwitch'));
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it('shows the enabled state', () => {
    renderFooter({ isEnabled: true });

    expect(screen.getByText('Enables when saved')).toBeInTheDocument();
  });

  it('saves only when allowed', () => {
    const { onSave } = renderFooter();
    fireEvent.click(screen.getByTestId('submitAutomation'));
    expect(onSave).toHaveBeenCalled();
  });

  it('disables save when blocked', () => {
    renderFooter({ canSave: false, saveBlocker: 'Fix the cron expression to save' });

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
  });
});
