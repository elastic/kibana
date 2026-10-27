/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListsDetailView } from '.';
import { useListDetailsView } from '../../hooks';

jest.mock('../../hooks', () => ({ useListDetailsView: jest.fn() }));
jest.mock('@kbn/app-header', () => ({
  AppHeaderLoading: () => <div data-test-subj="appHeaderLoading" />,
}));
jest.mock('../../components/list_details_app_header', () => ({
  ListDetailsAppHeader: ({ name }: { name: string }) => (
    <div data-test-subj="listDetailsAppHeader">{name}</div>
  ),
  ListDetailsFallbackAppHeader: () => <div data-test-subj="listDetailsFallbackAppHeader" />,
}));
jest.mock('../../components', () => ({
  ListWithSearch: () => <div data-test-subj="listWithSearch" />,
  ManageRules: () => <div data-test-subj="manageRules" />,
}));
jest.mock('@kbn/securitysolution-exception-list-components', () => ({
  ...jest.requireActual('@kbn/securitysolution-exception-list-components'),
  EmptyViewerState: () => <div data-test-subj="emptyViewerState" />,
}));
jest.mock('../../../app/404', () => ({
  NotFoundPage: () => <div data-test-subj="notFoundPage" />,
}));
jest.mock('../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../common/components/reference_error_modal', () => ({
  ReferenceErrorModal: () => null,
}));
jest.mock('../../../common/components/auto_download/auto_download', () => ({
  AutoDownload: () => null,
}));
jest.mock('../../../detections/components/callouts/missing_detections_privileges_callout', () => ({
  MissingDetectionsPrivilegesCallOut: () => <div data-test-subj="missingPrivilegesCallout" />,
}));

const list = { id: 'so-id', list_id: 'list-1', name: 'My list' } as ExceptionListSchema;

const readyState = {
  isLoading: false,
  invalidListId: false,
  isReadOnly: false,
  list,
  canUserEditList: true,
  listId: 'list-1',
  linkedRules: [],
  viewerStatus: '',
  listName: 'My list',
  listDescription: 'My description',
  referenceModalState: { contentText: '', rulesReferences: [] },
};

const renderPage = (hookState: Record<string, unknown>) => {
  (useListDetailsView as jest.Mock).mockReturnValue({ ...readyState, ...hookState });
  return render(
    <MemoryRouter initialEntries={['/details/list-1']}>
      <Route path="/details/:detailName">
        <ListsDetailView />
      </Route>
    </MemoryRouter>
  );
};

describe('ListsDetailView', () => {
  it('renders the loading header while the list loads', () => {
    renderPage({ isLoading: true });

    expect(screen.getByTestId('appHeaderLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('listDetailsAppHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listDetailsFallbackAppHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notFoundPage')).not.toBeInTheDocument();
  });

  it('renders the fallback header and the error state when the request fails', () => {
    renderPage({ viewerStatus: ViewerStatus.ERROR, isLoading: false });

    expect(screen.getByTestId('listDetailsFallbackAppHeader')).toBeInTheDocument();
    expect(screen.getByTestId('emptyViewerState')).toBeInTheDocument();
    expect(screen.queryByTestId('listDetailsAppHeader')).not.toBeInTheDocument();
  });

  it.each([
    ['the list id is invalid', { invalidListId: true }],
    ['the list is missing', { list: undefined }],
    ['the list has no name', { listName: '' }],
  ])('renders the fallback header and not found page when %s', (_, hookState) => {
    renderPage(hookState);

    expect(screen.getByTestId('listDetailsFallbackAppHeader')).toBeInTheDocument();
    expect(screen.getByTestId('notFoundPage')).toBeInTheDocument();
    expect(screen.queryByTestId('listDetailsAppHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('missingPrivilegesCallout')).not.toBeInTheDocument();
  });

  it('renders the list header, then the privileges callout and the list when ready', () => {
    const { container } = renderPage({});

    const renderedOrder = Array.from(container.querySelectorAll('[data-test-subj]')).map(
      (element) => element.getAttribute('data-test-subj')
    );

    expect(screen.getByTestId('listDetailsAppHeader')).toHaveTextContent('My list');
    expect(renderedOrder).toEqual([
      'listDetailsAppHeader',
      'missingPrivilegesCallout',
      'listWithSearch',
    ]);
    expect(screen.queryByTestId('listDetailsFallbackAppHeader')).not.toBeInTheDocument();
  });

  it('shows the error state rather than the loading header when both apply', () => {
    renderPage({ viewerStatus: ViewerStatus.ERROR, isLoading: true });

    expect(screen.getByTestId('emptyViewerState')).toBeInTheDocument();
    expect(screen.queryByTestId('appHeaderLoading')).not.toBeInTheDocument();
  });
});
