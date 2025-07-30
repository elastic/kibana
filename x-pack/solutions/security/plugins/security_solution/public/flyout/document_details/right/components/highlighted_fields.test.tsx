/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  HIGHLIGHTED_FIELDS_DETAILS_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_TITLE_TEST_ID,
} from './test_ids';
import { HighlightedFields } from './highlighted_fields';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { TestProviders } from '../../../../common/mock';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';
import { useRuleDetails } from '../../../rule_details/hooks/use_rule_details';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

jest.mock('../../shared/hooks/use_highlighted_fields');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../../../detection_engine/rule_creation_ui/pages/form');
jest.mock('../../shared/hooks/use_highlighted_fields_privilege');
jest.mock('../../../rule_details/hooks/use_rule_details');
const mockAddSuccess = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addSuccess: mockAddSuccess,
  }),
}));

const renderHighlightedFields = (showEditButton = false) =>
  render(
    <TestProviders>
      <HighlightedFields
        dataFormattedForFieldBrowser={mockContextValue.dataFormattedForFieldBrowser}
        investigationFields={mockContextValue.investigationFields}
        scopeId={mockContextValue.scopeId}
        showEditButton={showEditButton}
        showCellActions={false}
      />
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no highlighted fields for this alert.";

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isEditHighlightedFieldsDisabled: false,
      tooltipContent: 'tooltip content',
    });
    (useRuleIndexPattern as jest.Mock).mockReturnValue({
      indexPattern: { fields: ['field'] },
      isIndexPatternLoading: false,
    });
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
  });

  it('should render the component', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      field: {
        values: ['value'],
      },
    });

    const { getByTestId, queryByTestId } = renderHighlightedFields();

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it(`should render no data message if there aren't any highlighted fields`, () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({});

    const { getByText, queryByTestId } = renderHighlightedFields();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the component with edit button', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      field: {
        values: ['value'],
      },
    });

    const { getByTestId } = renderHighlightedFields(true);

    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render edit button if rule is null', () => {
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: null,
      isExistingRule: true,
      loading: false,
    });
    const { queryByTestId } = renderHighlightedFields(true);
    expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
