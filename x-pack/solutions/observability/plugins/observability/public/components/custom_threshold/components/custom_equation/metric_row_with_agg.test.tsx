/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { KqlPluginStart } from '@kbn/kql/public';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { MetricRowWithAgg } from './metric_row_with_agg';

jest.mock('../../../rule_kql_filter/kuery_bar', () => ({
  RuleFlyoutKueryBar: () => <input data-test-subj="kqlFilterInput" />,
}));

const FILTER_ERROR = 'Expected "(" but "}" found.';

const renderRow = (aggType: Aggregators, errors = {}) =>
  renderWithI18n(
    <MetricRowWithAgg
      name="A"
      aggType={aggType}
      field={aggType === Aggregators.COUNT ? undefined : 'metric'}
      filter="status: ("
      dataView={{ fields: [], title: 'logs-*' }}
      fields={[{ name: 'metric', normalizedType: 'number' }]}
      kql={{} as KqlPluginStart}
      onAdd={jest.fn()}
      onDelete={jest.fn()}
      onChange={jest.fn()}
      disableAdd
      disableDelete
      aggregationTypes={{
        [Aggregators.COUNT]: {
          text: 'Document count',
          fieldRequired: false,
          value: 'count',
          validNormalizedTypes: [],
        },
        [Aggregators.AVERAGE]: {
          text: 'Average',
          fieldRequired: true,
          value: 'avg',
          validNormalizedTypes: ['number'],
        },
      }}
      errors={errors}
    />
  );

const openPopover = () => fireEvent.click(screen.getByTestId('aggregationNameA'));

describe('MetricRowWithAgg KQL filter error', () => {
  it.each([Aggregators.COUNT, Aggregators.AVERAGE])(
    'shows the filter validation error next to the filter input for %s',
    (aggType) => {
      renderRow(aggType, { metrics: { A: { filter: FILTER_ERROR } } });
      openPopover();

      expect(screen.getByText(FILTER_ERROR)).toBeInTheDocument();
    }
  );

  it('does not show a filter error when the filter is valid', () => {
    renderRow(Aggregators.AVERAGE, {});
    openPopover();

    expect(screen.queryByText(FILTER_ERROR)).not.toBeInTheDocument();
  });
});
