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

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ coreStart } = mockedContext);

    mockedTrustedAppApi = trustedAppsAllHttpMocks(coreStart.http);

    props = {
      labels: artifactListPageLabels,
      apiClient: new TrustedAppsApiClient(coreStart.http),
      onCancel: jest.fn(),
      onSuccess: jest.fn(),
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

    await ui.uploadFile();

    expect(ui.getImportButton()).toBeEnabled();
  });

  it('should call the import API when `Import` button is clicked', async () => {
    await render();

    await ui.uploadFile();
    await userEvent.click(ui.getImportButton());

    expect(mockedTrustedAppApi.responseProvider.trustedAppImportList).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2023-10-31',
        query: { overwrite: false } as HttpFetchOptionsWithPath['query'],
      })
    );
  });

  it('should disable `Import` button while the import is in progress', async () => {
    const deferrable = getDeferred();
    mockedTrustedAppApi.responseProvider.trustedAppImportList.mockDelay.mockReturnValue(
      deferrable.promise
    );

    await render();

    await ui.uploadFile();
    await userEvent.click(ui.getImportButton());

    expect(ui.getImportButton()).toBeDisabled();
  });

  it('should show a success toast and call `onSuccess` after a successful import', async () => {
    await render();

    await ui.uploadFile();
    await userEvent.click(ui.getImportButton());

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Artifact list imported successfully'
    );
    expect(props.onSuccess).toHaveBeenCalled();
  });

  it('should show an error toast if the import API fails', async () => {
    mockedTrustedAppApi.responseProvider.trustedAppImportList.mockImplementation(() => {
      throw new Error('Import failed');
    });

    await render();

    await ui.uploadFile();
    await userEvent.click(ui.getImportButton());

    expect(coreStart.notifications.toasts.addError).toHaveBeenCalledWith(
      expect.objectContaining(new Error('Import failed')),
      { title: 'Artifact list import failed' }
    );
  });
});
