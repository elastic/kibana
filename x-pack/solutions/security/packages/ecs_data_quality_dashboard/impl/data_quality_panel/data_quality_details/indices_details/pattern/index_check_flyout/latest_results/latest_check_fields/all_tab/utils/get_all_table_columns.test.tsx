/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';
import React from 'react';

import { getAllTableColumns } from './get_all_table_columns';
import {
  eventCategory,
  eventCategoryWithUnallowedValues,
  hostNameWithTextMapping,
  mockAgentTypeSameFamilyField,
  someField,
} from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestExternalProviders } from '../../../../../../../../mock/test_providers/test_providers';
import {
  DOCUMENT_VALUES_ACTUAL,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
  SAME_FAMILY_BADGE_LABEL,
} from '../../../../../../../../translations';
import { EnrichedFieldMetadata } from '../../../../../../../../types';
import { EMPTY_PLACEHOLDER } from '../../../../../../../../constants';
import { ECS_DESCRIPTION } from '../../../../translations';

describe('getAllTableColumns', () => {
  test('it returns the expected column configuration', () => {
    expect(getAllTableColumns().map((x) => omit('render', x))).toEqual([
      { field: 'indexFieldName', name: FIELD, sortable: true, truncateText: false, width: '15%' },
      {
        field: 'type',
        name: ECS_MAPPING_TYPE_EXPECTED,
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'indexFieldType',
        name: INDEX_MAPPING_TYPE_ACTUAL,
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'allowed_values',
        name: ECS_VALUES_EXPECTED,
        sortable: false,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'indexInvalidValues',
        name: DOCUMENT_VALUES_ACTUAL,
        sortable: false,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'description',
        name: ECS_DESCRIPTION,
        sortable: false,
        truncateText: false,
        width: '25%',
      },
    ]);
  });

  describe('type column render()', () => {
    test('it renders the expected type', () => {
      const columns = getAllTableColumns();
      const typeColumnRender = columns[1].render;
      const expected = 'keyword';

      render(
        <TestExternalProviders>
          {typeColumnRender != null && typeColumnRender(eventCategory.type, eventCategory)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(expected);
    });

    test('it renders an empty placeholder when type is undefined', () => {
      const columns = getAllTableColumns();
      const typeColumnRender = columns[1].render;

      render(
        <TestExternalProviders>
          {typeColumnRender != null && typeColumnRender(undefined, eventCategory)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });

  describe('indexFieldType column render()', () => {
    describe("when the index field type does NOT match the ECS type, but it's in the SAME family", () => {
      beforeEach(() => {
        const columns = getAllTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        render(
          <TestExternalProviders>
            {indexFieldTypeColumnRender != null &&
              indexFieldTypeColumnRender(
                mockAgentTypeSameFamilyField.indexFieldType,
                mockAgentTypeSameFamilyField
              )}
          </TestExternalProviders>
        );
      });

      test('it renders the index field with a "success" style', () => {
        expect(screen.getByTestId('codeSuccess')).toHaveTextContent('constant_keyword');
      });

      test('it renders the same family badge', () => {
        expect(screen.getByTestId('sameFamily')).toHaveTextContent(SAME_FAMILY_BADGE_LABEL);
      });
    });

    describe("when the index field type does NOT match the ECS type, but it's in a DIFFERENT family", () => {
      const indexFieldType = 'text';

      test('it renders the expected type with danger styling', () => {
        const columns = getAllTableColumns();
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

    describe('when the index field matches the ECS type', () => {
      test('it renders the expected type with success styling', () => {
        const columns = getAllTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        render(
          <TestExternalProviders>
            {indexFieldTypeColumnRender != null &&
              indexFieldTypeColumnRender(eventCategory.indexFieldType, eventCategory)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('codeSuccess')).toHaveTextContent(eventCategory.indexFieldType);
      });
    });
  });

  describe('allowed_values column render()', () => {
    test('it renders the expected allowed values when provided', () => {
      const columns = getAllTableColumns();
      const allowedValuesolumnRender = columns[3].render;

      const expectedAllowedValuesNames =
        eventCategory.allowed_values != null
          ? eventCategory.allowed_values.map((x) => x.name).join('')
          : 'unexpected';

      render(
        <TestExternalProviders>
          {allowedValuesolumnRender != null &&
            allowedValuesolumnRender(eventCategory.allowed_values, eventCategory)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(expectedAllowedValuesNames);
    });

    test('it renders a placeholder when allowed values is undefined', () => {
      const columns = getAllTableColumns();
      const allowedValuesolumnRender = columns[3].render;

      const withUndefinedAllowedValues: EnrichedFieldMetadata = {
        ...eventCategory,
        allowed_values: undefined,
      };

      render(
        <TestExternalProviders>
          {allowedValuesolumnRender != null &&
            allowedValuesolumnRender(undefined, withUndefinedAllowedValues)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('ecsAllowedValuesEmpty')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });

  describe('indexInvalidValues column render()', () => {
    test('it renders the expected index invalid values', () => {
      const columns = getAllTableColumns();
      const indexInvalidValuesRender = columns[4].render;

      render(
        <TestExternalProviders>
          {indexInvalidValuesRender != null &&
            indexInvalidValuesRender(
              eventCategoryWithUnallowedValues.indexInvalidValues,
              eventCategoryWithUnallowedValues
            )}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('indexInvalidValues')).toHaveTextContent(
        'an_invalid_category (2)theory (1)'
      );
    });
  });

  describe('description column render()', () => {
    test('it renders the expected description', () => {
      const columns = getAllTableColumns();
      const descriptionolumnRender = columns[5].render;
      const expectedDescription = 'this is a test';

      const withDescription: EnrichedFieldMetadata = {
        ...eventCategory,
        description: expectedDescription,
      };

      render(
        <TestExternalProviders>
          {descriptionolumnRender != null &&
            descriptionolumnRender(withDescription.description, withDescription)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('description')).toHaveTextContent(expectedDescription);
    });

    test('it renders a placeholder when description is undefined', () => {
      const columns = getAllTableColumns();
      const descriptionolumnRender = columns[5].render;

      render(
        <TestExternalProviders>
          {descriptionolumnRender != null && descriptionolumnRender(undefined, someField)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('emptyDescription')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });
});
