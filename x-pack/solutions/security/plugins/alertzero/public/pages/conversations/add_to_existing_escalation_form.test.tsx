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
import type { EscalationIncidentSummary } from '@kbn/agentic-investigations-common';
import {
  AddToExistingEscalationForm,
  type AddToExistingEscalationFormProps,
} from './add_to_existing_escalation_form';

const freeIncident: EscalationIncidentSummary = {
  id: 'esc-1',
  title: 'First escalation',
  linkedInvestigationCount: 2,
  alreadyLinked: false,
  canManage: true,
};

const linkedIncident: EscalationIncidentSummary = {
  id: 'esc-2',
  title: 'Already linked escalation',
  linkedInvestigationCount: 1,
  alreadyLinked: true,
  canManage: true,
};

const nonOwnerIncident: EscalationIncidentSummary = {
  id: 'esc-3',
  title: 'Participant-only escalation',
  linkedInvestigationCount: 0,
  alreadyLinked: false,
  canManage: false,
};

const defaultProps: AddToExistingEscalationFormProps = {
  incidents: [freeIncident],
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
  searchQuery: '',
  onSearchChange: jest.fn(),
  onSubmit: jest.fn(),
  isSubmitting: false,
  onCancel: jest.fn(),
};

const renderForm = (props: Partial<AddToExistingEscalationFormProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AddToExistingEscalationForm {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

afterEach(() => jest.clearAllMocks());

describe('AddToExistingEscalationForm', () => {
  it('shows a loading spinner while escalations are loading', () => {
    renderForm({ isLoading: true, incidents: [] });

    expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('shows an empty state message when there are no incidents', () => {
    renderForm({ incidents: [] });

    expect(screen.getByText('No escalations found.')).toBeInTheDocument();
  });

  it('renders escalation rows', () => {
    renderForm({ incidents: [freeIncident] });

    expect(screen.getByTestId('escalationModalIncident-esc-1')).toBeInTheDocument();
    expect(screen.getByText('First escalation')).toBeInTheDocument();
  });

  it('disables the radio for an already-linked escalation', () => {
    renderForm({ incidents: [linkedIncident] });

    const radio = document.getElementById('incident-esc-2') as HTMLInputElement;
    expect(radio).toBeDisabled();
  });

  it('keeps submit disabled when no escalation is selected', () => {
    renderForm();

    expect(screen.getByTestId('escalationModalAddToIncident')).toBeDisabled();
  });

  it('enables submit after selecting an escalation', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-1'));

    expect(screen.getByTestId('escalationModalAddToIncident')).not.toBeDisabled();
  });

  it('calls onSubmit with the selected escalation id', () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit });

    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-1'));
    fireEvent.click(screen.getByTestId('escalationModalAddToIncident'));

    expect(onSubmit).toHaveBeenCalledWith('esc-1');
  });

  it('ignores clicks on an already-linked escalation row', () => {
    renderForm({ incidents: [linkedIncident] });

    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-2'));

    expect(screen.getByTestId('escalationModalAddToIncident')).toBeDisabled();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    renderForm({ onCancel });

    fireEvent.click(screen.getByTestId('escalationModalCancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onSearchChange when the search field changes', () => {
    const onSearchChange = jest.fn();
    renderForm({ onSearchChange });

    fireEvent.change(screen.getByTestId('escalationModalIncidentSearch'), {
      target: { value: 'critical' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('critical');
  });

  it('clears selection when the search query changes', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-1'));
    expect(screen.getByTestId('escalationModalAddToIncident')).not.toBeDisabled();

    fireEvent.change(screen.getByTestId('escalationModalIncidentSearch'), {
      target: { value: 'new query' },
    });

    expect(screen.getByTestId('escalationModalAddToIncident')).toBeDisabled();
  });

  it('shows an error callout with a retry button when isError is true', () => {
    const onRetry = jest.fn();
    renderForm({ isError: true, incidents: [], onRetry });

    expect(screen.getByTestId('escalationModalLoadError')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('disables the radio for a non-owner escalation', () => {
    renderForm({ incidents: [nonOwnerIncident] });

    const radio = document.getElementById('incident-esc-3') as HTMLInputElement;
    expect(radio).toBeDisabled();
  });

  it('ignores clicks on a non-owner escalation row', () => {
    renderForm({ incidents: [nonOwnerIncident] });

    fireEvent.click(screen.getByTestId('escalationModalIncident-esc-3'));

    expect(screen.getByTestId('escalationModalAddToIncident')).toBeDisabled();
  });
});
