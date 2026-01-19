/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAdditionalBulkActions } from './use_additional_bulk_actions';
import { useBulkAlertTagsItems } from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';

jest.mock('../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items');

describe('useAdditionalBulkActions', () => {
  it('should return showAssistant true and a value for promptContextId', () => {
    (useBulkAlertTagsItems as jest.Mock).mockReturnValue({
      alertTagsItems: ['item'],
      alertTagsPanels: ['panel'],
    });

    const hookResult = renderHook(() => useAdditionalBulkActions({ refetch: jest.fn() }));

    expect(hookResult.result.current).toEqual([
      {
        id: 0,
        items: ['item'],
      },
      'panel',
    ]);
  });
});
