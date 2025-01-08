/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash/fp';
import { render, screen } from '@testing-library/react';

import {
  getIncompatibleMappingsTableColumns,
  getIncompatibleValuesTableColumns,
} from './get_incompatible_table_columns';
import { TestExternalProviders } from '../../../../../../mock/test_providers/test_providers';
import {
  eventCategoryWithUnallowedValues,
  hostNameWithTextMapping,
} from '../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';

describe('getIncompatibleMappingsTableColumns', () => {
  test('it returns the expected column configuration', () => {
    const columns = getIncompatibleMappingsTableColumns().map((x) => omit('render', x));

    expect(columns).toEqual([
      {
        field: 'indexFieldName',
        name: 'Field',
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'type',
        name: 'ECS mapping type (expected)',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'indexFieldType',
        name: 'Index mapping type (actual)',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'description',
        name: 'ECS description',
        sortable: false,
        truncateText: false,
        width: '35%',
      },
    ]);
  });

  describe('type column render()', () => {
    test('it renders the expected type', () => {
      const columns = getIncompatibleMappingsTableColumns();
      const typeColumnRender = columns[1].render;
      const expected = 'keyword';

      render(
        <TestExternalProviders>
          {typeColumnRender != null &&
            typeColumnRender(hostNameWithTextMapping.type, hostNameWithTextMapping)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(expected);
    });
  });

  describe('indexFieldType column render()', () => {
    const indexFieldType = 'text';

    test('it renders the expected type with danger styling', () => {
      const columns = getIncompatibleMappingsTableColumns();
      const indexFieldTypeColumnRender = columns[2].render;

      render(
        <TestExternalProviders>
          {indexFieldTypeColumnRender != null &&
            indexFieldTypeColumnRender(
              hostNameWithTextMapping.indexFieldType,
              hostNameWithTextMapping
            )}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('codeDanger')).toHaveTextContent(indexFieldType);
    });
  });
});

describe('getIncompatibleValuesTableColumns', () => {
  test('it returns the expected columns', () => {
    expect(getIncompatibleValuesTableColumns().map((x) => omit('render', x))).toEqual([
      {
        field: 'indexFieldName',
        name: 'Field',
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'allowed_values',
        name: 'ECS values (expected)',
        sortable: false,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'indexInvalidValues',
        name: 'Document values (actual)',
        sortable: false,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'description',
        name: 'ECS description',
        sortable: false,
        truncateText: false,
        width: '35%',
      },
    ]);
  });

  describe('allowed values render()', () => {
    describe('when `allowedValues` exists', () => {
      beforeEach(() => {
        const columns = getIncompatibleValuesTableColumns();
        const allowedValuesRender = columns[1].render;

        render(
          <TestExternalProviders>
            <>
              {allowedValuesRender != null &&
                allowedValuesRender(
                  eventCategoryWithUnallowedValues.allowed_values,
                  eventCategoryWithUnallowedValues
                )}
            </>
          </TestExternalProviders>
        );
      });

      test('it renders the expected `AllowedValue` names', () => {
        expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(
          eventCategoryWithUnallowedValues.allowed_values?.map(({ name }) => name).join('') ?? ''
        );
      });

      test('it does NOT render the placeholder', () => {
        expect(screen.queryByTestId('ecsAllowedValuesEmpty')).not.toBeInTheDocument();
      });
    });

    describe('when `allowedValues` is undefined', () => {
      const withUndefinedAllowedValues = {
        ...eventCategoryWithUnallowedValues,
        allowed_values: undefined, // <--
      };

      beforeEach(() => {
        const columns = getIncompatibleValuesTableColumns();
        const allowedValuesRender = columns[1].render;

        render(
          <TestExternalProviders>
            <>
              {allowedValuesRender != null &&
                allowedValuesRender(
                  withUndefinedAllowedValues.allowed_values,
                  withUndefinedAllowedValues
                )}
            </>
          </TestExternalProviders>
        );
      });

      test('it does NOT render the `AllowedValue` names', () => {
        expect(screen.queryByTestId('ecsAllowedValues')).not.toBeInTheDocument();
      });

      test('it renders the placeholder', () => {
        expect(screen.getByTestId('ecsAllowedValuesEmpty')).toBeInTheDocument();
      });
    });
  });

  describe('indexInvalidValues render()', () => {
    describe('when `indexInvalidValues` is populated', () => {
      beforeEach(() => {
        const columns = getIncompatibleValuesTableColumns();
        const indexInvalidValuesRender = columns[2].render;

        render(
          <TestExternalProviders>
            <>
              {indexInvalidValuesRender != null &&
                indexInvalidValuesRender(
                  eventCategoryWithUnallowedValues.indexInvalidValues,
                  eventCategoryWithUnallowedValues
                )}
            </>
          </TestExternalProviders>
        );
      });

      test('it renders the expected `indexInvalidValues`', () => {
        expect(screen.getByTestId('indexInvalidValues')).toHaveTextContent(
          'an_invalid_category (2)theory (1)'
        );
      });

      test('it does NOT render the placeholder', () => {
        expect(screen.queryByTestId('emptyPlaceholder')).not.toBeInTheDocument();
      });
    });

    describe('when `indexInvalidValues` is empty', () => {
      beforeEach(() => {
        const columns = getIncompatibleValuesTableColumns();
        const indexInvalidValuesRender = columns[2].render;

        const withEmptyIndexInvalidValues = {
          ...eventCategoryWithUnallowedValues,
          indexInvalidValues: [], // <--
        };

        render(
          <TestExternalProviders>
            <>
              {indexInvalidValuesRender != null &&
                indexInvalidValuesRender(
                  withEmptyIndexInvalidValues.indexInvalidValues,
                  withEmptyIndexInvalidValues
                )}
            </>
          </TestExternalProviders>
        );
      });

      test('it does NOT render the index invalid values', () => {
        expect(screen.queryByTestId('indexInvalidValues')).not.toBeInTheDocument();
      });

      test('it renders the placeholder', () => {
        expect(screen.getByTestId('emptyPlaceholder')).toBeInTheDocument();
      });
    });
  });
});
