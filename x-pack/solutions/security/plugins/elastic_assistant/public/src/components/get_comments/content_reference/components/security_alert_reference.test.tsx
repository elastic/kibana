/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecurityAlertReference } from './security_alert_reference';
import { useKibana } from '../../../../context/typed_kibana_context/typed_kibana_context';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import type { SecurityAlertContentReference } from '@kbn/elastic-assistant-common';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { URL_PARAM_KEY } from '../../../../hooks/navigate_to_alerts_page_with_filters/constants';
import { SECURITY_ALERT_REFERENCE_LABEL } from './translations';
import { encode } from '@kbn/rison';
import { getDetectionEngineUrl } from './link_to/redirect_to_detection_engine';

// Mocks
jest.mock('@kbn/elastic-assistant');
jest.mock('../../../../context/typed_kibana_context/typed_kibana_context');

const mockNavigateToApp = jest.fn();
const mockUseKibana = useKibana as jest.Mock;
const mockUseAssistantContext = useAssistantContext as jest.Mock;

const defaultProps = {
  contentReferenceNode: {
    type: 'contentReference',
    contentReferenceId: 'alert-ref-1',
    contentReferenceCount: 2,
    contentReferenceBlock: '{reference(1)}',
    contentReference: {
      alertId: 'alert-123',
    },
  } as unknown as ResolvedContentReferenceNode<SecurityAlertContentReference>,
};

describe('SecurityAlertReference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: true },
    });
  });

  it('renders PopoverReference and EuiLink with correct label', () => {
    render(<SecurityAlertReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    const link = screen.getByTestId('alertReferenceLink');
    expect(link).toBeInTheDocument();
    expect(screen.getByText(SECURITY_ALERT_REFERENCE_LABEL)).toBeInTheDocument();
  });

  it('calls navigateToApp with securitySolutionUI when hasSearchAILakeConfigurations is true', () => {
    render(<SecurityAlertReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('alertReferenceLink'));
    const kqlAppQuery = encode({
      language: 'kuery',
      query: `_id: alert-123`,
    });

    const urlParams = new URLSearchParams({
      [URL_PARAM_KEY.appQuery]: kqlAppQuery,
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.alertSummary,
      path: getDetectionEngineUrl(urlParams.toString()),
      openInNewTab: true,
    });
  });

  it('calls navigateToApp with security when hasSearchAILakeConfigurations is false', () => {
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: false },
    });
    render(<SecurityAlertReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('alertReferenceLink'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('security', {
      path: `alerts/redirect/alert-123`,
      openInNewTab: true,
    });
  });
});
