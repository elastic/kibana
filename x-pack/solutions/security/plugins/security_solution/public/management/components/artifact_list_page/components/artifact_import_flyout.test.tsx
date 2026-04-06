/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ArtifactListPageProps } from '../artifact_list_page';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpFetchOptionsWithPath } from '@kbn/core/public';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../common/mock/endpoint';
import { trustedAppsAllHttpMocks } from '../../../mocks';
import { getDeferred } from '../../../mocks/utils';
import { TrustedAppsApiClient } from '../../../pages/trusted_apps/service';
import type { ArtifactImportFlyoutProps } from './artifact_import_flyout';
import { ArtifactImportFlyout } from './artifact_import_flyout';
import { artifactListPageLabels } from '../translations';
import { getArtifactImportFlyoutUiMocks } from '../mocks';

describe('When the flyout is opened in the ArtifactListPage component', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let coreStart: AppContextTestRender['coreStart'];
  let mockedTrustedAppApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let props: ArtifactImportFlyoutProps;
  let ui: ReturnType<typeof getArtifactImportFlyoutUiMocks>;
  let currentListId: string;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ coreStart } = mockedContext);

    mockedTrustedAppApi = trustedAppsAllHttpMocks(coreStart.http);

    const apiClient = new TrustedAppsApiClient(coreStart.http);
    currentListId = apiClient.listId;

    props = {
      labels: artifactListPageLabels,
      apiClient,
      onCancel: jest.fn(),
      onSuccess: jest.fn(),
      onShowErrors: jest.fn(),
    };

    render = async () => {
      renderResult = mockedContext.render(
        <ArtifactImportFlyout {...props} data-test-subj="testFlyout" />
      );
      ui = getArtifactImportFlyoutUiMocks(renderResult, 'testFlyout');

      await waitFor(async () => expect(renderResult.getByTestId('testFlyout')).toBeInTheDocument());

      return renderResult;
    };
  });

  it('should display `Cancel` button enabled', async () => {
    await render();

    expect(ui.getCancelButton()).toBeEnabled();
  });

  it('should call onCancel when `Cancel` button is clicked', async () => {
    await render();

    await userEvent.click(ui.getCancelButton());

    expect(props.onCancel).toHaveBeenCalled();
  });

  it('should display `Import` button disabled', async () => {
    await render();

    expect(ui.getImportButton()).toBeDisabled();
  });

  it('should enable `Import` button when a file is selected', async () => {
    await render();

    await ui.uploadFile([currentListId]);

    expect(ui.getImportButton()).toBeEnabled();
  });

  it('should show a confirmation modal when `Import` button is clicked', async () => {
    await render();

    await ui.uploadFile([currentListId]);
    await userEvent.click(ui.getImportButton());

    expect(ui.queryConfirmModal()).toBeInTheDocument();
  });

  it("should close the confirmation modal but keep the flyout open when the modal's cancel button is clicked", async () => {
    await render();

    await ui.uploadFile([currentListId]);
    await userEvent.click(ui.getImportButton());
    await userEvent.click(ui.getConfirmModalCancelButton());

    expect(ui.queryConfirmModal()).not.toBeInTheDocument();
    expect(ui.queryImportFlyout()).toBeInTheDocument();
  });

  it('should call the import API when the modal is confirmed', async () => {
    await render();

    await ui.uploadFile([currentListId]);
    await userEvent.click(ui.getImportButton());
    await userEvent.click(ui.getConfirmModalConfirmButton());

    expect(mockedTrustedAppApi.responseProvider.trustedAppImportList).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2023-10-31',
        query: { overwrite: false, as_new_list: false } as HttpFetchOptionsWithPath['query'],
      })
    );
  });

  it('should disable `Import` button on the modal and the flyout while the import is in progress', async () => {
    const deferrable = getDeferred();
    mockedTrustedAppApi.responseProvider.trustedAppImportList.mockDelay.mockReturnValue(
      deferrable.promise
    );

    await render();

    await ui.uploadFile([currentListId]);
    await userEvent.click(ui.getImportButton());
    await userEvent.click(ui.getConfirmModalConfirmButton());

    await waitFor(() => {
      expect(ui.getImportButton()).toBeDisabled();
      expect(ui.getConfirmModalConfirmButton()).toBeDisabled();
    });
  });

  describe('when handling server response', () => {
    const LIST_CONFLICT_ERROR = {
      error: {
        status_code: 409,
        message:
          'Found that list_id: "endpoint_list" already exists. Import of list_id: "endpoint_list" skipped.',
      },
      list_id: 'endpoint_list',
    };

    const ITEM_CONFLICT_ERROR = {
      error: {
        status_code: 409,
        message:
          'Found that item_id: "0d82595f-f79d-48c8-8522-7715e1640884" already exists. Import of item_id: "0d82595f-f79d-48c8-8522-7715e1640884" skipped.',
      },
      list_id: 'endpoint_list',
      item_id: '0d82595f-f79d-48c8-8522-7715e1640884',
    };

    const ITEM_ENDPOINT_ARTIFACT_ERROR = {
      error: {
        status_code: 403,
        message:
          "EndpointArtifactError: This artifact can't be imported because it belongs to a space you don't have access to. Update the artifact in its original space and try again.",
      },
      list_id: 'endpoint_list',
      item_id: '1a0200db-3dd7-46f4-bb4d-f23904559c32',
    };

    it('should show a success toast and call `onSuccess` after a successful import', async () => {
      await render();

      await ui.uploadFile([currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Artifacts imported',
        text: 'All artifacts were imported successfully.',
        toastLifeTimeMs: 60_000,
      });
      expect(props.onSuccess).toHaveBeenCalled();
    });

    it('should not care about list conflict in response', async () => {
      mockedTrustedAppApi.responseProvider.trustedAppImportList.mockImplementation(() => ({
        errors: [LIST_CONFLICT_ERROR],
        success: false,
        success_count: 2,
        success_exception_lists: false,
        success_count_exception_lists: 0,
        success_exception_list_items: true,
        success_count_exception_list_items: 2,
      }));

      await render();

      await ui.uploadFile([currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Artifacts imported',
        text: 'All artifacts were imported successfully.',
        toastLifeTimeMs: 60_000,
      });
      expect(props.onSuccess).toHaveBeenCalled();
    });

    it('should show a warning toast when some of the items were not imported', async () => {
      mockedTrustedAppApi.responseProvider.trustedAppImportList.mockImplementation(() => ({
        errors: [LIST_CONFLICT_ERROR, ITEM_CONFLICT_ERROR, ITEM_ENDPOINT_ARTIFACT_ERROR],
        success: false,
        success_count: 3,
        success_exception_lists: false,
        success_count_exception_lists: 0,
        success_exception_list_items: false,
        success_count_exception_list_items: 3, // there are some successful imports
      }));

      await render();

      await ui.uploadFile([currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: 'Import completed with errors',
        toastLifeTimeMs: 60_000,
        text: expect.any(Function),
      });
      expect(props.onSuccess).toHaveBeenCalled();
    });

    it('should show a danger toast when none of the items were imported', async () => {
      mockedTrustedAppApi.responseProvider.trustedAppImportList.mockImplementation(() => ({
        errors: [LIST_CONFLICT_ERROR, ITEM_CONFLICT_ERROR, ITEM_ENDPOINT_ARTIFACT_ERROR],
        success: false,
        success_count: 3,
        success_exception_lists: false,
        success_count_exception_lists: 0,
        success_exception_list_items: false,
        success_count_exception_list_items: 0, // there are no successful imports
      }));

      await render();

      await ui.uploadFile([currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: "Artifacts weren't imported",
        toastLifeTimeMs: 60_000,
        text: expect.any(Function),
      });
      expect(props.onSuccess).toHaveBeenCalled();
    });

    it('should show an danger toast and close the modal if another list is being imported', async () => {
      await render();

      await ui.uploadFile(['some-other-list-id']);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: artifactListPageLabels.pageImportErrorToastTitle,
        text: artifactListPageLabels.pageImportOnlyCurrentArtifactCanBeImportedError,
      });
      expect(ui.queryConfirmModal()).not.toBeInTheDocument();
    });

    it('should show an error toast if not only the current artifact type is included in the import file', async () => {
      await render();

      await ui.uploadFile(['some-other-list-id', currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: artifactListPageLabels.pageImportErrorToastTitle,
        text: artifactListPageLabels.pageImportOnlyCurrentArtifactCanBeImportedError,
      });
      expect(ui.queryConfirmModal()).not.toBeInTheDocument();
    });

    it('should show an error toast if the import API fails', async () => {
      mockedTrustedAppApi.responseProvider.trustedAppImportList.mockImplementation(() => {
        throw new Error('Fail message from server');
      });

      await render();

      await ui.uploadFile([currentListId]);
      await userEvent.click(ui.getImportButton());
      await userEvent.click(ui.getConfirmModalConfirmButton());

      expect(coreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        expect.objectContaining(new Error('Fail message from server')),
        {
          title: artifactListPageLabels.pageImportErrorToastTitle,
          toastMessage: 'Fail message from server',
        }
      );
      expect(ui.queryConfirmModal()).not.toBeInTheDocument();
    });
  });
});
