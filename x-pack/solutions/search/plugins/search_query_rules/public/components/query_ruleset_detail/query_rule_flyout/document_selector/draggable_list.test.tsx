/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryRulesQueryRuleType } from '@elastic/elasticsearch/lib/api/types';
import { OnDragEndResponder } from '@hello-pangea/dnd';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { FieldArrayWithId } from 'react-hook-form';
import { QueryRuleEditorForm } from '../../../../../common/types';
import { DraggableList } from './draggable_list';

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <I18nProvider>{children}</I18nProvider>
  </QueryClientProvider>
);

jest.mock('../../../../hooks/use_fetch_document', () => ({
  useFetchDocument: jest.fn().mockReturnValue({
    isLoading: false,
    isError: false,
    data: null,
    refetch: jest.fn(),
  }),
}));

const TEST_IDS = {
  DraggableItemDocs: (
    index: number,
    doc: FieldArrayWithId<QueryRuleEditorForm, 'actions.docs', 'id'> | string
  ) => {
    return `queryRuleDocumentDraggable-${typeof doc === 'string' ? 'id' : 'doc'}-${
      typeof doc === 'string' ? doc : doc._id
    }-${index}`;
  },
};

describe('DraggableList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render items in docs mode', () => {
    const actionFields = [
      {
        _id: 'doc-1',
        _index: 'index-1',
      },
      {
        _id: 'doc-2',
        _index: 'index-2',
      },
    ] as Array<FieldArrayWithId<QueryRuleEditorForm, 'actions.docs', 'id'>>;
    const actionIdsFields = [] as string[];
    const pinType = 'pinned' as QueryRulesQueryRuleType;
    const isIdRule = false;
    const indexNames = [] as string[];
    const onDeleteDocument = jest.fn() as (index: number) => void;
    const onIndexSelectorChange = jest.fn() as (index: number, indexName: string) => void;
    const onIdSelectorChange = jest.fn() as (index: number, id: string) => void;
    const dragEndHandle = jest.fn() as OnDragEndResponder<string>;

    render(
      <DraggableList
        actionFields={actionFields}
        actionIdsFields={actionIdsFields}
        pinType={pinType}
        isIdRule={isIdRule}
        indexNames={indexNames}
        onDeleteDocument={onDeleteDocument}
        onIndexSelectorChange={onIndexSelectorChange}
        onIdSelectorChange={onIdSelectorChange}
        dragEndHandle={dragEndHandle}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId(TEST_IDS.DraggableItemDocs(0, actionFields[0]))).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.DraggableItemDocs(1, actionFields[1]))).toBeInTheDocument();
  });

  it('should render items in ids mode', () => {
    const actionFields = [] as Array<FieldArrayWithId<QueryRuleEditorForm, 'actions.docs', 'id'>>;
    const actionIdsFields = ['id-1', 'id-2'];
    const pinType = 'pinned' as QueryRulesQueryRuleType;
    const isIdRule = true;
    const indexNames = [] as string[];
    const onDeleteDocument = jest.fn() as (index: number) => void;
    const onIndexSelectorChange = jest.fn() as (index: number, indexName: string) => void;
    const onIdSelectorChange = jest.fn() as (index: number, id: string) => void;
    const dragEndHandle = jest.fn() as OnDragEndResponder<string>;

    render(
      <DraggableList
        actionFields={actionFields}
        actionIdsFields={actionIdsFields}
        pinType={pinType}
        isIdRule={isIdRule}
        indexNames={indexNames}
        onDeleteDocument={onDeleteDocument}
        onIndexSelectorChange={onIndexSelectorChange}
        onIdSelectorChange={onIdSelectorChange}
        dragEndHandle={dragEndHandle}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId(TEST_IDS.DraggableItemDocs(0, 'id-1'))).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.DraggableItemDocs(1, 'id-2'))).toBeInTheDocument();
  });
});
