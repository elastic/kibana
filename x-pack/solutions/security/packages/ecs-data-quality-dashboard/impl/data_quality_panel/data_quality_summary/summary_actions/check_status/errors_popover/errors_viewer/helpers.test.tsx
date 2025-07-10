/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';
import React from 'react';

import { getErrorsViewerTableColumns } from './helpers';
import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';
import { ErrorSummary } from '../../../../../types';

const errorSummary: ErrorSummary[] = [
  {
    pattern: '.alerts-security.alerts-default',
    indexName: null,
    error: 'Error loading stats: Error: Forbidden',
  },
  {
    error:
      'Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden',
    indexName: 'auditbeat-7.2.1-2023.02.13-000001',
    pattern: 'auditbeat-*',
  },
];

const noIndexName: ErrorSummary = errorSummary[0]; // <-- indexName: null
const hasIndexName: ErrorSummary = errorSummary[1];

describe('helpers', () => {
  describe('getCommonTableColumns', () => {
    test('it returns the expected column configuration', () => {
      const columns = getErrorsViewerTableColumns().map((x) => omit('render', x));

      expect(columns).toEqual([
        {
          field: 'pattern',
          name: 'Pattern',
          sortable: true,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'indexName',
          name: 'Index',
          sortable: false,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'error',
          name: 'Error',
          sortable: false,
          truncateText: false,
          width: '50%',
        },
      ]);
    });

    describe('indexName column render()', () => {
      describe('when the `ErrorSummary` has an `indexName`', () => {
        beforeEach(() => {
          const columns = getErrorsViewerTableColumns();
          const indexNameRender = columns[1].render;

          render(
            <TestExternalProviders>
              {indexNameRender != null && indexNameRender(hasIndexName.indexName, hasIndexName)}
            </TestExternalProviders>
          );
        });

        test('it renders the expected `indexName`', () => {
          expect(screen.getByTestId('indexName')).toHaveTextContent(String(hasIndexName.indexName));
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('emptyPlaceholder')).not.toBeInTheDocument();
        });
      });

      describe('when the `ErrorSummary` does NOT have an `indexName`', () => {
        beforeEach(() => {
          const columns = getErrorsViewerTableColumns();
          const indexNameRender = columns[1].render;

          render(
            <TestExternalProviders>
              {indexNameRender != null && indexNameRender(noIndexName.indexName, noIndexName)}
            </TestExternalProviders>
          );
        });

        test('it does NOT render `indexName`', () => {
          expect(screen.queryByTestId('indexName')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('emptyPlaceholder')).toBeInTheDocument();
        });
      });
    });

    describe('indexName error render()', () => {
      test('it renders the expected `error`', () => {
        const columns = getErrorsViewerTableColumns();
        const indexNameRender = columns[2].render;

        render(
          <TestExternalProviders>
            {indexNameRender != null && indexNameRender(hasIndexName.error, hasIndexName)}
          </TestExternalProviders>
        );

        expect(screen.getByTestId('error')).toHaveTextContent(hasIndexName.error);
      });
    });
  });
});
