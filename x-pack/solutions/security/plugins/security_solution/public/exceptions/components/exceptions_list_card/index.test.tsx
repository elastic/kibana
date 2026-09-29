/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ExceptionsListCard } from '.';
import { useListDetailsView } from '../../hooks';
import { useExceptionsListCard } from '../../hooks/use_exceptions_list.card';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { TestProviders } from '../../../common/mock';

vi.mock('../../hooks');
vi.mock('../../hooks/use_exceptions_list.card');

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
      icon: 'upload',
      label: 'Export',
      onClick: vi.fn(),
    },
  ],
  listRulesCount: '5',
  listDescription: 'My exception list description',
  exceptionItemsCount: vi.fn(),
  onEditExceptionItem: vi.fn(),
  onDeleteException: vi.fn(),
  onPaginationChange: vi.fn(),
  setToggleAccordion: vi.fn(),
  exceptionViewerStatus: '',
  showAddExceptionFlyout: false,
  showEditExceptionFlyout: false,
  exceptionToEdit: undefined,
  onAddExceptionClick: vi.fn(),
  handleConfirmExceptionFlyout: vi.fn(),
  handleCancelExceptionItemFlyout: vi.fn(),
  goToExceptionDetail: vi.fn(),
  emptyViewerTitle: 'Empty View',
  emptyViewerBody: 'This is the empty view description.',
  emptyViewerButtonText: 'Take action',
  handleCancelExpiredExceptionsModal: vi.fn(),
  handleConfirmExpiredExceptionsModal: vi.fn(),
  showIncludeExpiredExceptionsModal: false,
});
const getMockUseListDetailsView = () => ({
  linkedRules: [],
  showManageRulesFlyout: false,
  showManageButtonLoader: false,
  disableManageButton: false,
  onManageRules: vi.fn(),
  onSaveManageRules: vi.fn(),
  onCancelManageRules: vi.fn(),
  onRuleSelectionChange: vi.fn(),
});

describe('ExceptionsListCard', () => {
  beforeEach(() => {
    (useExceptionsListCard as Mock).mockReturnValue(getMockUseExceptionsListCard());
    (useListDetailsView as Mock).mockReturnValue(getMockUseListDetailsView());
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display expired exception confirmation modal when "showIncludeExpiredExceptionsModal" is "true"', () => {
    (useExceptionsListCard as Mock).mockReturnValue({
      ...getMockUseExceptionsListCard(),
      showIncludeExpiredExceptionsModal: true,
    });

    const wrapper = render(
      <TestProviders>
        <ExceptionsListCard
          exceptionsList={{ ...getExceptionListSchemaMock(), rules: [] }}
          handleDelete={vi.fn()}
          handleExport={vi.fn()}
          handleDuplicate={vi.fn()}
          readOnly={false}
        />
      </TestProviders>
    );
    expect(wrapper.getByTestId('includeExpiredExceptionsConfirmationModal')).toBeTruthy();
  });

  describe('deleting an exception item', () => {
    const renderCardAndOpenDeleteModal = (onDeleteException: Mock) => {
      (useExceptionsListCard as Mock).mockReturnValue({
        ...getMockUseExceptionsListCard(),
        onDeleteException,
      });

      const wrapper = render(
        <TestProviders>
          <ExceptionsListCard
            exceptionsList={{ ...getExceptionListSchemaMock(), rules: [] }}
            handleDelete={vi.fn()}
            handleExport={vi.fn()}
            handleDuplicate={vi.fn()}
            readOnly={false}
          />
        </TestProviders>
      );

      fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderButtonIcon'));
      fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionItemdelete'));

      return wrapper;
    };

    it('shows the confirmation modal without deleting the item', () => {
      const onDeleteException = vi.fn();
      const wrapper = renderCardAndOpenDeleteModal(onDeleteException);

      expect(wrapper.getByTestId('exceptionItemDeleteConfirmModal')).toBeTruthy();
      expect(onDeleteException).not.toHaveBeenCalled();
    });

    it('deletes the item on confirm', () => {
      const onDeleteException = vi.fn();
      const wrapper = renderCardAndOpenDeleteModal(onDeleteException);

      fireEvent.click(wrapper.getByTestId('confirmModalConfirmButton'));

      const exceptionItem = getExceptionListItemSchemaMock();
      expect(onDeleteException).toHaveBeenCalledWith({
        id: exceptionItem.id,
        name: exceptionItem.name,
        namespaceType: exceptionItem.namespace_type,
      });
      expect(wrapper.queryByTestId('exceptionItemDeleteConfirmModal')).toBeNull();
    });

    it('does not delete the item on cancel', () => {
      const onDeleteException = vi.fn();
      const wrapper = renderCardAndOpenDeleteModal(onDeleteException);

      fireEvent.click(wrapper.getByTestId('confirmModalCancelButton'));

      expect(onDeleteException).not.toHaveBeenCalled();
      expect(wrapper.queryByTestId('exceptionItemDeleteConfirmModal')).toBeNull();
    });
  });
});
