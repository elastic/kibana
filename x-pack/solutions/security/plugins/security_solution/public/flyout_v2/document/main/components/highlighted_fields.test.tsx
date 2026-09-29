/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
import { TestProviders } from '../../../../common/mock';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { mockContextValue } from '../../../../flyout/document_details/shared/mocks/mock_context';
import { useHighlightedFieldsPrivilege } from '../hooks/use_highlighted_fields_privilege';
import { useRuleDetails } from '../../../rule/main/hooks/use_rule_details';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

vi.mock('../hooks/use_highlighted_fields');
vi.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
vi.mock('../../../../detection_engine/rule_creation_ui/pages/form');
vi.mock('../hooks/use_highlighted_fields_privilege');
vi.mock('../../../rule/main/hooks/use_rule_details');
const mockAddSuccess = vi.fn();
vi.mock('../../../../common/hooks/use_app_toasts', () => {
      const mocked = {
      useAppToasts: () => ({
        addSuccess: mockAddSuccess,
      }),
    };
      return { ...mocked, default: mocked };
    });

const renderHighlightedFields = (hideEditButton = false) =>
  render(
    <TestProviders>
      <HighlightedFields
        hit={buildDataTableRecord(mockContextValue.searchHit as EsHitRecord)}
        investigationFields={mockContextValue.investigationFields}
        scopeId={mockContextValue.scopeId}
        hideEditButton={hideEditButton}
        renderCellActions={vi.fn(({ children }) => (
          <>{children}</>
        ))}
      />
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no highlighted fields for this alert.";

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useHighlightedFieldsPrivilege as Mock).mockReturnValue({
      isDisabled: false,
      tooltipContent: 'tooltip content',
    });
    (useRuleIndexPattern as Mock).mockReturnValue({
      indexPattern: { fields: ['field'] },
      isIndexPatternLoading: false,
    });
    (useRuleDetails as Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
  });

  it('should render the component', () => {
    (useHighlightedFields as Mock).mockReturnValue({
      field: {
        values: ['value'],
      },
    });

    const { getByTestId } = renderHighlightedFields();

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it(`should render no data message if there aren't any highlighted fields`, () => {
    (useHighlightedFields as Mock).mockReturnValue({});

    const { getByText } = renderHighlightedFields();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  describe('edit button', () => {
    it('should render the edit button by default', () => {
      (useHighlightedFields as Mock).mockReturnValue({
        field: { values: ['value'] },
      });

      const { getByTestId } = renderHighlightedFields();

      expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('should hide the edit button when hideEditButton is true', () => {
      (useHighlightedFields as Mock).mockReturnValue({
        field: { values: ['value'] },
      });

      const { queryByTestId } = renderHighlightedFields(true);

      expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not render edit button if rule is null', () => {
      (useRuleDetails as Mock).mockReturnValue({
        rule: null,
        isExistingRule: true,
        loading: false,
      });
      const { queryByTestId } = renderHighlightedFields();
      expect(queryByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
