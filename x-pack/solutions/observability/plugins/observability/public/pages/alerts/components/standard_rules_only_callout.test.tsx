/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  StandardRulesOnlyCallout,
  STANDARD_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEY,
} from './standard_rules_only_callout';

const renderCallout = () =>
  render(
    <IntlProvider locale="en">
      <StandardRulesOnlyCallout />
    </IntlProvider>
  );

describe('StandardRulesOnlyCallout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the title and description', () => {
    renderCallout();

    expect(screen.getByTestId('standardRulesOnlyCallout')).toBeInTheDocument();
    expect(screen.getByText('Standard rules only')).toBeInTheDocument();
    expect(
      screen.getByText('This page only shows alerts from Standard rules.')
    ).toBeInTheDocument();
  });

  it('dismisses and persists the dismissed state to localStorage', () => {
    renderCallout();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByTestId('standardRulesOnlyCallout')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STANDARD_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(STANDARD_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEY, 'true');
    renderCallout();

    expect(screen.queryByTestId('standardRulesOnlyCallout')).not.toBeInTheDocument();
  });
});
