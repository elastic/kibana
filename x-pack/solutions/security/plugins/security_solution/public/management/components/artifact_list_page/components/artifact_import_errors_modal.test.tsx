/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ArtifactListPageProps } from '../artifact_list_page';
import userEvent from '@testing-library/user-event';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../common/mock/endpoint';
import type { ArtifactImportErrorsModalProps } from './artifact_import_errors_modal';
import { ArtifactImportErrorsModal } from './artifact_import_errors_modal';

describe('When the flyout is opened in the ArtifactListPage component', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let props: ArtifactImportErrorsModalProps;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    props = {
      errors: [],
      onClose: jest.fn(),
    };

    render = async () => {
      renderResult = mockedContext.render(
        <ArtifactImportErrorsModal {...props} data-test-subj="testModal" />
      );
      return renderResult;
    };
  });

  it('should display `Close` button', async () => {
    await render();

    expect(renderResult.getByTestId('testModal')).toBeInTheDocument();
  });

  it('should call `onClose` when the `Close` button is clicked', async () => {
    await render();

    await userEvent.click(renderResult.getByTestId('testModal-closeButton'));

    expect(props.onClose).toHaveBeenCalled();
  });

  it('should display the list of errors with item ids and messages', async () => {
    props.errors = [
      {
        item_id: 'item1',
        error: { message: 'Error message 1', status_code: 403 },
      },
      {
        item_id: 'item2',
        error: { message: 'Error message 2', status_code: 403 },
      },
    ];

    await render();

    expect(renderResult.getByText('Import errors')).toBeInTheDocument();
    expect(renderResult.getByText('item (item1):')).toBeInTheDocument();
    expect(renderResult.getByText('Error message 1')).toBeInTheDocument();
    expect(renderResult.getByText('item (item2):')).toBeInTheDocument();
    expect(renderResult.getByText('Error message 2')).toBeInTheDocument();
  });

  it('should handle the case when item_id is undefined', async () => {
    props.errors = [
      {
        error: { message: 'Error message without item_id', status_code: 403 },
      },
    ];

    await render();

    expect(renderResult.getByText('Import errors')).toBeInTheDocument();
    expect(renderResult.getByText('item (undefined):')).toBeInTheDocument();
    expect(renderResult.getByText('Error message without item_id')).toBeInTheDocument();
    expect(renderResult.getByText(/Error message /)).toBeInTheDocument();
  });

  it('should remove "EndpointArtifactError: " prefix from error messages', async () => {
    props.errors = [
      {
        item_id: 'item1',
        error: {
          message: 'EndpointArtifactError: This is an endpoint artifact error message',
          status_code: 403,
        },
      },
    ];

    await render();

    expect(renderResult.getByText('Import errors')).toBeInTheDocument();
    expect(renderResult.getByText('item (item1):')).toBeInTheDocument();
    expect(
      renderResult.getByText(/^This is an endpoint artifact error message/)
    ).toBeInTheDocument();
    expect(renderResult.queryByText(/EndpointArtifactError/)).not.toBeInTheDocument();
  });
});
