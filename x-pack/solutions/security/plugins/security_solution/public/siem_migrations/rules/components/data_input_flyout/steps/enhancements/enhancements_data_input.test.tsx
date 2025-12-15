/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { EnhancementsDataInput } from './enhancements_data_input';
import { QradarDataInputStep } from '../constants';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { useEnhanceRules } from '../../../../service/hooks/use_enhance_rules';
import { MigrationSource, type MigrationStepProps } from '../../../../../common/types';
import * as useAppToastsModule from '../../../../../../common/hooks/use_app_toasts';

jest.mock('../../../../service/hooks/use_enhance_rules');

jest.mock('../../../../../../common/hooks/use_app_toasts');

const useAppToastsMock = jest.spyOn(useAppToastsModule, 'useAppToasts');

const mockEnhanceRules = jest.fn();

describe('EnhancementsDataInput', () => {
  const addErrorMock = jest.fn();
  const defaultProps: MigrationStepProps = {
    dataInputStep: QradarDataInputStep.Enhancements,
    migrationStats: getRuleMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    migrationSource: MigrationSource.QRADAR,
    setDataInputStep: jest.fn(),
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAppToastsMock.mockReturnValue({
      addError: addErrorMock,
    });

    (useEnhanceRules as jest.Mock).mockReturnValue({
      enhanceRules: mockEnhanceRules,
      isLoading: false,
      error: null,
    });
  });

  it('renders step number', () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(getByTestId('enhancementsStepNumber')).toBeInTheDocument();
    expect(getByTestId('enhancementsStepNumber')).toHaveTextContent('2');
  });

  it('renders title', () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(getByTestId('enhancementsTitle')).toBeInTheDocument();
    expect(getByTestId('enhancementsTitle')).toHaveTextContent('Add enhancements');
  });

  it('renders content when step is current and migrationStats is provided', () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(getByTestId('enhancementTypeSelect')).toBeInTheDocument();
    expect(getByTestId('enhancementFilePicker')).toBeInTheDocument();
    expect(getByTestId('addEnhancementButton')).toBeInTheDocument();
  });

  it('does not render content when step is not current', () => {
    const { queryByTestId } = render(
      <EnhancementsDataInput {...defaultProps} dataInputStep={QradarDataInputStep.Rules} />
    );

    expect(queryByTestId('enhancementTypeSelect')).not.toBeInTheDocument();
    expect(queryByTestId('enhancementFilePicker')).not.toBeInTheDocument();
    expect(queryByTestId('addEnhancementButton')).not.toBeInTheDocument();
  });

  it('does not render content when migrationStats is undefined', () => {
    const { queryByTestId } = render(
      <EnhancementsDataInput {...defaultProps} migrationStats={undefined} />
    );

    expect(queryByTestId('enhancementTypeSelect')).not.toBeInTheDocument();
    expect(queryByTestId('enhancementFilePicker')).not.toBeInTheDocument();
    expect(queryByTestId('addEnhancementButton')).not.toBeInTheDocument();
  });

  it('disables Add button when no file is selected', () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(getByTestId('addEnhancementButton')).toBeDisabled();
  });

  it('enables Add button when a valid JSON file is selected', async () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    const validJsonContent = JSON.stringify({
      'Test Rule': {
        id: '1',
        mapping: {
          TA0001: {
            enabled: true,
            name: 'Initial Access',
            techniques: {},
          },
        },
      },
    });
    const file = new File([validJsonContent], 'mitre_mappings.json', {
      type: 'application/json',
    });

    const filePicker = getByTestId('enhancementFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(getByTestId('addEnhancementButton')).not.toBeDisabled();
    });
  });

  it('shows error and keeps Add button disabled for invalid JSON file', async () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    const invalidJsonContent = 'not valid json {{{';
    const file = new File([invalidJsonContent], 'invalid.json', {
      type: 'application/json',
    });

    const filePicker = getByTestId('enhancementFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(getByTestId('addEnhancementButton')).toBeDisabled();
    });
  });

  it('calls enhanceRules when Add button is clicked', async () => {
    mockEnhanceRules.mockResolvedValue(true);

    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    const validJsonContent = JSON.stringify({
      'Test Rule': {
        id: '1',
        mapping: {
          TA0001: {
            enabled: true,
            name: 'Initial Access',
            techniques: {},
          },
        },
      },
    });
    const file = new File([validJsonContent], 'mitre_mappings.json', {
      type: 'application/json',
    });

    const filePicker = getByTestId('enhancementFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(getByTestId('addEnhancementButton')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(getByTestId('addEnhancementButton'));
    });

    expect(mockEnhanceRules).toHaveBeenCalledWith({
      migrationId: defaultProps?.migrationStats?.id,
      body: {
        vendor: 'qradar',
        type: 'mitre',
        data: JSON.parse(validJsonContent),
      },
    });
  });

  it('adds enhancement to list after successful upload', async () => {
    mockEnhanceRules.mockResolvedValue(true);

    const { getByTestId, getByText } = render(<EnhancementsDataInput {...defaultProps} />);

    const validJsonContent = JSON.stringify({
      'Test Rule': {
        id: '1',
        mapping: {},
      },
    });
    const file = new File([validJsonContent], 'my_mitre_export.json', {
      type: 'application/json',
    });

    const filePicker = getByTestId('enhancementFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(getByTestId('addEnhancementButton')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(getByTestId('addEnhancementButton'));
    });

    await waitFor(() => {
      expect(getByText('MITRE ATT&CK Mappings - my_mitre_export.json')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no enhancements added', () => {
    const { getByText } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(
      getByText(
        'No enhancements added yet. You can also start translations without any enhancements'
      )
    ).toBeInTheDocument();
  });

  it('disables controls when loading', () => {
    (useEnhanceRules as jest.Mock).mockReturnValue({
      enhanceRules: mockEnhanceRules,
      isLoading: true,
      error: null,
    });

    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    expect(getByTestId('enhancementTypeSelect')).toBeDisabled();
  });

  it('should raise error toast if JSON parsing fails', async () => {
    const { getByTestId } = render(<EnhancementsDataInput {...defaultProps} />);

    const invalidJsonContent = 'not valid json {{{';
    const file = new File([invalidJsonContent], 'invalid.json', {
      type: 'application/json',
    });

    const filePicker = getByTestId('enhancementFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(expect.any(SyntaxError), {
        title: 'Invalid JSON file',
      });
    });
  });
});
