/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import {
  FILTER_KEY,
  INTEGRATION_BUTTON_TEST_ID,
  IntegrationFilterButton,
  INTEGRATIONS_LIST_TEST_ID,
} from './integrations_filter_button';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

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

    await act(async () => {
      const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

      const button = getByTestId(INTEGRATION_BUTTON_TEST_ID);
      expect(button).toBeInTheDocument();
      button.click();

      await new Promise(process.nextTick);

      expect(getByTestId(INTEGRATIONS_LIST_TEST_ID)).toBeInTheDocument();

      expect(getByTestId('first')).toHaveTextContent('firstLabel');
      expect(getByTestId('second')).toHaveTextContent('secondLabel');
    });
  });

  it('should add a negated filter to filterManager', async () => {
    const getFilters = jest.fn().mockReturnValue([]);
    const setFilters = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: { getFilters, setFilters } } } },
    });

    await act(async () => {
      const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

      getByTestId(INTEGRATION_BUTTON_TEST_ID).click();

      await new Promise(process.nextTick);

      getByTestId('first').click();
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

    await act(async () => {
      const { getByTestId } = render(<IntegrationFilterButton integrations={integrations} />);

      getByTestId(INTEGRATION_BUTTON_TEST_ID).click();

      await new Promise(process.nextTick);

      // creates a new filter that
      getByTestId('second').click();
      expect(setFilters).toHaveBeenCalledWith([]);
    });
  });
});
