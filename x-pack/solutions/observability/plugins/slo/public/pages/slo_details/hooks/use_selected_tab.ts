/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SloDetailsPathParams } from '../types';
import {
  ALERTS_TAB_ID,
  HISTORY_TAB_ID,
  OVERVIEW_TAB_ID,
  SloTabId,
} from '../components/slo_details';

export const useSelectedTab = () => {
  const { tabId } = useParams<SloDetailsPathParams>();

  const [selectedTabId, setSelectedTabId] = useState(() => {
    return tabId && [OVERVIEW_TAB_ID, ALERTS_TAB_ID, HISTORY_TAB_ID].includes(tabId)
      ? (tabId as SloTabId)
      : OVERVIEW_TAB_ID;
  });

  useEffect(() => {
    // update the url when the selected tab changes
    if (tabId !== selectedTabId) {
      setSelectedTabId(tabId as SloTabId);
    }
  }, [selectedTabId, tabId]);

  return {
    selectedTabId: selectedTabId || OVERVIEW_TAB_ID,
    setSelectedTabId,
  };
};
