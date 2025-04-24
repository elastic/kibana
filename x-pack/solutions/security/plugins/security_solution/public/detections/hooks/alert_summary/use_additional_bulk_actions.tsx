/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BulkActionsPanelConfig } from '@kbn/response-ops-alerts-table/types';
import { useBulkAlertTagsItems } from '../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';

/**
 * Hook that returns a list of action items and their respective panels when necessary.
 * The result is passed to the `additionalBulkActions` property of the ResponseOps alerts table.
 * These will be displayed in the Alert summary page table.
 */
export const useAdditionalBulkActions = (): BulkActionsPanelConfig[] => {
  const { alertTagsItems, alertTagsPanels } = useBulkAlertTagsItems({});

  return useMemo(
    () => [{ id: 0, items: alertTagsItems }, ...alertTagsPanels],
    [alertTagsItems, alertTagsPanels]
  );
};
