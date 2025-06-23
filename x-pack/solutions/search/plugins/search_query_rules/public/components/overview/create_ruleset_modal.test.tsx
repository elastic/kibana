/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CreateRulesetModal } from './create_ruleset_modal';
import { useFetchQueryRulesetExist } from '../../hooks/use_fetch_ruleset_exists';
import { useKibana } from '../../hooks/use_kibana';

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return <I18nProvider>{children}</I18nProvider>;
};

const TEST_IDS = {
  ModalHeaderTitle: 'searchRulesetCreateRulesetModalHeader',
  NameInput: 'searchRulesetCreateRulesetModalFieldText',
  CreateButton: 'searchRulesetCreateRulesetModalCreateButton',
  CloseButton: 'searchRulesetCreateRulesetModalCancelButton',
  EditLink: 'searchRulesetCreateRulesetModalEditLink',
};

const ACTIONS = {
  PressCloseButton: () => {
    act(() => {
      fireEvent.click(screen.getByTestId(TEST_IDS.CloseButton));
    });
  },
  TypeName: (name: string) => {
    const nameInput = screen.getByTestId(TEST_IDS.NameInput) as HTMLInputElement;
    act(() => {
      fireEvent.change(nameInput, { target: { value: name } });
    });
  },
  PressEditLink: () => {
    act(() => {
      fireEvent.click(screen.getByTestId(TEST_IDS.EditLink));
    });
  },
};

const mockOnClose = jest.fn();

const mockUseFetchQueryRulesetExist = useFetchQueryRulesetExist as jest.Mock;
jest.mock('../../hooks/use_fetch_ruleset_exists', () => ({
  useFetchQueryRulesetExist: jest.fn().mockImplementation(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => path,
        },
      },
      application: {
        navigateToUrl: jest.fn(),
      },
    },
  }),
}));

describe('CreateRulesetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders', () => {
    render(<CreateRulesetModal onClose={mockOnClose} />, { wrapper: Wrapper });

    expect(screen.getByTestId(TEST_IDS.ModalHeaderTitle).textContent).toBe('Create ruleset');

    expect(screen.getByTestId(TEST_IDS.NameInput)).toBeInTheDocument();

    expect(screen.getByTestId(TEST_IDS.CreateButton).textContent).toBe('Create ruleset');
  });

  it('calls onClose when modal is closed', () => {
    render(<CreateRulesetModal onClose={mockOnClose} />, { wrapper: Wrapper });

    ACTIONS.PressCloseButton();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show conflict error when ruleset name already exists', () => {
    mockUseFetchQueryRulesetExist.mockReturnValue({
      data: { exists: true },
      isLoading: false,
      isError: false,
    });
    render(<CreateRulesetModal onClose={mockOnClose} />, { wrapper: Wrapper });

    ACTIONS.TypeName('existing-ruleset');
    act(() => {
      mockUseFetchQueryRulesetExist.mock.calls[0][2]('existing-ruleset');
    });

    waitFor(() => {
      expect(screen.getByText('Ruleset name already exists')).toBeInTheDocument();
    });
    waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.CreateButton)).toBeDisabled();
    });
    waitFor(() => {
      expect(screen.getByTestId(TEST_IDS.EditLink)).toHaveAttribute(
        'href',
        '/app/search_query_rules/ruleset/existing-ruleset/edit'
      );
    });

    ACTIONS.PressEditLink();
    waitFor(() => {
      expect(useKibana().services.application.navigateToUrl).toHaveBeenCalledWith(
        '/app/search_query_rules/ruleset/existing-ruleset/edit'
      );
    });
  });

  it('should redirect user to create endpoint with given name', () => {
    const mockNavigateToUrl = jest.fn();
    useKibana().services.application.navigateToUrl = mockNavigateToUrl;

    render(<CreateRulesetModal onClose={mockOnClose} />, { wrapper: Wrapper });

    ACTIONS.TypeName('new-ruleset');
    act(() => {
      mockUseFetchQueryRulesetExist.mock.calls[0][1]('new-ruleset');
    });

    waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        '/app/search_query_rules/ruleset/new-ruleset/create'
      );
    });
  });
});
