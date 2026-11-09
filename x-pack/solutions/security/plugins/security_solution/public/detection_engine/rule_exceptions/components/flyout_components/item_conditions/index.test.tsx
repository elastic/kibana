/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';

import { ExceptionsConditions } from '.';
import { TestProviders, mockIndexPattern } from '../../../../../common/mock';
import { getRulesEqlSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { Rule } from '../../../../rule_management/logic/types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';

jest.mock('@kbn/lists-plugin/public');

describe('ExceptionsConditions', () => {
  describe('EQL rule type', () => {
    it('it displays EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
                query: 'sequence [process where process.name = "test.exe"]',
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').at(0).text()).toEqual(
        i18n.ADD_EXCEPTION_SEQUENCE_WARNING
      );
    });

    it('it displays EQL editing warning callout if rule is EQL sequence and "isEdit" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
                query: 'sequence [process where process.name = "test.exe"]',
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.RULE_DEFAULT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').at(0).text()).toEqual(
        i18n.EDIT_EXCEPTION_SEQUENCE_WARNING
      );
    });

    it('it does not display EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.DETECTION}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="eqlSequenceCallout"]').exists()).toBeFalsy();
    });
  });

  describe('OS options', () => {
    it('it displays os options if "showOsTypeOptions" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeTruthy();
    });

    it('it displays the exception item os text if "isEdit" is "true"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[
              {
                ...getExceptionListItemSchemaMock(),
                os_types: ['windows'],
              },
            ]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions
            isEdit
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            selectedOs={undefined}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      // Text appears funky since not applying styling
      expect(wrapper.find('[data-test-subj="exceptionItemSelectedOs"]').at(0).text()).toEqual(
        'Operating SystemWindows'
      );
    });

    it('it does not display os options if "showOsTypeOptions" is "false"', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            rules={[
              {
                ...getRulesEqlSchemaMock(),
              } as Rule,
            ]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.ENDPOINT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="osSelectionDropdown"]').exists()).toBeFalsy();
    });
  });

  describe('what the item applies to', () => {
    const getBuilderProps = () => {
      const { calls } = (getExceptionBuilderComponentLazy as jest.Mock).mock;
      return calls[calls.length - 1][0];
    };

    const renderConditions = (
      props: Partial<React.ComponentProps<typeof ExceptionsConditions>> = {}
    ) =>
      render(
        <TestProviders>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            exceptionListItems={[getExceptionListItemSchemaMock()]}
            indexPatterns={mockIndexPattern}
            rules={[{ ...getRulesEqlSchemaMock(), type: 'esql' } as unknown as Rule]}
            showOsTypeOptions={false}
            isEdit={false}
            selectedOs={undefined}
            exceptionListType={ExceptionListTypeEnum.RULE_DEFAULT}
            onOsChange={jest.fn()}
            onExceptionItemAdd={jest.fn()}
            onSetErrorExists={jest.fn()}
            {...props}
          />
        </TestProviders>
      );

    beforeEach(() => {
      (getExceptionBuilderComponentLazy as jest.Mock).mockClear();
    });

    it('does not offer the choice when the handler is not passed, as before', () => {
      renderConditions();

      expect(screen.queryByTestId('exceptionAppliesTo')).toBeNull();
      expect(screen.queryByTestId('exceptionComputedColumnsWarning')).toBeNull();
      expect(screen.queryByTestId('exceptionItemAppliesTo')).toBeNull();
    });

    it('offers the choice with source fields selected, and no warning', () => {
      renderConditions({ onAppliesToChange: jest.fn() });

      expect(screen.getByTestId('exceptionAppliesTo')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: i18n.APPLIES_TO_SOURCE_DOCUMENTS, pressed: true })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('exceptionComputedColumnsWarning')).toBeNull();
    });

    it('tells the handler that the item applies to the computed columns when the user picks them', () => {
      const onAppliesToChange = jest.fn();
      renderConditions({ onAppliesToChange });

      fireEvent.click(screen.getByRole('button', { name: i18n.APPLIES_TO_COMPUTED_COLUMNS }));

      expect(onAppliesToChange).toHaveBeenCalledWith('esql_output_columns');
    });

    it('warns that the exception only applies to ES|QL rules when it applies to the computed columns', () => {
      renderConditions({ onAppliesToChange: jest.fn(), appliesTo: 'esql_output_columns' });

      expect(
        screen.getByRole('button', { name: i18n.APPLIES_TO_COMPUTED_COLUMNS, pressed: true })
      ).toBeInTheDocument();
      expect(screen.getByTestId('exceptionComputedColumnsWarning')).toHaveTextContent(
        i18n.COMPUTED_COLUMNS_WARNING_TITLE
      );
      expect(screen.getByTestId('exceptionComputedColumnsWarning')).toHaveTextContent(
        'It excludes the rows that the ES|QL rule query returns, using the columns that the query computes, such as columns created with EVAL or STATS.'
      );
    });

    it('says that the exception has no effect when none of the rules is an ES|QL rule', () => {
      renderConditions({
        appliesTo: 'esql_output_columns',
        rules: [getRulesEqlSchemaMock() as unknown as Rule],
      });

      expect(screen.getByTestId('exceptionComputedColumnsWarning')).toHaveTextContent(
        i18n.COMPUTED_COLUMNS_NO_EFFECT_WARNING_TITLE
      );
    });

    it('keeps the generic warning when the rules are not known, as for a shared list', () => {
      renderConditions({ appliesTo: 'esql_output_columns', rules: null });

      expect(screen.getByTestId('exceptionComputedColumnsWarning')).toHaveTextContent(
        i18n.COMPUTED_COLUMNS_WARNING_TITLE
      );
    });

    it('shows what an existing item applies to, without a choice, and warns', () => {
      renderConditions({ isEdit: true, appliesTo: 'esql_output_columns' });

      expect(screen.queryByTestId('exceptionAppliesTo')).toBeNull();
      expect(screen.getByTestId('exceptionItemAppliesTo')).toHaveTextContent(
        i18n.APPLIES_TO_COMPUTED_COLUMNS
      );
      expect(screen.getByTestId('exceptionComputedColumnsWarning')).toBeInTheDocument();
    });

    it('gives the builder what the item applies to', () => {
      renderConditions({ appliesTo: 'esql_output_columns' });

      expect(getBuilderProps()).toEqual(
        expect.objectContaining({ appliesTo: 'esql_output_columns' })
      );
    });

    it('starts the builder with no items when adding an item that applies to the computed columns, because the items from an alert are on source fields', () => {
      renderConditions({ appliesTo: 'esql_output_columns', isEdit: false });

      expect(getBuilderProps().exceptionListItems).toEqual([]);
    });

    it('gives the builder the item that is edited', () => {
      const item = {
        ...getExceptionListItemSchemaMock(),
        applies_to: 'esql_output_columns' as const,
      };
      renderConditions({
        appliesTo: 'esql_output_columns',
        isEdit: true,
        exceptionListItems: [item],
      });

      expect(getBuilderProps().exceptionListItems).toEqual([item]);
    });
  });
});
