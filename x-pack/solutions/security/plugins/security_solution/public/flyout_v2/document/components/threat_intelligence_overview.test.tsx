/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
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
  EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../hooks/use_fetch_threat_intelligence');
jest.mock('../../../common/lib/kibana');

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
const RIGHT_SECTION_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(
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

const createMockHit = (flattened: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockOnShowThreatIntelligence = jest.fn();

const renderThreatIntelligenceOverview = ({
  hit = createMockHit(),
  showIcon = true,
  onShowThreatIntelligence = mockOnShowThreatIntelligence,
}: {
  hit?: DataTableRecord;
  showIcon?: boolean;
  onShowThreatIntelligence?: () => void;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <ThreatIntelligenceOverview
        hit={hit}
        showIcon={showIcon}
        onShowThreatIntelligence={onShowThreatIntelligence}
      />
    </IntlProvider>
  );

describe('<ThreatIntelligenceOverview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => undefined,
        },
      },
    });
  });

  it('should render wrapper component', () => {
    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show default time range badge', () => {
    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(RIGHT_SECTION_TEXT_TEST_ID)).toHaveTextContent('Time range applied');
  });

  it('should show custom time range badge', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => ({ from: 'now-7d', to: 'now-3d' }),
        },
      },
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(RIGHT_SECTION_TEXT_TEST_ID)).toHaveTextContent('Custom time range applied');
  });

  it('should render link without icon if in preview mode', () => {
    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview({ showIcon: false });
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
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
    expect(mockOnShowThreatIntelligence).toHaveBeenCalled();
  });

  it('should open the expanded section to the correct tab when the number is clicked', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();
    getByTestId(THREAT_MATCHES_BUTTON_TEST_ID).click();

    expect(mockOnShowThreatIntelligence).toHaveBeenCalled();

    getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID).click();

    expect(mockOnShowThreatIntelligence).toHaveBeenCalled();
  });
});
