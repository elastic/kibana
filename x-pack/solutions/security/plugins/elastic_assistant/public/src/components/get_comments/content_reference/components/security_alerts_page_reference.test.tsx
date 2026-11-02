/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SecurityAlertsPageReference } from './security_alerts_page_reference';
import { useKibana } from '../../../../context/typed_kibana_context/typed_kibana_context';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useNavigateToAlertsPageWithFilters } from '../../../../hooks/navigate_to_alerts_page_with_filters/use_navigate_to_alerts_page_with_filters';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { URL_PARAM_KEY } from '../../../../hooks/navigate_to_alerts_page_with_filters/constants';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';
import { encode } from '@kbn/rison';
import { getDetectionEngineUrl } from './link_to/redirect_to_detection_engine';
import {
  ALERTS_PAGE_FILTER_ACKNOWLEDGED,
  ALERTS_PAGE_FILTER_OPEN,
} from '../../../../common/constants';

// Mocks
jest.mock('@kbn/elastic-assistant');
jest.mock('../../../../context/typed_kibana_context/typed_kibana_context');
jest.mock(
  '../../../../hooks/navigate_to_alerts_page_with_filters/use_navigate_to_alerts_page_with_filters'
);

const mockNavigateToApp = jest.fn();
const mockOpenAlertsPageWithFilters = jest.fn();
const mockUseKibana = useKibana as jest.Mock;
const mockUseAssistantContext = useAssistantContext as jest.Mock;
const mockUseNavigateToAlertsPageWithFilters = useNavigateToAlertsPageWithFilters as jest.Mock;

const defaultProps = {
  contentReferenceNode: {
    type: 'contentReference',
    contentReferenceId: 'alerts-page-ref-1',
    contentReferenceCount: 2,
    contentReferenceBlock: '{reference(1)}',
    contentReference: {},
  } as unknown as ResolvedContentReferenceNode<SecurityAlertsPageContentReference>,
};

describe('SecurityAlertsPageReference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: true },
    });
    mockUseNavigateToAlertsPageWithFilters.mockReturnValue(mockOpenAlertsPageWithFilters);
  });

  it('renders PopoverReference and EuiLink with correct label', () => {
    render(<SecurityAlertsPageReference {...defaultProps} />);
    // Open the popover to reveal the link
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    const link = screen.getByTestId('alertsReferenceLink');
    expect(link).toBeInTheDocument();
    expect(screen.getByText(SECURITY_ALERTS_PAGE_REFERENCE_LABEL)).toBeInTheDocument();
  });

  it('calls navigateToApp with correct params when hasSearchAILakeConfigurations is true', () => {
    render(<SecurityAlertsPageReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('alertsReferenceLink'));

    const kqlAppQuery = encode({
      language: 'kuery',
      query: `kibana.alert.workflow_status: ${ALERTS_PAGE_FILTER_OPEN} OR kibana.alert.workflow_status: ${ALERTS_PAGE_FILTER_ACKNOWLEDGED}`,
    });
    const urlParams = new URLSearchParams({
      [URL_PARAM_KEY.appQuery]: kqlAppQuery,
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.alertSummary,
      path: getDetectionEngineUrl(urlParams.toString()),
      openInNewTab: true,
    });
    expect(mockOpenAlertsPageWithFilters).not.toHaveBeenCalled();
  });

  it('calls openAlertsPageWithFilters when hasSearchAILakeConfigurations is false', () => {
    mockUseAssistantContext.mockReturnValue({
      assistantAvailability: { hasSearchAILakeConfigurations: false },
    });
    render(<SecurityAlertsPageReference {...defaultProps} />);
    fireEvent.click(screen.getByTestId('ContentReferenceButton'));
    fireEvent.click(screen.getByTestId('alertsReferenceLink'));
    expect(mockOpenAlertsPageWithFilters).toHaveBeenCalledWith(
      {
        selected_options: [ALERTS_PAGE_FILTER_OPEN, ALERTS_PAGE_FILTER_ACKNOWLEDGED],
        field_name: 'kibana.alert.workflow_status',
        persist: false,
      },
      true,
      '(global:(timerange:(fromStr:now-24h,kind:relative,toStr:now)))'
    );
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});
