/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import * as hook from '../../common/lib/kibana';

jest.mock('../../common/lib/kibana');

interface MockConfig {
  $filterUpdates?: BehaviorSubject<void>;
  getFilters?: jest.Mock<Filter[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilters?: jest.Mock<any, Filter[]>;
}

const defaultConfig = {
  $filterUpdates: new BehaviorSubject<void>(undefined),
  getFilters: jest.fn().mockReturnValue([]),
  setFilters: jest.fn(),
};

export const mockUseKibanaForFilters = ({
  $filterUpdates = defaultConfig.$filterUpdates,
  getFilters = defaultConfig.getFilters,
  setFilters = defaultConfig.setFilters,
}: MockConfig = defaultConfig) => {
  const getFieldsForWildcard = jest.fn();

  (hook as jest.Mocked<typeof hook>).useKibana.mockReturnValue({
    services: {
      data: {
        query: {
          filterManager: {
            getFilters,
            setFilters,
            getUpdates$: () => $filterUpdates,
          },
        },
      },
      dataViews: { getFieldsForWildcard },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return { getFieldsForWildcard, setFilters, getFilters, $filterUpdates };
};
