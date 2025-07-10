/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SearchQueryRulesQueryRule } from '../../../../common/types';
import { QueryRuleFlyout } from './query_rule_flyout';
import * as formContext from 'react-hook-form';
import { QueryRulesetDetailsForm } from '../../../providers/query_ruleset_details_form';

describe('Query rule edit flyout', () => {
  const TEST_IDS = {
    FlyoutHeader: 'queryRulesFlyoutHeader',
    FlyoutUpdateButton: 'searchQueryRulesQueryRuleFlyoutUpdateButton',
    FlyoutCancelButton: 'searchQueryRulesQueryRuleFlyoutCancelButton',
    MetadataEditorField: 'searchQueryRulesQueryRuleMetadataEditorField',
    MetadataEditorMatchTypeSelect: 'searchQueryRulesQueryRuleMetadataEditorSelect',
    MetadataEditorValues: 'searchQueryRulesQueryRuleMetadataEditorValues',
    MetadataEditorDeleteButton: 'searchQueryRulesQueryRuleMetadataEditorDeleteButton',
    CriteriaModeCustom: 'searchQueryRulesQueryRuleCriteriaCustom',
    CriteriaModeAlways: 'searchQueryRulesQueryRuleCriteriaAlways',
    ActionTypePinned: 'searchQueryRulesQueryRuleActionTypePinned',
    ActionTypeExclude: 'searchQueryRulesQueryRuleActionTypeExclude',
    AndButton: 'searchQueryRulesQueryRuleMetadataEditorAddCriteriaButton',
  };

  const ACTIONS = {
    PressCloseButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.FlyoutCancelButton));
      });
    },
    PressUpdateButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.FlyoutUpdateButton));
      });
    },
    PressAndButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.AndButton));
      });
    },
    PressDeleteButton: () => {
      act(() => {
        fireEvent.click(screen.getByTestId(TEST_IDS.MetadataEditorDeleteButton));
      });
    },
  };

  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <I18nProvider>
      <QueryRulesetDetailsForm>
        <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
      </QueryRulesetDetailsForm>
    </I18nProvider>
  );

  const onCloseMock = jest.fn();
  const onSaveMock = jest.fn();
  const appendMock = jest.fn();
  const removeMock = jest.fn();
  const rulesMock: SearchQueryRulesQueryRule[] = [
    {
      rule_id: 'rule-1',
      type: 'pinned',
      actions: {
        docs: [
          {
            _index: 'index-1',
            _id: 'doc-1',
          },
        ],
      },
      criteria: [
        {
          metadata: 'field1',
          type: 'exact',
          values: ['value1'],
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(formContext, 'useFieldArray').mockReturnValue({
      fields: [...rulesMock[0].criteria],
      append: appendMock,
      remove: removeMock,
    } as unknown as formContext.UseFieldArrayReturn);
  });

  it('should render the query rule edit flyout', () => {
    render(
      <QueryRuleFlyout
        ruleId="rule-1"
        rulesetId="ruleset-1"
        rules={rulesMock}
        onClose={onCloseMock}
        onSave={onSaveMock}
      />,
      {
        wrapper: Wrapper,
      }
    );

    // Header
    expect(screen.getByTestId(TEST_IDS.FlyoutHeader)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.FlyoutHeader)).toHaveTextContent('rule-1');

    // Footer buttons
    expect(screen.getByTestId(TEST_IDS.FlyoutUpdateButton)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.FlyoutCancelButton)).toBeInTheDocument();

    // Pinned/Exclude toggle
    expect(screen.getByTestId(TEST_IDS.ActionTypePinned)).toHaveTextContent('Pinned');
    expect(screen.getByTestId(TEST_IDS.ActionTypeExclude)).toHaveTextContent('Exclude');

    // Custom/Always toggle
    expect(screen.getByTestId(TEST_IDS.CriteriaModeCustom)).toHaveTextContent('Custom');
    expect(screen.getByTestId(TEST_IDS.CriteriaModeAlways)).toHaveTextContent('Always');

    // Metadata editor
    expect(screen.getByTestId(TEST_IDS.MetadataEditorField)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.MetadataEditorField)).toHaveValue('field1');
    expect(screen.getByTestId(TEST_IDS.MetadataEditorMatchTypeSelect)).toHaveTextContent('exact');
    expect(screen.getByTestId(TEST_IDS.MetadataEditorValues)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.MetadataEditorValues)).toHaveTextContent('value1');
    expect(screen.getByTestId(TEST_IDS.MetadataEditorDeleteButton)).toBeInTheDocument();

    expect(screen.getByTestId(TEST_IDS.AndButton)).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <QueryRuleFlyout
        ruleId="rule-1"
        rulesetId="ruleset-1"
        rules={rulesMock}
        onClose={onCloseMock}
        onSave={onSaveMock}
      />,
      {
        wrapper: Wrapper,
      }
    );

    ACTIONS.PressCloseButton();

    expect(onSaveMock).not.toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });
  // TODO: Needs to be fixed, receiving  "_id": undefined,  "_index": undefined,
  it.skip('should call onSave when update button is clicked', () => {
    render(
      <QueryRuleFlyout
        ruleId="rule-1"
        rulesetId="ruleset-1"
        rules={rulesMock}
        onClose={onCloseMock}
        onSave={onSaveMock}
      />,
      {
        wrapper: Wrapper,
      }
    );

    ACTIONS.PressUpdateButton();
    expect(onSaveMock).toHaveBeenCalledWith({
      rule_id: 'rule-1',
      criteria: rulesMock[0].criteria,
      type: 'pinned',
      actions: rulesMock[0].actions,
    });

    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should call append when add criteria button is clicked', () => {
    render(
      <QueryRuleFlyout
        ruleId="rule-1"
        rulesetId="ruleset-1"
        rules={rulesMock}
        onClose={onCloseMock}
        onSave={onSaveMock}
      />,
      {
        wrapper: Wrapper,
      }
    );

    ACTIONS.PressAndButton();

    expect(appendMock).toHaveBeenCalledWith({
      metadata: '',
      type: 'exact',
      values: [],
    });

    expect(removeMock).not.toHaveBeenCalled();
    expect(onSaveMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should call remove when delete button is clicked', () => {
    render(
      <QueryRuleFlyout
        ruleId="rule-1"
        rulesetId="ruleset-1"
        rules={rulesMock}
        onClose={onCloseMock}
        onSave={onSaveMock}
      />,
      {
        wrapper: Wrapper,
      }
    );
    ACTIONS.PressDeleteButton();
    expect(removeMock).toHaveBeenCalledWith(0);
    expect(appendMock).not.toHaveBeenCalled();
    expect(onSaveMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
