/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { MainCategories } from '@kbn/siem-readiness';
import { ALL_CATEGORIES } from '@kbn/siem-readiness';
import { SIEM_READINESS_PATH } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../common/lib/telemetry/events/siem_readiness/types';
import { VisibilitySectionBoxes, type VisibilityTabId } from './visibility_section_boxes';
import { VisibilitySectionTabs } from './visibility_section_tabs';
import { SiemReadinessHeader } from './siem_readiness_header';
import { ACTIVE_CATEGORIES_STORAGE_KEY } from './components/configuration_panel';

const VALID_TABS: VisibilityTabId[] = ['coverage', 'quality', 'continuity', 'retention'];
const DEFAULT_TAB: VisibilityTabId = 'coverage';

const SiemReadinessDashboard = () => {
  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();
  const { telemetry } = useKibana().services;

  // Persistent state for category filtering (shared with configuration panel)
  const [activeCategories, setActiveCategories] = useLocalStorage<MainCategories[]>(
    ACTIVE_CATEGORIES_STORAGE_KEY,
    ALL_CATEGORIES
  );

  // Get selected tab from URL path params
  const selectedTabId = useMemo<VisibilityTabId>(() => {
    return tab && VALID_TABS.includes(tab as VisibilityTabId)
      ? (tab as VisibilityTabId)
      : DEFAULT_TAB;
  }, [tab]);

  // Handle tab selection by updating URL path
  const handleTabSelect = useCallback(
    (tabId: VisibilityTabId) => {
      telemetry.reportEvent(SiemReadinessEventTypes.TabVisited, { tabId });
      history.push(`${SIEM_READINESS_PATH}/visibility/${tabId}`);
    },
    [history, telemetry]
  );

  return (
    <div>
      <SiemReadinessHeader onConfigurationsSave={setActiveCategories} />
      <EuiSpacer />
      <EuiPageSection paddingSize="none">
        <VisibilitySectionBoxes
          selectedTabId={selectedTabId}
          onTabSelect={handleTabSelect}
          activeCategories={activeCategories ?? ALL_CATEGORIES}
        />
      </EuiPageSection>
      <EuiSpacer />
      <EuiPageSection paddingSize="none">
        <VisibilitySectionTabs
          selectedTabId={selectedTabId}
          onTabSelect={handleTabSelect}
          activeCategories={activeCategories ?? ALL_CATEGORIES}
        />
      </EuiPageSection>
    </div>
  );
};

SiemReadinessDashboard.displayName = 'SiemReadinessDashboard';

// eslint-disable-next-line import/no-default-export
export default SiemReadinessDashboard;
