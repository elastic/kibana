/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useWatchlistManualEntitiesEnabled } from '../../../hooks/use_watchlist_manual_entities_enabled';
import { WatchlistForm, type WatchlistFormProps } from './watchlist_form';

jest.mock('../../../hooks/use_watchlist_manual_entities_enabled');
jest.mock('./rule_based_source_input', () => ({ RuleBasedSourceInput: () => null }));
jest.mock('./csv_upload', () => ({ WatchlistCsvUpload: () => null }));
jest.mock('./managed_watchlist_source_input', () => ({ ManagedWatchlistSourceInput: () => null }));
jest.mock('./manual_entities_section', () => ({
  ManualEntitiesSection: ({ watchlistId, watchlistName }: Record<string, string>) => (
    <div data-test-subj="mockManualEntitiesSection">{`${watchlistId}:${watchlistName}`}</div>
  ),
}));

const renderForm = (props: Partial<WatchlistFormProps> = {}) =>
  render(
    <I18nProvider>
      <WatchlistForm
        watchlist={{ name: 'Vendors', description: '', riskModifier: 1.5, managed: false }}
        isEditMode={false}
        isNameTooLong={false}
        isDescriptionTooLong={false}
        isRiskModifierInvalid={false}
        onFieldChange={jest.fn()}
        ruleBasedSource={{} as WatchlistFormProps['ruleBasedSource']}
        {...props}
      />
    </I18nProvider>
  );

describe('WatchlistForm manually added entities', () => {
  beforeEach(() => {
    (useWatchlistManualEntitiesEnabled as jest.Mock).mockReturnValue(true);
  });

  it('shows them when editing a watchlist, under the rules', () => {
    renderForm({ isEditMode: true, watchlistId: 'wl-1' });

    expect(screen.getByTestId('mockManualEntitiesSection')).toHaveTextContent('wl-1:Vendors');
  });

  it('does not show them when the manually added entities flag is off', () => {
    (useWatchlistManualEntitiesEnabled as jest.Mock).mockReturnValue(false);
    renderForm({ isEditMode: true, watchlistId: 'wl-1' });

    expect(screen.queryByTestId('mockManualEntitiesSection')).not.toBeInTheDocument();
  });

  it('does not show them when creating a watchlist', () => {
    renderForm({ isEditMode: false });

    expect(screen.queryByTestId('mockManualEntitiesSection')).not.toBeInTheDocument();
  });

  it('does not show them before the watchlist has an id', () => {
    renderForm({ isEditMode: true, watchlistId: undefined });

    expect(screen.queryByTestId('mockManualEntitiesSection')).not.toBeInTheDocument();
  });
});
