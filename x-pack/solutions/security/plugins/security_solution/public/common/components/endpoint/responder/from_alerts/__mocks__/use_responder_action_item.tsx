/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTableContextMenuItem } from '../../../../../../detections/components/alerts_table/types';

const useResponderActionItemMock = (): AlertTableContextMenuItem[] => {
  return [
    {
      key: 'endpointResponseActions-action-item',
      'data-test-subj': 'endpointResponseActions-action-item',
      disabled: false,
      toolTipContent: undefined,
      size: 's',
      onClick: jest.fn(),
      name: 'Respond',
    },
  ];
};

export { useResponderActionItemMock as useResponderActionItem };
