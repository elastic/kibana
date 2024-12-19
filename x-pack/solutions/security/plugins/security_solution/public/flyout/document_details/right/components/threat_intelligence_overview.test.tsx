/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { useDocumentDetailsContext } from '../../shared/context';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import {
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
  SUMMARY_ROW_TEXT_TEST_ID,
} from './test_ids';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

jest.mock('../../shared/context');
jest.mock('../hooks/use_fetch_threat_intelligence');

const mockNavigateToLeftPanel = jest.fn();
jest.mock('../../shared/hooks/use_navigate_to_left_panel');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const LOADING_TEST_ID = EXPANDABLE_PANEL_LOADING_TEST_ID(INSIGHTS_THREAT_INTELLIGENCE_TEST_ID);
const THREAT_MATCHES_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID
);
const THREAT_MATCHES_BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID
);
const ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID
);
const ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID
);

const dataFormattedForFieldBrowser = ['scopeId'];

const renderThreatIntelligenceOverview = () =>
  render(
    <IntlProvider locale="en">
      <ThreatIntelligenceOverview />
    </IntlProvider>
  );

describe('<ThreatIntelligenceOverview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser,
      isPreviewMode: false,
    });
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue({
      navigateToLeftPanel: mockNavigateToLeftPanel,
      isEnabled: true,
    });
  });

  it('should render wrapper component', () => {
    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render link without icon if in preview mode', () => {
    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser,
      isPreviewMode: true,
    });
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue({
      navigateToLeftPanel: mockNavigateToLeftPanel,
      isEnabled: true,
    });
    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
  });

  it('should not render link if navigation is not enabled', () => {
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue({
      navigateToLeftPanel: mockNavigateToLeftPanel,
      isEnabled: false,
    });

    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();

    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT_TEST_ID)).toBeInTheDocument();
  });

  it('should render 1 match detected and 1 field enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(THREAT_MATCHES_TEXT_TEST_ID)).toHaveTextContent('Threat match detected');
    expect(getByTestId(THREAT_MATCHES_BUTTON_TEST_ID)).toHaveTextContent('1');
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID)).toHaveTextContent(
      'Field enriched with threat intelligence'
    );
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID)).toHaveTextContent('1');
  });

  it('should render 2 matches detected and 2 fields enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(THREAT_MATCHES_TEXT_TEST_ID)).toHaveTextContent('Threat matches detected');
    expect(getByTestId(THREAT_MATCHES_BUTTON_TEST_ID)).toHaveTextContent('2');
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID)).toHaveTextContent(
      'Fields enriched with threat intelligence'
    );
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID)).toHaveTextContent('2');
  });

  it('should render loading', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });
    const { getByTestId } = renderThreatIntelligenceOverview();

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });

  it('should open the expanded section to the correct tab when the number is clicked', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();
    getByTestId(THREAT_MATCHES_BUTTON_TEST_ID).click();

    expect(mockNavigateToLeftPanel).toHaveBeenCalled();

    getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID).click();

    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });
});
