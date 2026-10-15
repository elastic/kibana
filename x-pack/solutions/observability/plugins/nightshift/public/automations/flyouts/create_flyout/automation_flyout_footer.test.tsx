/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationFlyoutFooter } from './automation_flyout_footer';

const renderFooter = (props: Partial<React.ComponentProps<typeof AutomationFlyoutFooter>> = {}) => {
  const onSave = jest.fn();
  render(
    <I18nProvider>
      <AutomationFlyoutFooter canSave isSaving={false} onSave={onSave} {...props} />
    </I18nProvider>
  );
  return { onSave };
};

describe('AutomationFlyoutFooter', () => {
  it('saves as disabled', () => {
    const { onSave } = renderFooter();
    fireEvent.click(screen.getByTestId('submitAutomation'));
    expect(onSave).toHaveBeenCalledWith(false);
  });

  it('saves and enables', () => {
    const { onSave } = renderFooter();
    fireEvent.click(screen.getByTestId('submitAndEnableAutomation'));
    expect(onSave).toHaveBeenCalledWith(true);
  });

  it('disables both saves when blocked', () => {
    renderFooter({ canSave: false, saveBlocker: 'Fix the cron expression to save' });

    expect(screen.getByTestId('submitAutomation')).toBeDisabled();
    expect(screen.getByTestId('submitAndEnableAutomation')).toBeDisabled();
  });
});
