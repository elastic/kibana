/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';

import { ExceptionsAddToRulesTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';

jest.mock('../../../../rule_management/logic/use_find_rules');

describe('ExceptionsAddToRulesTable', () => {
  it('should display the loading state while fetching rules', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: { rules: [], total: 0 },
      isFetched: false,
    });
    const wrapper = render(
      <ExceptionsAddToRulesTable initiallySelectedRules={[]} onRuleSelectionChange={jest.fn()} />
    );

    expect(wrapper.getByTestId('exceptionItemViewerEmptyPromptsLoading')).toBeInTheDocument();
  });

  it('should display the fetched rule selected', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [getRulesSchemaMock(), { ...getRulesSchemaMock(), id: '345', name: 'My rule' }],
        total: 0,
      },
      isFetched: true,
    });
    const wrapper = render(
      <TestProviders>
        <ExceptionsAddToRulesTable
          initiallySelectedRules={[{ ...getRulesSchemaMock(), id: '345', name: 'My rule' }]}
          onRuleSelectionChange={jest.fn()}
        />
      </TestProviders>
    );
    expect(wrapper.queryByTestId('exceptionItemViewerEmptyPromptsLoading')).toBeFalsy();
    const selectedRow = wrapper.getByText('My rule').closest('tr') as HTMLTableRowElement;
    const selectedSwitch = within(selectedRow).getByRole('switch');
    expect(selectedSwitch).toBeChecked();
  });

  it('should invoke the onRuleSelectionChange when link switch is clicked', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [getRulesSchemaMock(), { ...getRulesSchemaMock(), id: '345', name: 'My rule' }],
        total: 0,
      },
      isFetched: true,
    });
    const onRuleSelectionChangeMock = jest.fn();
    const rule = { ...getRulesSchemaMock(), id: '345', name: 'My rule' };
    const { queryByTestId, getByText } = render(
      <TestProviders>
        <ExceptionsAddToRulesTable
          initiallySelectedRules={[rule]}
          onRuleSelectionChange={onRuleSelectionChangeMock}
        />
      </TestProviders>
    );
    expect(queryByTestId('exceptionItemViewerEmptyPromptsLoading')).toBeFalsy();
    const selectedRow = getByText('My rule').closest('tr') as HTMLTableRowElement;
    const selectedSwitch = within(selectedRow).getByRole('switch');
    fireEvent.click(selectedSwitch);
    expect(onRuleSelectionChangeMock).toBeCalledWith([rule]);
  });
});
