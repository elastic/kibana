/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  SUMMARY_ROW_TEXT_TEST_ID,
  SUMMARY_ROW_LOADING_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
} from './test_ids';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useDocumentDetailsContext } from '../../shared/context';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../shared/context');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_ancestry');

const mockOpenLeftPanel = jest.fn();
const documentId = 'documentId';
const indices = ['indices'];
const scopeId = 'scopeId';
const eventId = 'eventId';
const indexName = 'indexName';

const TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID);
const BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID);
const LOADING_TEST_ID = SUMMARY_ROW_LOADING_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID
);

const renderRelatedAlertsByAncestry = () =>
  render(
    <IntlProvider locale="en">
      <RelatedAlertsByAncestry documentId={documentId} indices={indices} scopeId={scopeId} />
    </IntlProvider>
  );

describe('<RelatedAlertsByAncestry />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      eventId,
      indexName,
      scopeId,
      isPreviewMode: false,
    });
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
  });

  it('should render single related alert correctly', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Alert related by ancestry');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('1');
  });

  it('should render multiple related alerts correctly', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 2,
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Alerts related by ancestry');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('2');
  });

  it('should render loading skeleton', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if error', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { container } = renderRelatedAlertsByAncestry();
    expect(container).toBeEmptyDOMElement();
  });

  it('should open the expanded section to the correct tab when the number is clicked', () => {
    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId } = renderRelatedAlertsByAncestry();
    getByTestId(BUTTON_TEST_ID).click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: CORRELATIONS_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });
});
