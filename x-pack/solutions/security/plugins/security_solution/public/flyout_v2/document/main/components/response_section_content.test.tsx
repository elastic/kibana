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
import {
  RESPONSE_BUTTON_TEST_ID,
  RESPONSE_SECTION_CONTENT_TEST_ID,
  RESPONSE_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { ResponseSectionContent } from './response_section_content';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';

jest.mock('../../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

const PREVIEW_MESSAGE = 'Response is not available in alert preview.';
const onShowResponseDetails = jest.fn();

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

const renderResponseSectionContent = ({
  hit = alertMockHit,
  isRulePreview = false,
}: {
  hit?: DataTableRecord;
  isRulePreview?: boolean;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <ResponseSectionContent
        hit={hit}
        isRulePreview={isRulePreview}
        onShowResponseDetails={onShowResponseDetails}
      />
    </IntlProvider>
  );

describe('<ResponseSectionContent />', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
  });

  it('should render response component', () => {
    const { getByTestId } = renderResponseSectionContent();

    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toHaveTextContent('Response');
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = renderResponseSectionContent();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    const { getByTestId } = renderResponseSectionContent();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeVisible();
  });

  it('should render response button for event kind signal', () => {
    const { getByTestId } = renderResponseSectionContent();
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should call onShowResponseDetails when clicking the button', () => {
    const { getByTestId } = renderResponseSectionContent();

    fireEvent.click(getByTestId(RESPONSE_BUTTON_TEST_ID));

    expect(onShowResponseDetails).toHaveBeenCalledTimes(1);
  });

  it('should render preview message if flyout is in preview', () => {
    const { getByTestId } = renderResponseSectionContent({ isRulePreview: true });
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should render empty component if document is not signal', () => {
    const { container } = renderResponseSectionContent({ hit: nonAlertMockHit });
    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if document is a remote alert', () => {
    const { container } = renderResponseSectionContent({ hit: remoteAlertMockHit });
    expect(container).toBeEmptyDOMElement();
  });

  it('should render without rule preview message by default', () => {
    const { getByTestId } = renderResponseSectionContent();
    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toHaveTextContent('Response');
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
