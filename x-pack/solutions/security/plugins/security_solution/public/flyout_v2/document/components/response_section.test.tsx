/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import {
  RESPONSE_BUTTON_TEST_ID,
  RESPONSE_SECTION_CONTENT_TEST_ID,
  RESPONSE_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { ResponseSection } from './response_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
}));
jest.mock('../../shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const PREVIEW_MESSAGE = 'Response is not available in alert preview.';
const onShowResponseDetails = jest.fn();
const mockOpenSystemFlyout = jest.fn();
const store = createStore(() => ({}));
const history = createMemoryHistory();

const createMockHit = (
  flattened: DataTableRecord['flattened'],
  raw: Partial<DataTableRecord['raw']> = {}
): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test-index', _source: {}, ...raw },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertMockHit = createMockHit({
  'event.kind': 'signal',
});

const nonAlertMockHit = createMockHit({
  'event.kind': 'event',
});

const remoteAlertMockHit = createMockHit(
  {
    'event.kind': 'signal',
  },
  { _index: 'remote-cluster:index-name' }
);

const renderResponseSection = ({
  hit = alertMockHit,
  isRulePreview = false,
  onShowResponseDetailsCallback = onShowResponseDetails,
}: {
  hit?: DataTableRecord;
  isRulePreview?: boolean;
  onShowResponseDetailsCallback?: (() => void) | null;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <Provider store={store}>
        <Router history={history}>
          <ResponseSection
            hit={hit}
            isRulePreview={isRulePreview}
            onShowResponseDetails={onShowResponseDetailsCallback ?? undefined}
          />
        </Router>
      </Provider>
    </IntlProvider>
  );

describe('<ResponseSection />', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseKibana = jest.mocked(useKibana);
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout: mockOpenSystemFlyout,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('should render response component', () => {
    const { getByTestId } = renderResponseSection();

    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toHaveTextContent('Response');
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeVisible();
  });

  it('should render response button for event kind signal', () => {
    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should call onShowResponseDetails when clicking the button', () => {
    const { getByTestId } = renderResponseSection();

    fireEvent.click(getByTestId(RESPONSE_BUTTON_TEST_ID));

    expect(onShowResponseDetails).toHaveBeenCalledTimes(1);
  });

  it('opens response details in a system flyout when callback is not provided', () => {
    const { getByTestId } = renderResponseSection({ onShowResponseDetailsCallback: null });

    fireEvent.click(getByTestId(RESPONSE_BUTTON_TEST_ID));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
        session: 'start',
      })
    );
  });

  it('uses the Discover history key when not in Security Solution', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const { getByTestId } = renderResponseSection({ onShowResponseDetailsCallback: null });

    fireEvent.click(getByTestId(RESPONSE_BUTTON_TEST_ID));

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        session: 'start',
      })
    );
  });

  it('should render preview message if flyout is in preview', () => {
    const { getByTestId } = renderResponseSection({ isRulePreview: true });
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should render empty component if document is not signal', () => {
    const { container } = renderResponseSection({ hit: nonAlertMockHit });
    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if document is a remote alert', () => {
    const { container } = renderResponseSection({ hit: remoteAlertMockHit });
    expect(container).toBeEmptyDOMElement();
  });

  it('should render without rule preview message by default', () => {
    const { getByTestId } = renderResponseSection();
    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toHaveTextContent('Response');
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
