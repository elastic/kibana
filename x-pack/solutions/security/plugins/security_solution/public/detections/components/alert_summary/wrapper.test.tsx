/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import {
  CONTENT_TEST_ID,
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
  Wrapper,
} from './wrapper';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { SEARCH_BAR_TEST_ID } from './search_bar/search_bar_section';
import { KPIS_SECTION } from './kpis/kpis_section';

jest.mock('../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'alert-summary-search-bar'} />,
}));
jest.mock('../../../common/lib/kibana');

const packages: PackageListItem[] = [
  {
    description: '',
    download: '',
    id: 'splunk',
    name: 'splunk',
    path: '',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '',
  },
];

describe('<Wrapper />', () => {
  it('should render a loading skeleton while creating the dataView', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn(),
            clearInstanceCache: jest.fn(),
          },
        },
      },
    });

    await act(async () => {
      const { getByTestId } = render(<Wrapper packages={packages} />);

      expect(getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render an error if the dataView fail to be created correctly', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn().mockReturnValue(undefined),
            clearInstanceCache: jest.fn(),
          },
        },
      },
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    await act(async () => {
      const { getByTestId } = render(<Wrapper packages={packages} />);

      await new Promise(process.nextTick);

      expect(getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent('Unable to create data view');
    });
  });

  it('should render the content if the dataView is created correctly', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest
              .fn()
              .mockReturnValue({ getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() }),
            clearInstanceCache: jest.fn(),
          },
          query: { filterManager: { getFilters: jest.fn() } },
        },
      },
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    await act(async () => {
      const { getByTestId } = render(
        <TestProviders>
          <Wrapper packages={packages} />
        </TestProviders>
      );

      await new Promise(process.nextTick);

      expect(getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(KPIS_SECTION)).toBeInTheDocument();
    });
  });
});
