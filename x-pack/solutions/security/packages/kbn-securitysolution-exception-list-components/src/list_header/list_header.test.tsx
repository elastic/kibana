/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ExceptionListHeader } from '.';
import * as i18n from '../translations';
import { securityLinkAnchorComponentMock } from '../mocks/security_link_component.mock';

import { useExceptionListHeader as useExceptionListHeaderMock } from './use_list_header';
const onEditListDetails = vi.fn();
const onExportList = vi.fn();
const onDeleteList = vi.fn();
const onManageRules = vi.fn();
const onNavigate = vi.fn();
const onDuplicateList = vi.fn();
vi.mock('./use_list_header');

describe('ExceptionListHeader', () => {
  beforeAll(() => {
    (useExceptionListHeaderMock as Mock).mockReturnValue({
      isModalVisible: false,
      listDetails: { name: 'List Name', description: '' },
      onSave: vi.fn(),
      onCancel: vi.fn(),
    });
  });

  it('should render the List Header with name, default description and enabled actions because of the ReadOnly mode', () => {
    const wrapper = render(
      <ExceptionListHeader
        listId="List_Id"
        name="List Name"
        isReadonly
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        onDuplicateList={onDuplicateList}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsMenuActionsItems'));
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsButtonIcon')).toBeEnabled();
    expect(wrapper.getByTestId('DescriptionText')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_DESCRIPTION
    );
    expect(wrapper.queryByTestId('EditTitleIcon')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('ListID')).toHaveTextContent(
      `${i18n.EXCEPTION_LIST_HEADER_LIST_ID}:List_Id`
    );
    expect(wrapper.getByTestId('Breadcrumb')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_BREADCRUMB
    );
  });

  it('should render the List Header with name, default description and disabled actions because user can not edit details', () => {
    const wrapper = render(
      <ExceptionListHeader
        listId="List_Id"
        name="List Name"
        isReadonly={false}
        canUserEditList={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        onDuplicateList={onDuplicateList}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );

    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsButtonIcon')).toBeEnabled();
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsMenuActionsButtonIcon'));

    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsActionItem1')).toBeEnabled();
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsActionItem2')).toBeDisabled();
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsActionItem3')).toBeDisabled();
    expect(wrapper.queryByTestId('EditTitleIcon')).not.toBeInTheDocument();
  });

  it('should render the List Header with name, default description and  actions', () => {
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        onDuplicateList={onDuplicateList}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsContainer'));

    expect(wrapper.getByTestId('DescriptionText')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_DESCRIPTION
    );
    expect(wrapper.queryByTestId('TitleEditIcon')).toBeInTheDocument();
    expect(wrapper.queryByTestId('DescriptionEditIcon')).toBeInTheDocument();
  });

  it('should render edit modal', () => {
    (useExceptionListHeaderMock as Mock).mockReturnValue({
      isModalVisible: true,
      listDetails: { name: 'List Name', description: 'List description' },
      onSave: vi.fn(),
      onCancel: vi.fn(),
    });
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        description="List description"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        onDuplicateList={onDuplicateList}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );

    expect(wrapper.getByTestId('EditModal')).toBeInTheDocument();
  });

  it('should go back the page path when back button is clicked', () => {
    (useExceptionListHeaderMock as Mock).mockReturnValue({
      isModalVisible: true,
      listDetails: { name: 'List Name', description: 'List description' },
      onSave: vi.fn(),
      onCancel: vi.fn(),
    });
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        description="List description"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        onDuplicateList={onDuplicateList}
        backOptions={{ pageId: '', path: 'test-path', onNavigate }}
      />
    );
    fireEvent.click(wrapper.getByTestId('Breadcrumb'));
    expect(onNavigate).toHaveBeenCalledWith('test-path');
  });
});
