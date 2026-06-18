/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { AddToNewCase } from './add_to_new_case';
import { useEntityCasePermissions } from '../hooks/use_case_permission';
import { TestProvidersComponent } from '../../../../threat_intelligence/mocks/test_providers';
import type { EntityToAttach } from '..';

jest.mock('../../../../common/lib/kibana');
jest.mock('../hooks/use_case_permission');

const mockUseEntityCasePermissions = useEntityCasePermissions as jest.Mock;

const ENTITY: EntityToAttach = {
  id: 'entity-store-id-abc',
  name: 'alice',
  type: 'user',
};

describe('AddToNewCase', () => {
  const mockOpen = jest.fn();
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityCasePermissions.mockReturnValue({ canAddToNewCase: true });
    mockUseKibana().services.cases.hooks.useCasesAddToNewCaseFlyout = jest
      .fn()
      .mockReturnValue({ open: mockOpen });
  });

  it('renders the menu item with the correct label', () => {
    render(
      <TestProvidersComponent>
        <AddToNewCase entity={ENTITY} onClick={mockOnClick} />
      </TestProvidersComponent>
    );

    expect(screen.getByText('Add to new case')).toBeInTheDocument();
  });

  it('is enabled when the user has create and createComment permissions', () => {
    render(
      <TestProvidersComponent>
        <AddToNewCase entity={ENTITY} onClick={mockOnClick} />
      </TestProvidersComponent>
    );

    expect(screen.getByRole('button', { name: /add to new case/i })).not.toBeDisabled();
  });

  it('is disabled when canAddToNewCase is false', () => {
    mockUseEntityCasePermissions.mockReturnValue({ canAddToNewCase: false });

    render(
      <TestProvidersComponent>
        <AddToNewCase entity={ENTITY} onClick={mockOnClick} />
      </TestProvidersComponent>
    );

    expect(screen.getByRole('button', { name: /add to new case/i })).toBeDisabled();
  });

  it('is disabled when entityName is empty', () => {
    render(
      <TestProvidersComponent>
        <AddToNewCase entity={{ ...ENTITY, name: '' }} onClick={mockOnClick} />
      </TestProvidersComponent>
    );

    expect(screen.getByRole('button', { name: /add to new case/i })).toBeDisabled();
  });

  it('calls onClick and opens the new-case flyout on click', () => {
    render(
      <TestProvidersComponent>
        <AddToNewCase entity={ENTITY} onClick={mockOnClick} />
      </TestProvidersComponent>
    );

    fireEvent.click(screen.getByRole('button', { name: /add to new case/i }));

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            type: 'security.entity',
            metadata: expect.objectContaining({
              entityName: 'alice',
              entityType: 'user',
            }),
          }),
        ]),
      })
    );
  });

  it('forwards a data-test-subj to the menu item', () => {
    render(
      <TestProvidersComponent>
        <AddToNewCase entity={ENTITY} onClick={mockOnClick} data-test-subj="my-add-to-new-case" />
      </TestProvidersComponent>
    );

    expect(screen.getByTestId('my-add-to-new-case')).toBeInTheDocument();
  });
});
