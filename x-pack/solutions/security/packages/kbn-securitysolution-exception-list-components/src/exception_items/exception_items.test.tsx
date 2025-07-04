/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiThemeProvider, Pagination } from '@elastic/eui';
import { getExceptionListItemSchemaMock } from '../mocks/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionItems } from '.';

import { ViewerStatus } from '../types';
import { fireEvent, render } from '@testing-library/react';
import { ruleReferences } from '../mocks/rule_references.mock';
import { mockGetFormattedComments } from '../mocks/comments.mock';
import { securityLinkAnchorComponentMock } from '../mocks/security_link_component.mock';
import { MockedShowValueListModal } from '../mocks/value_list_modal.mock';

const onCreateExceptionListItem = jest.fn();
const onDeleteException = jest.fn();
const onEditExceptionItem = jest.fn();
const onPaginationChange = jest.fn();

const pagination = { pageIndex: 0, pageSize: 0, totalItemCount: 0 };

describe('ExceptionsViewerItems', () => {
  describe('Viewing EmptyViewerState', () => {
    it('it should render empty prompt if "viewerStatus" is "empty"', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={ViewerStatus.EMPTY}
          exceptions={[]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('emptyViewerState')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });

    it('it should render no search results found prompt if "viewerStatus" is "empty_search"', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={ViewerStatus.EMPTY_SEARCH}
          exceptions={[]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          lastUpdated={Date.now()}
          isReadOnly={false}
          pagination={pagination}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('emptySearchViewerState')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });
  });
  describe('Exception Items and Pagination', () => {
    it('it should render exceptions if exception array is not empty', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeInTheDocument();
      expect(wrapper.getByTestId('exceptionItemCard')).toBeInTheDocument();
      expect(wrapper.getAllByTestId('exceptionItemCard')).toHaveLength(1);
    });
    it('it should render pagination section', () => {
      const exceptions = [
        getExceptionListItemSchemaMock(),
        { ...getExceptionListItemSchemaMock(), id: '2' },
      ];
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={exceptions}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          isReadOnly={false}
          pagination={{ pageIndex: 0, pageSize: 2, totalItemCount: exceptions.length }}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeTruthy();
      expect(wrapper.getAllByTestId('exceptionItemCard')).toHaveLength(2);
      expect(wrapper.getByTestId('pagination')).toBeInTheDocument();
    });
  });

  describe('securityLinkAnchorComponent, formattedDateComponent, exceptionsUtilityComponent and getFormattedComments', () => {
    it('it should render sent securityLinkAnchorComponent', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={securityLinkAnchorComponentMock}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />,
        { wrapper: EuiThemeProvider }
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeInTheDocument();
      fireEvent.click(wrapper.getByTestId('exceptionItemCardMetaInfoEmptyButton'));
      expect(wrapper.getByTestId('securityLinkAnchorComponent')).toBeInTheDocument();
    });
    it('it should render sent exceptionsUtilityComponent', () => {
      const exceptionsUtilityComponent = ({
        pagination: utilityPagination,
        lastUpdated,
      }: {
        pagination: Pagination;
        lastUpdated: string;
      }) => (
        <div data-test-subj="exceptionsUtilityComponent">
          <span data-test-subj="lastUpdateTestUtility">{lastUpdated}</span>
          <span data-test-subj="paginationTestUtility">{utilityPagination.pageIndex}</span>
        </div>
      );
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated="1666003695578"
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={exceptionsUtilityComponent}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeInTheDocument();
      expect(wrapper.getByTestId('exceptionsUtilityComponent')).toBeInTheDocument();
      expect(wrapper.getByTestId('lastUpdateTestUtility')).toHaveTextContent('1666003695578');
      expect(wrapper.getByTestId('paginationTestUtility')).toHaveTextContent('0');
    });
    it('it should render sent formattedDateComponent', () => {
      const formattedDateComponent = ({
        fieldName,
        value,
      }: {
        fieldName: string;
        value: string;
      }) => (
        <div data-test-subj="formattedDateComponent">
          <span data-test-subj="fieldNameTestFormatted">{fieldName}</span>
          <span data-test-subj="valueTestFormatted">{value}</span>
        </div>
      );
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={formattedDateComponent}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeInTheDocument();
      expect(wrapper.getAllByTestId('formattedDateComponent')).toHaveLength(2);
      expect(wrapper.getAllByTestId('fieldNameTestFormatted')[0]).toHaveTextContent('created_at');
      expect(wrapper.getAllByTestId('fieldNameTestFormatted')[1]).toHaveTextContent('updated_at');
      expect(wrapper.getAllByTestId('valueTestFormatted')[0]).toHaveTextContent(
        '2020-04-20T15:25:31.830Z'
      );
      expect(wrapper.getAllByTestId('valueTestFormatted')[0]).toHaveTextContent(
        '2020-04-20T15:25:31.830Z'
      );
    });
    it('it should use getFormattedComments to extract comments', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={mockGetFormattedComments}
          showValueListModal={MockedShowValueListModal}
        />
      );
      expect(wrapper.getByTestId('exceptionsContainer')).toBeInTheDocument();
      expect(wrapper.getByTestId('exceptionsItemCommentAccordion')).toBeInTheDocument();
    });
  });
});
