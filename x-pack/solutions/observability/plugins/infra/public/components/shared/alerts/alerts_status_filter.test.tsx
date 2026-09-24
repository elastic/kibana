/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import AlertsStatusFilter from './alerts_status_filter';

const renderFilter = (onChange = jest.fn()) =>
  render(
    <I18nProvider>
      <AlertsStatusFilter status="all" onChange={onChange} />
    </I18nProvider>
  );

describe('AlertsStatusFilter', () => {
  it('notifies when the selected alert status changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderFilter(onChange);

    await user.click(screen.getByTestId('hostsView-alert-status-filter-active-button'));
    expect(onChange).toHaveBeenCalledWith('active');

    await user.click(screen.getByTestId('hostsView-alert-status-filter-recovered-button'));
    expect(onChange).toHaveBeenCalledWith('recovered');
  });
});
