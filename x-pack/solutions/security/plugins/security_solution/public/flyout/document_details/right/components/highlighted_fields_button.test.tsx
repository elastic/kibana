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
import { EditHighlighedFieldsButton } from './highlighted_fields_button';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';
import {
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_MODAL_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useFetchIndex } from '../../../../common/containers/source';

jest.mock(
  '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message'
);
jest.mock('../../../../common/containers/source');

const mockSetIsEditLoading = jest.fn();
const mockCustomHighlightedFields = ['field1', 'field2'];
const defaultProps = {
  rule: { id: '123', index: ['index1', 'index2'] } as RuleResponse,
  customHighlightedFields: mockCustomHighlightedFields,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  setIsEditLoading: mockSetIsEditLoading,
};

const renderEditHighlighedFieldsButton = (props = defaultProps) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <EditHighlighedFieldsButton {...props} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<EditHighlighedFieldsButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue('upsell message');
    (useFetchIndex as jest.Mock).mockReturnValue([
      false,
      { indexPatterns: { fields: [{ name: 'field1' }, { name: 'field2' }] } },
    ]);
  });

  it.skip('should render button when rule is not a prebuilt rule', () => {
    const { getByTestId } = renderEditHighlighedFieldsButton({
      ...defaultProps,
      rule: { ...defaultProps.rule, immutable: false } as RuleResponse,
    });
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render button when rule is a prebuilt rule and user has privilege to edit rule', async () => {
    (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue(undefined);
    const { getByTestId } = renderEditHighlighedFieldsButton({
      ...defaultProps,
      rule: { ...defaultProps.rule, immutable: true } as RuleResponse,
    });
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render disabled button when user does not have privilege to edit a prebuilt rule', () => {
    (usePrebuiltRuleCustomizationUpsellingMessage as jest.Mock).mockReturnValue('upsell');
    const { getByTestId } = renderEditHighlighedFieldsButton({
      ...defaultProps,
      rule: { ...defaultProps.rule, immutable: true } as RuleResponse,
    });
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should render modal when button is clicked', () => {
    const { getByTestId } = renderEditHighlighedFieldsButton({
      ...defaultProps,
      rule: { ...defaultProps.rule, immutable: false } as RuleResponse,
    });

    const button = getByTestId(HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID);
    fireEvent.click(button);
    expect(getByTestId(HIGHLIGHTED_FIELDS_MODAL_TEST_ID)).toBeInTheDocument();
  });
});
