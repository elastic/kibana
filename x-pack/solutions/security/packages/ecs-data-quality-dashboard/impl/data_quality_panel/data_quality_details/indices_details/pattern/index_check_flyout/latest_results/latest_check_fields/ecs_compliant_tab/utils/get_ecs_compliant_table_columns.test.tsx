/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';

import { getEcsCompliantTableColumns } from './get_ecs_compliant_table_columns';
import { TestExternalProviders } from '../../../../../../../../mock/test_providers/test_providers';
import { eventCategory } from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';

describe('getEcsCompliantTableColumns', () => {
  test('it returns the expected columns', () => {
    expect(getEcsCompliantTableColumns().map((x) => omit('render', x))).toEqual([
      {
        field: 'indexFieldName',
        name: 'Field',
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'type',
        name: 'ECS mapping type',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'allowed_values',
        name: 'ECS values',
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

  describe('type render()', () => {
    describe('when `type` exists', () => {
      beforeEach(() => {
        const columns = getEcsCompliantTableColumns();
        const typeRender = columns[1].render;

        render(
          <TestExternalProviders>
            {typeRender != null && typeRender(eventCategory.type, eventCategory)}
          </TestExternalProviders>
        );
      });

      test('it renders the expected `type`', () => {
        expect(screen.getByTestId('type')).toHaveTextContent('keyword');
      });

      test('it does NOT render the placeholder', () => {
        expect(screen.queryByTestId('typePlaceholder')).not.toBeInTheDocument();
      });
    });
  });

  describe('allowed values render()', () => {
    describe('when `allowedValues` exists', () => {
      beforeEach(() => {
        const columns = getEcsCompliantTableColumns();
        const allowedValuesRender = columns[2].render;

        render(
          <TestExternalProviders>
            <>
              {allowedValuesRender != null &&
                allowedValuesRender(eventCategory.allowed_values, eventCategory)}
            </>
          </TestExternalProviders>
        );
      });

      test('it renders the expected `AllowedValue` names', () => {
        expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(
          eventCategory.allowed_values?.map(({ name }) => name).join('') ?? ''
        );
      });

      test('it does NOT render the placeholder', () => {
        expect(screen.queryByTestId('ecsAllowedValuesEmpty')).not.toBeInTheDocument();
      });
    });

    describe('when `allowedValues` is undefined', () => {
      const withUndefinedAllowedValues = {
        ...eventCategory,
        allowed_values: undefined, // <--
      };

      beforeEach(() => {
        const columns = getEcsCompliantTableColumns();
        const allowedValuesRender = columns[2].render;

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

  describe('description render()', () => {
    describe('when `description` exists', () => {
      beforeEach(() => {
        const columns = getEcsCompliantTableColumns();
        const descriptionRender = columns[3].render;

        render(
          <TestExternalProviders>
            <>
              {descriptionRender != null &&
                descriptionRender(eventCategory.description, eventCategory)}
            </>
          </TestExternalProviders>
        );
      });

      test('it renders the expected `description`', () => {
        expect(screen.getByTestId('description')).toHaveTextContent(
          eventCategory.description?.replaceAll('\n', ' ') ?? ''
        );
      });

      test('it does NOT render the placeholder', () => {
        expect(screen.queryByTestId('emptyPlaceholder')).not.toBeInTheDocument();
      });
    });
  });
});
