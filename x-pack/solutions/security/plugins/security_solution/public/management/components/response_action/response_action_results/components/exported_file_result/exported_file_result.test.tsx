/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { RESPONSE_ACTIONS_ZIP_PASSCODE } from '../../../../../../../common/endpoint/service/response_actions/constants';
import { responseActionsHttpMocks } from '../../../../../mocks/response_actions_http_mocks';
import { FILE_PASSCODE_INFO_MESSAGE } from '../response_action_file_download_link/response_action_file_download_link';
import { ExportedFileResult, type ExportedFileResultProps } from './exported_file_result';

describe('When using the `ExportedFileResult` component', () => {
  let appTestContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let renderProps: ExportedFileResultProps;
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(appTestContext.coreStart.http);
    renderProps = {
      exported: new EndpointActionGenerator('seed').generateExportedOutput({
        path: 'action-1/upload.zip',
      }),
      agentType: 'endpoint',
      'data-test-subj': 'test',
    };
    render = () => appTestContext.render(<ExportedFileResult {...renderProps} />);
  });

  it('should show where the file was uploaded to', () => {
    const { getByTestId } = render();

    expect(getByTestId('test')).toHaveTextContent('File was uploaded to external storage:');
    expect(getByTestId('test-provider')).toHaveTextContent('azure-1');
    expect(getByTestId('test-type')).toHaveTextContent('Azure Blob Storage');
    expect(getByTestId('test-account')).toHaveTextContent('acct');
    expect(getByTestId('test-container')).toHaveTextContent('response-actions');
    expect(getByTestId('test-path')).toHaveTextContent('action-1/upload.zip');
    expect(getByTestId('test-copyPathButton')).toHaveAttribute(
      'aria-label',
      'Copy path to clipboard'
    );
  });

  it.each(['some_new_storage', '__proto__', 'constructor'])(
    'should show the storage type `%s` it does not know as is',
    (service) => {
      renderProps.exported.service = service;
      const { getByTestId } = render();

      expect(getByTestId('test-type').textContent).toBe(service);
    }
  );

  it('should show the file name when it is provided', () => {
    renderProps.fileName = 'memory-dump.zip';
    const { getByTestId } = render();

    expect(getByTestId('test-fileName')).toHaveTextContent('memory-dump.zip');
  });

  it('should not show a file name row when no file name is provided', () => {
    const { queryByTestId } = render();

    expect(queryByTestId('test-fileName')).toBeNull();
  });

  it.each(['endpoint', 'sentinel_one'] as const)(
    'should show the zip passcode for agent type `%s`',
    (agentType) => {
      renderProps.agentType = agentType;
      const { getByTestId } = render();

      expect(getByTestId('test-passcodeMessage')).toHaveTextContent(
        FILE_PASSCODE_INFO_MESSAGE(RESPONSE_ACTIONS_ZIP_PASSCODE[agentType])
      );
    }
  );

  it('should not show a download link nor request the file info', () => {
    const { queryByText } = render();

    expect(queryByText('Click here to download')).toBeNull();
    expect(apiMocks.responseProvider.fileInfo).not.toHaveBeenCalled();
  });
});
