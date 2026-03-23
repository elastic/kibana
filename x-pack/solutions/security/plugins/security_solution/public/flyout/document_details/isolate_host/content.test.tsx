/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer, endpointAlertDataMock } from '../../../common/mock/endpoint';
import { FLYOUT_HOST_ISOLATION_PANEL_TEST_ID } from './test_ids';
import { IsolateHostPanelContent } from './content';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../common';

jest.mock('../../../common/experimental_features_service');

describe('<IsolateHostPanelContent />', () => {
  let appContextMock: AppContextTestRender;

  beforeEach(() => {
    jest.clearAllMocks();

    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue(allowedExperimentalValues);

    appContextMock = createAppRootMockRenderer();
  });

  it('should display content with success banner when action is isolateHost', () => {
    const { getByTestId } = appContextMock.render(
      <IsolateHostPanelContent
        isIsolateActionSuccessBannerVisible={true}
        hostName="some-host-name"
        alertId="some-alert-id"
        isolateAction="isolateHost"
        dataFormattedForFieldBrowser={endpointAlertDataMock.generateEndpointAlertDetailsItemData()}
        showAlertDetails={() => {}}
        handleIsolationActionSuccess={() => {}}
      />
    );
    expect(getByTestId(FLYOUT_HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('hostIsolateSuccessMessage')).toBeInTheDocument();
  });

  it('should display content without success banner when action is isolateHost and success banner is not visible', () => {
    const { getByTestId, queryByTestId } = appContextMock.render(
      <IsolateHostPanelContent
        isIsolateActionSuccessBannerVisible={false}
        hostName="some-host-name"
        alertId="some-alert-id"
        isolateAction="isolateHost"
        dataFormattedForFieldBrowser={endpointAlertDataMock.generateEndpointAlertDetailsItemData()}
        showAlertDetails={() => {}}
        handleIsolationActionSuccess={() => {}}
      />
    );
    expect(getByTestId(FLYOUT_HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId('hostIsolateSuccessMessage')).not.toBeInTheDocument();
  });

  it('should display content with success banner when action is unisolateHost', () => {
    const { getByTestId } = appContextMock.render(
      <IsolateHostPanelContent
        isIsolateActionSuccessBannerVisible={true}
        hostName="some-host-name"
        alertId="some-alert-id"
        isolateAction="unisolateHost"
        dataFormattedForFieldBrowser={endpointAlertDataMock.generateEndpointAlertDetailsItemData()}
        showAlertDetails={() => {}}
        handleIsolationActionSuccess={() => {}}
      />
    );
    expect(getByTestId(FLYOUT_HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('hostUnisolateSuccessMessage')).toBeInTheDocument();
  });

  it('should display content without success banner when action is unisolateHost', () => {
    const { getByTestId, queryByTestId } = appContextMock.render(
      <IsolateHostPanelContent
        isIsolateActionSuccessBannerVisible={false}
        hostName="some-host-name"
        alertId="some-alert-id"
        isolateAction="unisolateHost"
        dataFormattedForFieldBrowser={endpointAlertDataMock.generateEndpointAlertDetailsItemData()}
        showAlertDetails={() => {}}
        handleIsolationActionSuccess={() => {}}
      />
    );
    expect(getByTestId(FLYOUT_HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId('hostUnisolateSuccessMessage')).not.toBeInTheDocument();
  });
});
