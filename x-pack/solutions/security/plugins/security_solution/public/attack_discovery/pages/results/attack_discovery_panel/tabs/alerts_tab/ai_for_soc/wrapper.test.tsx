/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  AiForSOCAlertsTab,
  CONTENT_TEST_ID,
  ERROR_TEST_ID,
  LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
} from './wrapper';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../../../common/mock';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useFindRulesQuery } from '../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';

jest.mock('./table', () => ({
  Table: () => <div />,
}));
jest.mock('../../../../../../../common/lib/kibana');
jest.mock('../../../../../../../detections/hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query');

const id = 'id';
const query = { ids: { values: ['abcdef'] } };

describe('<AiForSOCAlertsTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('should render a loading skeleton while creating the dataView', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn(),
            clearInstanceCache: jest.fn(),
          },
        },
        http: { basePath: { prepend: jest.fn() } },
      },
    });

    await act(async () => {
      const { getByTestId } = render(<AiForSOCAlertsTab id={id} query={query} />);

      expect(getByTestId(LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render a loading skeleton while fetching packages (integrations)', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn(),
            clearInstanceCache: jest.fn(),
          },
        },
        http: { basePath: { prepend: jest.fn() } },
      },
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });

    await act(async () => {
      const { getByTestId } = render(<AiForSOCAlertsTab id={id} query={query} />);

      await new Promise(process.nextTick);

      expect(getByTestId(LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
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
      const { getByTestId } = render(<AiForSOCAlertsTab id={id} query={query} />);

      await new Promise(process.nextTick);

      expect(getByTestId(LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(ERROR_TEST_ID)).toHaveTextContent('Unable to create data view');
    });
  });

  it('should render the content', async () => {
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
          <AiForSOCAlertsTab id={id} query={query} />
        </TestProviders>
      );

      await new Promise(process.nextTick);

      expect(getByTestId(LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });
});
