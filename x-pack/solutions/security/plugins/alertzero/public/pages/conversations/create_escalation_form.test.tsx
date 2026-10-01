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
import { CreateEscalationForm, type CreateEscalationFormProps } from './create_escalation_form';

jest.mock('@kbn/user-profile-components', () => ({
  UserProfilesSelectable: ({ 'data-test-subj': testSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={testSubj ?? 'escalationModalCollaboratorPicker'} />
  ),
}));

const defaultProps: CreateEscalationFormProps = {
  investigationTitle: 'Suspicious login activity',
  suggestedCollaborators: [],
  onSearchCollaborators: jest.fn(),
  isSearchingCollaborators: false,
  onSubmit: jest.fn(),
  isSubmitting: false,
  onCancel: jest.fn(),
  currentUserUid: 'user-123',
  currentUserName: 'Alice',
};

const renderForm = (props: Partial<CreateEscalationFormProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <CreateEscalationForm {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

afterEach(() => jest.clearAllMocks());

describe('CreateEscalationForm', () => {
  it('pre-fills the title field with the investigation title', () => {
    renderForm();

    expect(screen.getByTestId('escalationModalTitleInput')).toHaveValue(
      'Suspicious login activity'
    );
  });

  it('disables the submit button when the title is cleared', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('escalationModalTitleInput'), { target: { value: '' } });

    expect(screen.getByTestId('escalationModalCreateEscalation')).toBeDisabled();
  });

  it('disables the submit button while submitting', () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByTestId('escalationModalCreateEscalation')).toBeDisabled();
  });

  it('disables submit when private mode is on but currentUserUid is empty', () => {
    renderForm({ currentUserUid: '' });

    fireEvent.click(screen.getByTestId('escalationModalVisibilitySwitch'));

    expect(screen.getByTestId('escalationModalCreateEscalation')).toBeDisabled();
  });

  it('does not show the collaborator section in public mode', () => {
    renderForm();

    expect(screen.queryByTestId('escalationModalCollaboratorPicker')).not.toBeInTheDocument();
  });

  it('shows the collaborator section when private mode is toggled on', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('escalationModalVisibilitySwitch'));

    expect(screen.getByTestId('escalationModalCollaboratorPicker')).toBeInTheDocument();
  });

  it('calls onSubmit with title, public visibility, and empty collaborators by default', () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit });

    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Suspicious login activity',
      visibility: 'public',
      collaboratorUids: [],
    });
  });

  it('calls onSubmit with private visibility and currentUserUid prepended when private', () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit, currentUserUid: 'user-abc' });

    fireEvent.click(screen.getByTestId('escalationModalVisibilitySwitch'));
    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Suspicious login activity',
      visibility: 'private',
      collaboratorUids: ['user-abc'],
    });
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderForm({ onCancel });

    fireEvent.click(screen.getByTestId('escalationModalCancel'));

    expect(onCancel).toHaveBeenCalled();
  });
});
