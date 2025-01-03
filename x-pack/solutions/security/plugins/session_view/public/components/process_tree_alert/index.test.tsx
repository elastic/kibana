/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  mockAlerts,
  mockFileAlert,
  mockNetworkAlert,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeAlertDeps, ProcessTreeAlert } from '.';

const mockAlert = mockAlerts[0];
const TEST_ID = `sessionView:sessionViewAlertDetail-${mockAlert.kibana?.alert?.uuid}`;
const ALERT_RULE_NAME = mockAlert.kibana?.alert?.rule?.name;
const ALERT_STATUS = mockAlert.kibana?.alert?.workflow_status;
const EXPAND_BUTTON_TEST_ID = `sessionView:sessionViewAlertDetailExpand-${mockAlert.kibana?.alert?.uuid}`;

describe('ProcessTreeAlerts component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const props: ProcessTreeAlertDeps = {
    alert: mockAlert,
    isInvestigated: false,
    isSelected: false,
    onClick: jest.fn(),
    selectAlert: jest.fn(),
    onShowAlertDetails: jest.fn(),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeAlert is mounted', () => {
    it('should render alert row correctly', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlert {...props} />);

      expect(renderResult.queryByTestId(TEST_ID)).toBeTruthy();
      expect(renderResult.queryByText(ALERT_RULE_NAME!)).toBeTruthy();
      expect(renderResult.queryByText(ALERT_STATUS!)).toBeTruthy();

      expect(renderResult.container).toMatchSnapshot();
    });

    it('should execute onClick callback', async () => {
      const onClick = jest.fn();
      renderResult = mockedContext.render(<ProcessTreeAlert {...props} onClick={onClick} />);

      const alertRow = renderResult.queryByTestId(TEST_ID);
      expect(alertRow).toBeTruthy();
      alertRow?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should automatically call selectAlert when isInvestigated is true', async () => {
      const selectAlert = jest.fn();
      renderResult = mockedContext.render(
        <ProcessTreeAlert {...props} selectAlert={selectAlert} isInvestigated />
      );

      expect(selectAlert).toHaveBeenCalledTimes(1);
    });

    it('should get alert rule name text content when alert category is process', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlert {...props} />);
      const alertText = renderResult.queryByTestId(
        `sessionView:sessionViewAlertDetailRuleName-${mockAlert.kibana?.alert?.uuid}-text`
      );

      const categoryDetailPanel = renderResult.queryByTestId(
        `sessionView:sessionViewAlertDetail-${mockFileAlert.kibana?.alert?.uuid}-text`
      );

      expect(alertText).toBeTruthy();
      expect(alertText).toHaveTextContent('cmd test alert');
      expect(categoryDetailPanel).toBeNull();
    });

    it('should get file path for  text content when alert category is file', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlert {...props} alert={mockFileAlert} />);
      const fileAlertText = renderResult.queryByTestId(
        `sessionView:sessionViewAlertDetail-${mockFileAlert.kibana?.alert?.uuid}-text`
      );
      expect(fileAlertText).toBeTruthy();
      expect(fileAlertText).toHaveTextContent('/home/jon/new_file.txt');
    });

    it('should get network display text for  text content when alert category is network', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlert {...props} alert={mockNetworkAlert} />);

      const networkAlertText = renderResult.queryByTestId(
        `sessionView:sessionViewAlertDetail-${mockNetworkAlert.kibana?.alert?.uuid}-text`
      );
      expect(networkAlertText).toBeTruthy();

      expect(networkAlertText).toHaveTextContent(
        `${mockNetworkAlert?.destination?.address}:${mockNetworkAlert?.destination?.port}`
      );
    });

    it('should execute onShowAlertDetails callback when clicking on expand button', async () => {
      const onShowAlertDetails = jest.fn();
      renderResult = mockedContext.render(
        <ProcessTreeAlert {...props} onShowAlertDetails={onShowAlertDetails} />
      );

      const expandButton = renderResult.queryByTestId(EXPAND_BUTTON_TEST_ID);
      expect(expandButton).toBeTruthy();
      expandButton?.click();
      expect(onShowAlertDetails).toHaveBeenCalledTimes(1);
    });
  });
});
