/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash/fp';
import { render, screen } from '@testing-library/react';

import { getSameFamilyTableColumns } from './get_same_family_table_columns';
import { TestExternalProviders } from '../../../../../../mock/test_providers/test_providers';
import { mockAgentTypeSameFamilyField } from '../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { SAME_FAMILY_BADGE_LABEL } from '../../../../../../translations';

describe('getSameFamilyTableColumns', () => {
  test('it returns the expected column configuration', () => {
    const columns = getSameFamilyTableColumns().map((x) => omit('render', x));

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
      const columns = getSameFamilyTableColumns();
      const typeColumnRender = columns[1].render;
      const expected = 'keyword';

      render(
        <TestExternalProviders>
          {typeColumnRender != null &&
            typeColumnRender(mockAgentTypeSameFamilyField.type, mockAgentTypeSameFamilyField)}
        </TestExternalProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(expected);
    });
  });

  describe('indexFieldType column render()', () => {
    beforeEach(() => {
      const columns = getSameFamilyTableColumns();
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

    test('it renders the expected type with a "success" style', () => {
      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(
        mockAgentTypeSameFamilyField.indexFieldType
      );
    });

    test('it renders the same family badge', () => {
      expect(screen.getByTestId('sameFamily')).toHaveTextContent(SAME_FAMILY_BADGE_LABEL);
    });
  });
});
