/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import {
  HIGHLIGHTED_FIELDS_DETAILS_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_TITLE_TEST_ID,
} from './test_ids';
import { HighlightedFields } from './highlighted_fields';
import { useHighlightedFields } from '../hooks/use_highlighted_fields';
import { TestProviders } from '../../../common/mock';
import { useRuleIndexPattern } from '../../../detection_engine/rule_creation_ui/pages/form';
import { mockContextValue } from '../../../flyout/document_details/shared/mocks/mock_context';
import { useHighlightedFieldsPrivilege } from '../hooks/use_highlighted_fields_privilege';
import { useRuleDetails } from '../../rule/hooks/use_rule_details';
import type { RuleResponse } from '../../../../common/api/detection_engine';

jest.mock('../hooks/use_highlighted_fields');
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../../detection_engine/rule_creation_ui/pages/form');
jest.mock('../hooks/use_highlighted_fields_privilege');
jest.mock('../../rule/hooks/use_rule_details');
const mockAddSuccess = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addSuccess: mockAddSuccess,
  }),
}));

const renderHighlightedFields = (hideEditButton = false) =>
  render(
    <TestProviders>
      <HighlightedFields
        hit={buildDataTableRecord(mockContextValue.searchHit as EsHitRecord)}
        investigationFields={mockContextValue.investigationFields}
        scopeId={mockContextValue.scopeId}
        hideEditButton={hideEditButton}
        renderCellActions={jest.fn(({ children }) => (
          <>{children}</>
        ))}
      />
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no highlighted fields for this alert.";

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isDisabled: false,
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

    const { getByTestId } = renderHighlightedFields();

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it(`should render no data message if there aren't any highlighted fields`, () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({});

    const { getByText } = renderHighlightedFields();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  describe('edit button', () => {
    it('should render the edit button by default', () => {
      (useHighlightedFields as jest.Mock).mockReturnValue({
        field: { values: ['value'] },
      });

      const { getByTestId } = renderHighlightedFields();

      expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('should hide the edit button when hideEditButton is true', () => {
      (useHighlightedFields as jest.Mock).mockReturnValue({
        field: { values: ['value'] },
      });

      const { queryByTestId } = renderHighlightedFields(true);

      expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not render edit button if rule is null', () => {
      (useRuleDetails as jest.Mock).mockReturnValue({
        rule: null,
        isExistingRule: true,
        loading: false,
      });
      const { queryByTestId } = renderHighlightedFields();
      expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
