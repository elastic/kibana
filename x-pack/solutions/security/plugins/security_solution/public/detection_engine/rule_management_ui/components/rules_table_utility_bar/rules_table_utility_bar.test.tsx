/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { getShowingRulesParams, RulesTableUtilityBar } from './rules_table_utility_bar';
import { TestProviders } from '../../../../common/mock';
import { useRulesTableContextMock } from '../rules_table/rules_table/__mocks__/rules_table_context';
import { useRulesTableContext } from '../rules_table/rules_table/rules_table_context';

jest.mock('../rules_table/rules_table/rules_table_context');

describe('RulesTableUtilityBar', () => {
  it('renders RulesTableUtilityBar total rules and selected rules', () => {
    const rulesTableContext = useRulesTableContextMock.create();
    rulesTableContext.state.pagination = {
      page: 1,
      perPage: 10,
      total: 21,
    };
    rulesTableContext.state.selectedRuleIds = ['testId'];
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);

    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onGetBulkItemsPopoverContent={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="showingRules"]').at(0).text()).toEqual(
      'Showing 1-10 of 21 rules'
    );
    expect(wrapper.find('[data-test-subj="selectedRules"]').at(0).text()).toEqual(
      'Selected 1 rule'
    );
  });

  it('renders utility actions if user has permissions', () => {
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onGetBulkItemsPopoverContent={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeTruthy();
  });

  it('renders no utility actions if user has no permissions', () => {
    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit={false}
          onGetBulkItemsPopoverContent={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="bulkActions"]').exists()).toBeFalsy();
  });

  it('invokes rules refetch on refresh action click', () => {
    const rulesTableContext = useRulesTableContextMock.create();
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);

    const wrapper = mount(
      <TestProviders>
        <RulesTableUtilityBar
          canBulkEdit
          onGetBulkItemsPopoverContent={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="refreshRulesAction"] button').at(0).simulate('click');

    expect(rulesTableContext.actions.reFetchRules).toHaveBeenCalledTimes(1);
  });

  describe('getShowingRulesParams creates correct label when', () => {
    it('there are 0 rules to display', () => {
      const pagination = {
        page: 1,
        perPage: 10,
        total: 0,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(0);
      expect(lastInPage).toEqual(0);
    });

    it('there is 1 rule to display', () => {
      const pagination = {
        page: 1,
        perPage: 10,
        total: 1,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(1);
      expect(lastInPage).toEqual(1);
    });

    it('the table displays the first page, and rules per page is less than total rules', () => {
      const pagination = {
        page: 1,
        perPage: 10,
        total: 21,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(1);
      expect(lastInPage).toEqual(10);
    });

    it('the table displays the first page, and rules per page is greater than total rules', () => {
      const pagination = {
        page: 1,
        perPage: 10,
        total: 8,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(1);
      expect(lastInPage).toEqual(8);
    });

    it('the table displays the second page, and rules per page is less than total rules', () => {
      const pagination = {
        page: 2,
        perPage: 10,
        total: 31,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(11);
      expect(lastInPage).toEqual(20);
    });

    it('the table displays the last page, displaying the remaining rules', () => {
      const pagination = {
        page: 2,
        perPage: 100,
        total: 101,
      };
      const [firstInPage, lastInPage] = getShowingRulesParams(pagination);
      expect(firstInPage).toEqual(101);
      expect(lastInPage).toEqual(101);
    });
  });
});
