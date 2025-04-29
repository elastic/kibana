/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTableContextMenuItem } from '../../../../../../detections/components/alerts_table/types';
import { ISOLATE_HOST } from '../translations';

const useHostIsolationActionMock = (): AlertTableContextMenuItem[] => {
  return [
    {
      key: 'isolate-host-action-item',
      'data-test-subj': 'isolate-host-action-item',
      disabled: false,
      onClick: jest.fn(),
      name: ISOLATE_HOST,
    },
  ];
};

export { useHostIsolationActionMock as useHostIsolationAction };
