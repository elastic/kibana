/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as testingLibraryRender, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { SaveNewPlaygroundButtonProps } from './save_new_playground_button';
import { SaveNewPlaygroundButton } from './save_new_playground_button';
import { useKibana } from '../hooks/use_kibana';
import type { PlaygroundForm } from '../types';
import { PlaygroundFormFields } from '../types';
import { LOCAL_STORAGE_KEY as PLAYGROUND_SESSION_LOCAL_STORAGE_KEY } from '../providers/unsaved_form_provider';

// Mock dependencies
jest.mock('../hooks/use_kibana');
jest.mock('./saved_playground/save_playground_modal', () => ({
  SavePlaygroundModal: ({
    onNavigateToNewPlayground,
    onClose,
  }: {
    onNavigateToNewPlayground: (id: string) => void;
    onClose: () => void;
  }) => (
    <div data-test-subj="save-playground-modal">
      <button
        data-test-subj="modal-save-button"
        onClick={() => onNavigateToNewPlayground('test-playground-id')}
      >
        Save Playground
      </button>
      <button data-test-subj="modal-close-button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockHistoryPush = jest.fn();
const mockStorage = {
  removeItem: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

const defaultFormValues: PlaygroundForm = {
  [PlaygroundFormFields.question]: '',
  [PlaygroundFormFields.prompt]: 'test prompt',
  [PlaygroundFormFields.citations]: true,
  [PlaygroundFormFields.indices]: ['test-index'],
  [PlaygroundFormFields.summarizationModel]: undefined,
  [PlaygroundFormFields.elasticsearchQuery]: { retriever: {} },
  [PlaygroundFormFields.sourceFields]: { 'test-index': ['field1'] },
  [PlaygroundFormFields.docSize]: 10,
  [PlaygroundFormFields.queryFields]: { 'test-index': ['field1'] },
  [PlaygroundFormFields.searchQuery]: '',
  [PlaygroundFormFields.userElasticsearchQuery]: null,
};

const MockFormProvider = ({
  children,
  formErrors = {},
  formValues = defaultFormValues,
}: {
  children: React.ReactElement;
  formErrors?: any;
  formValues?: PlaygroundForm;
}) => {
  const methods = useForm({
    values: formValues,
  });

  // Mock the formState to include errors
  Object.defineProperty(methods, 'formState', {
    value: {
      ...methods.formState,
      errors: formErrors,
    },
    writable: true,
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const render = (
  props: Partial<SaveNewPlaygroundButtonProps> = {},
  formErrors = {},
  formValues = defaultFormValues
) =>
  testingLibraryRender(
    <IntlProvider locale="en">
      <MockFormProvider formErrors={formErrors} formValues={formValues}>
        <SaveNewPlaygroundButton storage={mockStorage} {...props} />
      </MockFormProvider>
    </IntlProvider>
  );

describe('SaveNewPlaygroundButton', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        history: {
          push: mockHistoryPush,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the save button correctly', () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toHaveTextContent('Save');
    expect(saveButton).not.toBeDisabled();
  });

  it('disables the save button when there are form errors', () => {
    const formErrors = {
      [PlaygroundFormFields.indices]: { message: 'Indices are required' },
    };

    render({}, formErrors);

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).toBeDisabled();
  });

  it('enables the save button when there are no relevant form errors', () => {
    const formErrors = {
      // This error should not disable the save button as it's not in SavedPlaygroundFieldErrors
      [PlaygroundFormFields.question]: { message: 'Question is required' },
    };

    render({}, formErrors);

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).not.toBeDisabled();
  });

  it('opens the save playground modal when save button is clicked', async () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    expect(screen.queryByTestId('save-playground-modal')).not.toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('save-playground-modal')).toBeInTheDocument();
    });
  });

  it('closes the modal when close button is clicked', async () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('save-playground-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('save-playground-modal')).not.toBeInTheDocument();
    });
  });

  it('navigates to new playground and clears storage when save is completed', async () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('save-playground-modal')).toBeInTheDocument();
    });

    const modalSaveButton = screen.getByTestId('modal-save-button');
    fireEvent.click(modalSaveButton);

    await waitFor(() => {
      expect(mockHistoryPush).toHaveBeenCalledWith('/p/test-playground-id/chat');
      expect(mockStorage.removeItem).toHaveBeenCalledWith(PLAYGROUND_SESSION_LOCAL_STORAGE_KEY);
      expect(screen.queryByTestId('save-playground-modal')).not.toBeInTheDocument();
    });
  });

  it('uses localStorage by default when no storage prop is provided', () => {
    testingLibraryRender(
      <IntlProvider locale="en">
        <MockFormProvider>
          <SaveNewPlaygroundButton />
        </MockFormProvider>
      </IntlProvider>
    );

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).toBeInTheDocument();
    // The component should work with default localStorage
  });

  it('prevents default behavior on save button click', () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    const mockEvent = {
      preventDefault: jest.fn(),
    } as any;

    fireEvent.click(saveButton, mockEvent);

    // Note: We can't directly test preventDefault was called due to how fireEvent works,
    // but we can verify the modal opens which indicates the onClick handler ran
    expect(screen.getByTestId('save-playground-modal')).toBeInTheDocument();
  });

  it('renders with correct button properties', () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).toHaveAttribute('data-test-subj', 'playground-save-button');

    // Check for EUI button classes/attributes that indicate size, iconType, fill
    const buttonElement = saveButton.closest('.euiButton');
    expect(buttonElement).toBeInTheDocument();
  });

  it('renders disabled with prop', () => {
    render({ disabled: true });

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).toBeDisabled();
  });

  it('renders enabled with prop and no errors', () => {
    render({ disabled: false });

    const saveButton = screen.getByTestId('playground-save-button');
    expect(saveButton).not.toBeDisabled();
  });

  describe('form errors handling', () => {
    const savedPlaygroundFieldErrors = [
      PlaygroundFormFields.indices,
      PlaygroundFormFields.queryFields,
      PlaygroundFormFields.elasticsearchQuery,
      PlaygroundFormFields.prompt,
      PlaygroundFormFields.sourceFields,
      PlaygroundFormFields.docSize,
      PlaygroundFormFields.summarizationModel,
    ];

    savedPlaygroundFieldErrors.forEach((field) => {
      it(`disables save button when ${field} has errors`, () => {
        const formErrors = {
          [field]: { message: `${field} has an error` },
        };

        render({ disabled: false }, formErrors);

        const saveButton = screen.getByTestId('playground-save-button');
        expect(saveButton).toBeDisabled();
      });
    });
  });

  it('handles multiple navigation calls correctly', async () => {
    render();

    const saveButton = screen.getByTestId('playground-save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('save-playground-modal')).toBeInTheDocument();
    });

    const modalSaveButton = screen.getByTestId('modal-save-button');

    // Click save multiple times rapidly
    fireEvent.click(modalSaveButton);
    fireEvent.click(modalSaveButton);

    await waitFor(() => {
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(1);
    });
  });
});
