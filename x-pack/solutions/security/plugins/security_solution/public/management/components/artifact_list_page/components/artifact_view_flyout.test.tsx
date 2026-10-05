/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import { ExceptionsListItemGenerator } from '../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { TrustedAppsApiClient } from '../../../pages/trusted_apps/service/api_client';
import { useGetArtifact as _useGetArtifact } from '../../../hooks/artifacts';
import { ArtifactViewFlyout, type ArtifactViewFlyoutProps } from './artifact_view_flyout';

jest.mock('../../../hooks/artifacts', () => ({
  useGetArtifact: jest.fn(),
}));

const useGetArtifactMock = _useGetArtifact as jest.Mock;

describe('ArtifactViewFlyout', () => {
  const generator = new ExceptionsListItemGenerator('seed');

  let mockedContext: AppContextTestRender;
  let render: (
    props?: Partial<ArtifactViewFlyoutProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onClose: jest.Mock;
  let item: ExceptionListItemSchema;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedContext.history.push('somepage?show=view&itemId=item-1');
    onClose = jest.fn();
    item = generator.generate({
      name: 'Signature one',
      description: 'Detects a thing',
      os_types: ['windows', 'linux', 'macos'],
      updated_by: 'jane.doe',
      updated_at: '2025-12-05T12:00:00.000Z',
    });
    useGetArtifactMock.mockReturnValue({ data: item, error: null });

    render = (props) => {
      renderResult = mockedContext.render(
        <ArtifactViewFlyout
          apiClient={new TrustedAppsApiClient(mockedContext.coreStart.http)}
          onClose={onClose}
          data-test-subj="viewFlyout"
          {...props}
        />
      );
      return renderResult;
    };
  });

  it('shows the artifact name, last updated date, operating systems, and description', () => {
    render();

    expect(renderResult.getByTestId('viewFlyout-title')).toHaveTextContent('Signature one');
    expect(renderResult.getByTestId('viewFlyout-lastUpdated')).toHaveTextContent(
      /Last updated: Dec 5, 2025 @ 12:00:00/
    );
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-windows')).toHaveTextContent('Windows');
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-linux')).toHaveTextContent('Linux');
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-macos')).toHaveTextContent('Mac');
    expect(renderResult.getByTestId('viewFlyout-infoBlock')).toHaveTextContent('Updated by');
    expect(renderResult.getByTestId('viewFlyout-updatedByAvatar')).toBeInTheDocument();
    expect(renderResult.getByTestId('viewFlyout-description')).toHaveTextContent('Detects a thing');
    expect(renderResult.getByTestId('viewFlyout-definitionTitle')).toHaveTextContent('Definition');
  });

  it('shows a dash when the artifact has no description', () => {
    item.description = '   ';
    useGetArtifactMock.mockReturnValue({ data: item, error: null });

    render();

    expect(renderResult.getByTestId('viewFlyout-description')).toHaveTextContent('-');
  });

  it('shows a loader while the artifact is being retrieved', () => {
    useGetArtifactMock.mockReturnValue({ data: undefined, error: null });

    render();

    expect(renderResult.getByTestId('viewFlyout-loader')).toBeInTheDocument();
    expect(renderResult.queryByTestId('viewFlyout-title')).not.toBeInTheDocument();
  });

  it('closes and warns when the artifact cannot be retrieved', () => {
    useGetArtifactMock.mockReturnValue({
      data: undefined,
      error: { message: 'nope', body: { message: 'missing' } },
    });

    render();

    expect(onClose).toHaveBeenCalled();
    expect(mockedContext.coreStart.notifications.toasts.addWarning).toHaveBeenCalledWith(
      'Failed to retrieve artifact. Reason: missing'
    );
  });
});
