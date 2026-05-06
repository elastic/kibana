/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { ResponseTab } from './response_tab';
import { RESPONSE_TAB_CONTENT_TEST_ID } from './test_ids';
import { mockContextValue } from '../../../flyout/document_details/shared/mocks/mock_context';
import { ResponseDetailsContent } from './response_details';

jest.mock('./response_details', () => ({
  ResponseDetailsContent: jest.fn(() => <div data-test-subj="responseDetailsContentMock" />),
}));

describe('<ResponseTab />', () => {
  const mockResponseDetailsContent = jest.mocked(ResponseDetailsContent);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders response details content with provided data', () => {
    const hit = buildDataTableRecord(mockContextValue.searchHit as EsHitRecord);

    const { getByTestId } = render(<ResponseTab hit={hit} isRulePreview={true} />);

    expect(getByTestId(RESPONSE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('responseDetailsContentMock')).toBeInTheDocument();
    expect(mockResponseDetailsContent).toHaveBeenCalledWith(
      {
        hit,
        isRulePreview: true,
      },
      {}
    );
  });
});
