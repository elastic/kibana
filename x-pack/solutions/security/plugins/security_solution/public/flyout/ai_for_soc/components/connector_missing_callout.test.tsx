/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ConnectorMissingCallout,
  MISSING_CONNECTOR_CALLOUT_LINK_TEST_ID,
  MISSING_CONNECTOR_CALLOUT_TEST_ID,
} from './connector_missing_callout';
import { useNavigateTo } from '@kbn/security-solution-navigation';

const mockedUseKibana = {
  services: {
    featureFlags: {
      getBooleanValue: jest.fn().mockReturnValue(false),
    },
  },
};

jest.mock('@kbn/security-solution-navigation');
jest.mock('../../../common/lib/kibana', () => {
  return {
    ...jest.requireActual('../../../common/lib/kibana'),
    useKibana: () => mockedUseKibana,
  };
});

describe('ConnectorMissingCallout', () => {
  it('should render component', () => {
    (useNavigateTo as jest.Mock).mockReturnValue({
      navigateTo: jest.fn(),
    });

    const { getByTestId } = render(<ConnectorMissingCallout canSeeAdvancedSettings={true} />);

    expect(getByTestId(MISSING_CONNECTOR_CALLOUT_TEST_ID)).toHaveTextContent('Missing connector');
    expect(getByTestId(MISSING_CONNECTOR_CALLOUT_TEST_ID)).toHaveTextContent(
      'Your default AI connector is invalid and may have been deleted. You may update the default AI connector via'
    );
    expect(getByTestId(MISSING_CONNECTOR_CALLOUT_LINK_TEST_ID)).toHaveTextContent(
      'Security Solution advanced settings'
    );
  });

  it('should call navigateTo when clicking on link', () => {
    const navigateTo = jest.fn();
    (useNavigateTo as jest.Mock).mockReturnValue({
      navigateTo,
    });

    const { getByTestId } = render(<ConnectorMissingCallout canSeeAdvancedSettings={true} />);

    getByTestId(MISSING_CONNECTOR_CALLOUT_LINK_TEST_ID).click();

    expect(navigateTo).toHaveBeenCalledWith({
      appId: 'management',
      path: '/kibana/settings?query=defaultAIConnector',
    });
  });

  it('should call navigateTo genAiSettings when clicking on link and useNewDefaultConnector is true', () => {
    const navigateTo = jest.fn();
    (useNavigateTo as jest.Mock).mockReturnValue({
      navigateTo,
    });
    mockedUseKibana.services.featureFlags.getBooleanValue.mockReturnValue(true);

    const { getByTestId } = render(<ConnectorMissingCallout canSeeAdvancedSettings={true} />);

    getByTestId(MISSING_CONNECTOR_CALLOUT_LINK_TEST_ID).click();

    expect(navigateTo).toHaveBeenCalledWith({
      appId: 'management',
      path: '/ai/genAiSettings',
    });
  });

  it('should show different text when user cannot see advanced settings', () => {
    (useNavigateTo as jest.Mock).mockReturnValue({
      navigateTo: jest.fn(),
    });

    const { getByTestId } = render(<ConnectorMissingCallout canSeeAdvancedSettings={false} />);

    expect(getByTestId(MISSING_CONNECTOR_CALLOUT_TEST_ID)).toHaveTextContent(
      'Your default AI connector is invalid and may have been deleted.'
    );
  });
});
