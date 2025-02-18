/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { ExceptionsListCard } from '.';
import { useListDetailsView } from '../../hooks';
import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { TestProviders } from '../../../common/mock';

jest.mock('../../hooks');
jest.mock('../../hooks/use_exceptions_list.card');

const getMockUseExceptionsListCard = () => ({
  listId: 'my-list',
  listName: 'Exception list',
  listType: 'detection',
  createdAt: '2023-02-01T10:20:30.000Z',
  createdBy: 'elastic',
  exceptions: [{ ...getExceptionListItemSchemaMock() }],
  pagination: { pageIndex: 0, pageSize: 5, totalItemCount: 1 },
  ruleReferences: {
    'my-list': {
      name: 'Exception list',
      id: '345',
      referenced_rules: [],
      listId: 'my-list',
    },
  },
  toggleAccordion: false,
  openAccordionId: '123',
  menuActionItems: [
    {
      key: 'Export',
      icon: 'exportAction',
      label: 'Export',
      onClick: jest.fn(),
    },
  ],
  listRulesCount: '5',
  listDescription: 'My exception list description',
  exceptionItemsCount: jest.fn(),
  onEditExceptionItem: jest.fn(),
  onDeleteException: jest.fn(),
  onPaginationChange: jest.fn(),
  setToggleAccordion: jest.fn(),
  exceptionViewerStatus: '',
  showAddExceptionFlyout: false,
  showEditExceptionFlyout: false,
  exceptionToEdit: undefined,
  onAddExceptionClick: jest.fn(),
  handleConfirmExceptionFlyout: jest.fn(),
  handleCancelExceptionItemFlyout: jest.fn(),
  goToExceptionDetail: jest.fn(),
  emptyViewerTitle: 'Empty View',
  emptyViewerBody: 'This is the empty view description.',
  emptyViewerButtonText: 'Take action',
  handleCancelExpiredExceptionsModal: jest.fn(),
  handleConfirmExpiredExceptionsModal: jest.fn(),
  showIncludeExpiredExceptionsModal: false,
});
const getMockUseListDetailsView = () => ({
  linkedRules: [],
  showManageRulesFlyout: false,
  showManageButtonLoader: false,
  disableManageButton: false,
  onManageRules: jest.fn(),
  onSaveManageRules: jest.fn(),
  onCancelManageRules: jest.fn(),
  onRuleSelectionChange: jest.fn(),
});

describe('ExceptionsListCard', () => {
  beforeEach(() => {
    (useExceptionsListCard as jest.Mock).mockReturnValue(getMockUseExceptionsListCard());
    (useListDetailsView as jest.Mock).mockReturnValue(getMockUseListDetailsView());
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display expired exception confirmation modal when "showIncludeExpiredExceptionsModal" is "true"', () => {
    (useExceptionsListCard as jest.Mock).mockReturnValue({
      ...getMockUseExceptionsListCard(),
      showIncludeExpiredExceptionsModal: true,
    });

    const wrapper = render(
      <TestProviders>
        <ExceptionsListCard
          exceptionsList={{ ...getExceptionListSchemaMock(), rules: [] }}
          handleDelete={jest.fn()}
          handleExport={jest.fn()}
          handleDuplicate={jest.fn()}
          readOnly={false}
        />
      </TestProviders>
    );
    expect(wrapper.getByTestId('includeExpiredExceptionsConfirmationModal')).toBeTruthy();
  });
});
