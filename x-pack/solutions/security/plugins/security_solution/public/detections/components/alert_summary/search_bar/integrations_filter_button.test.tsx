/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import {
  FILTER_KEY,
  INTEGRATION_BUTTON_TEST_ID,
  IntegrationFilterButton,
  INTEGRATIONS_LIST_TEST_ID,
} from './integrations_filter_button';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../common/lib/kibana');

const integrations: EuiSelectableOption[] = [
  {
    'data-test-subj': 'first',
    checked: 'on',
    key: 'firstKey',
    label: 'firstLabel',
  },
  {
    'data-test-subj': 'second',
    key: 'secondKey',
    label: 'secondLabel',
  },
];

describe('<IntegrationFilterButton />', () => {
  it('should render the component', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: jest.fn() } } },
    });

    const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

    const button = getByTestId(INTEGRATION_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();
    await userEvent.click(button);

    expect(getByTestId(INTEGRATIONS_LIST_TEST_ID)).toBeInTheDocument();

    expect(getByTestId('first')).toHaveTextContent('firstLabel');
    expect(getByTestId('second')).toHaveTextContent('secondLabel');
  });

  it('should add a negated filter to filterManager', async () => {
    const getFilters = jest.fn().mockReturnValue([]);
    const setFilters = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: { getFilters, setFilters } } } },
    });

    const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

    await userEvent.click(getByTestId(INTEGRATION_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(getByTestId('first')).toBeVisible();
    });

    await userEvent.click(getByTestId('first'));

    expect(setFilters).toHaveBeenCalledWith([
      {
        meta: {
          alias: null,
          disabled: false,
          index: undefined,
          key: FILTER_KEY,
          negate: true,
          params: { query: 'firstKey' },
          type: 'phrase',
        },
        query: { match_phrase: { [FILTER_KEY]: 'firstKey' } },
      },
    ]);
  });

  it('should remove the negated filter from filterManager', async () => {
    const getFilters = jest.fn().mockReturnValue([
      {
        meta: {
          alias: null,
          disabled: false,
          index: undefined,
          key: FILTER_KEY,
          negate: true,
          params: { query: 'secondKey' },
          type: 'phrase',
        },
        query: { match_phrase: { [FILTER_KEY]: 'secondKey' } },
      },
    ]);
    const setFilters = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: { getFilters, setFilters } } } },
    });

    const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

    await userEvent.click(getByTestId(INTEGRATION_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(getByTestId('second')).toBeVisible();
    });

    // creates a new filter that
    await userEvent.click(getByTestId('second'));
    expect(setFilters).toHaveBeenCalledWith([]);
  });
});
