/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { EditHighlightedFieldsButton } from './highlighted_fields_button';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import {
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_LOADING_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';
import { useRuleDetails } from '../../../rule_details/hooks/use_rule_details';

jest.mock(
  '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message'
);
jest.mock('../../../../detection_engine/rule_creation_ui/pages/form');
jest.mock('../../shared/hooks/use_highlighted_fields_privilege');
jest.mock('../../../rule_details/hooks/use_rule_details');

const mockSetIsEditLoading = jest.fn();
const mockCustomHighlightedFields = ['field1', 'field2'];
const defaultProps = {
  rule: { id: '123', index: ['index1', 'index2'] } as RuleResponse,
  customHighlightedFields: mockCustomHighlightedFields,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  setIsEditLoading: mockSetIsEditLoading,
  isExistingRule: true,
};

const renderEditHighlighedFieldsButton = (props = defaultProps) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <EditHighlightedFieldsButton {...props} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<EditHighlighedFieldsButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isDisabled: false,
      tooltipContent: 'tooltip content',
    });
    (useRuleIndexPattern as jest.Mock).mockReturnValue({
      indexPattern: { fields: [{ name: 'field1' }, { name: 'field2' }] },
      isIndexPatternLoading: false,
    });
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: { id: '123' } as RuleResponse,
      isExistingRule: true,
      loading: false,
    });
  });

  it('should render button when user has privilege to edit rule', () => {
    const { getByTestId } = renderEditHighlighedFieldsButton();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).not.toBeDisabled();
  });

  it('should render disabled button when user does not have privilege to edit a prebuilt rule', () => {
    (useHighlightedFieldsPrivilege as jest.Mock).mockReturnValue({
      isDisabled: true,
      tooltipContent: 'tooltip content',
    });
    const { getByTestId } = renderEditHighlighedFieldsButton();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should render modal when button is clicked', () => {
    const { getByTestId } = renderEditHighlighedFieldsButton();

    const button = getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID);
    fireEvent.click(button);
    expect(getByTestId(HIGHLIGHTED_FIELDS_MODAL_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading spinner when rule is loading', () => {
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: null,
      isExistingRule: true,
      loading: true,
    });
    const { getByTestId } = renderEditHighlighedFieldsButton();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should not render button when rule is not found', () => {
    (useRuleDetails as jest.Mock).mockReturnValue({
      rule: null,
      isExistingRule: false,
      loading: false,
    });
    const { container } = renderEditHighlighedFieldsButton();
    expect(container).toBeEmptyDOMElement();
  });
});
