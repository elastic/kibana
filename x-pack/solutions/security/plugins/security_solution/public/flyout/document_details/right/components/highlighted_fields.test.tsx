/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import {
  HIGHLIGHTED_FIELDS_DETAILS_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_TITLE_TEST_ID,
} from './test_ids';
import { HighlightedFields } from './highlighted_fields';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { TestProviders } from '../../../../common/mock';
import { useFetchIndex } from '../../../../common/containers/source';
import { mockContextValue } from '../../shared/mocks/mock_context';

jest.mock('../../shared/hooks/use_highlighted_fields');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../../../common/containers/source');

const mockAddSuccess = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addSuccess: mockAddSuccess,
  }),
}));

const renderHighlightedFields = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <HighlightedFields />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no highlighted fields for this alert.";

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    (useFetchIndex as jest.Mock).mockReturnValue([false, { indexPatterns: { fields: ['field'] } }]);
  });

  it('should render the component', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      field: {
        values: ['value'],
      },
    });

    const { getByTestId } = renderHighlightedFields(mockContextValue);

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it(`should render no data message if there aren't any highlighted fields`, () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({});

    const { getByText, getByTestId } = renderHighlightedFields(mockContextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render edit button if rule is null', () => {
    const { queryByTestId } = renderHighlightedFields({
      ...mockContextValue,
      rule: null,
    });
    expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
