/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { Filter } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import * as hook from '../../common/lib/kibana';

vi.mock('../../common/lib/kibana');

interface MockConfig {
  $filterUpdates?: BehaviorSubject<void>;
  getFilters?: Mock<Filter[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilters?: Mock<any, Filter[]>;
}

const defaultConfig = {
  $filterUpdates: new BehaviorSubject<void>(undefined),
  getFilters: vi.fn().mockReturnValue([]),
  setFilters: vi.fn(),
};

export const mockUseKibanaForFilters = ({
  $filterUpdates = defaultConfig.$filterUpdates,
  getFilters = defaultConfig.getFilters,
  setFilters = defaultConfig.setFilters,
}: MockConfig = defaultConfig) => {
  const getFieldsForWildcard = vi.fn();

  (hook as Mocked<typeof hook>).useKibana.mockReturnValue({
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
