/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { GetSecurityAlertsTableProp } from '../../alerts_table/types';
import { useBulkAlertTagsItems } from '../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';

export const getBulkActions =
  (): GetSecurityAlertsTableProp<'getBulkActions'> => (query, refresh) => {
    const bulkAlertTagParams = useMemo(() => {
      return {
        refetch: refresh,
      };
    }, [refresh]);
    const { alertTagsItems, alertTagsPanels } = useBulkAlertTagsItems(bulkAlertTagParams);

    const items = useMemo(() => [...alertTagsItems], [alertTagsItems]);

    return useMemo(() => [{ id: 0, items }, ...alertTagsPanels], [alertTagsPanels, items]);
  };
