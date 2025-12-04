/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../helpers/test_helper';
import { SettingsTab } from './settings_tab';
import { useAppContext } from '../../../hooks/use_app_context';
import { useKibana } from '../../../hooks/use_kibana';
import { useKnowledgeBase, useGenAIConnectors } from '@kbn/ai-assistant/src/hooks';

jest.mock('../../../hooks/use_app_context');
jest.mock('../../../hooks/use_kibana');
jest.mock('@kbn/ai-assistant/src/hooks');

const useAppContextMock = useAppContext as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useKnowledgeBaseMock = useKnowledgeBase as jest.Mock;
const useGenAIConnectorsMock = useGenAIConnectors as jest.Mock;

describe('SettingsTab', () => {
  const getUrlForAppMock = jest.fn();
  const prependMock = jest.fn();

  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      config: { spacesEnabled: true, visibilityEnabled: true },
    });
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          getUrlForApp: getUrlForAppMock,
          capabilities: {
            advancedSettings: { save: true },
          },
        },
        notifications: {
          toasts: { addError: jest.fn(), addSuccess: jest.fn() },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
        http: {
          basePath: { prepend: prependMock },
        },
        productDocBase: undefined,
      },
    });
    useKnowledgeBaseMock.mockReturnValue({
      status: { value: { enabled: true } },
      isInstalling: false,
      isPolling: false,
      isWarmingUpModel: false,
    });
    useGenAIConnectorsMock.mockReturnValue({
      connectors: [{ id: 'test-connector', name: 'Test Connector' }],
    });

    getUrlForAppMock.mockReset();
    prependMock.mockReset();
  });

  it('should render a “Go to spaces” button with the correct href', () => {
    const expectedSpacesUrl = '/app/management/kibana/spaces';
    getUrlForAppMock.mockReturnValue(expectedSpacesUrl);

    const { getAllByTestId } = render(<SettingsTab />);
    const [firstSpacesButton] = getAllByTestId('settingsTabGoToSpacesButton');

    expect(firstSpacesButton).toHaveAttribute('href', expectedSpacesUrl);
  });

  it('should render a “Manage connectors” button with the correct href', () => {
    const expectedConnectorsUrl =
      '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors';
    prependMock.mockReturnValue(expectedConnectorsUrl);

    const { getByTestId } = render(<SettingsTab />);
    const connectorsButton = getByTestId('settingsTabGoToConnectorsButton');

    expect(connectorsButton).toHaveAttribute('href', expectedConnectorsUrl);
  });
});
