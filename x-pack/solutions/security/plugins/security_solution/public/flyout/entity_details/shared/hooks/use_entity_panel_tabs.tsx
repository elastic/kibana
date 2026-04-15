/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityPanelTabType } from '../components/entity_panel_tabs';
import type { EntityStoreRecord } from './use_entity_from_store';
import {
  ENTITY_PANEL_OVERVIEW_TAB_TEST_ID,
  ENTITY_PANEL_TABLE_TAB_TEST_ID,
} from '../components/right/test_ids';

export const OVERVIEW_TAB_ID = 'overview';
export const TABLE_TAB_ID = 'table';

interface UseEntityPanelTabsParams {
  /** The entity store record (used to determine if tabs should show) */
  entityRecord: EntityStoreRecord | null | undefined;
}

interface UseEntityPanelTabsResult {
  /** Tab definitions. Null when entity is not in the store (no tabs should render). */
  tabs: EntityPanelTabType[] | null;
  /** Currently selected tab ID */
  selectedTabId: string;
  /** Setter for selected tab ID */
  setSelectedTabId: (id: string) => void;
}

export const useEntityPanelTabs = ({
  entityRecord,
}: UseEntityPanelTabsParams): UseEntityPanelTabsResult => {
  const [selectedTabId, setSelectedTabId] = useState<string>(OVERVIEW_TAB_ID);

  const tabs = useMemo<EntityPanelTabType[] | null>(() => {
    if (!entityRecord) {
      return null;
    }

    return [
      {
        id: OVERVIEW_TAB_ID,
        'data-test-subj': ENTITY_PANEL_OVERVIEW_TAB_TEST_ID,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.overviewTabLabel"
            defaultMessage="Overview"
          />
        ),
      },
      {
        id: TABLE_TAB_ID,
        'data-test-subj': ENTITY_PANEL_TABLE_TAB_TEST_ID,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.tableTabLabel"
            defaultMessage="Table"
          />
        ),
      },
    ];
  }, [entityRecord]);

  return { tabs, selectedTabId, setSelectedTabId };
};
