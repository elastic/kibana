/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiPageHeader, EuiPageSection } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useParams } from 'react-router-dom';
import { useReadinessTasks } from '@kbn/siem-readiness';
import { SIEM_READINESS_PATH } from '../../../common/constants';
import { VisibilitySectionBoxes, type VisibilityTabId } from './visibility_section_boxes';
import { VisibilitySectionTabs } from './visibility_section_tabs';

const VALID_TABS: VisibilityTabId[] = ['coverage', 'quality', 'continuity', 'retention'];
const DEFAULT_TAB: VisibilityTabId = 'coverage';

const SiemReadinessDashboard = () => {
  const { getReadinessCategories } = useReadinessTasks();
  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();

  // Get selected tab from URL path params
  const selectedTabId = useMemo<VisibilityTabId>(() => {
    return tab && VALID_TABS.includes(tab as VisibilityTabId)
      ? (tab as VisibilityTabId)
      : DEFAULT_TAB;
  }, [tab]);

  // Handle tab selection by updating URL path
  const handleTabSelect = useCallback(
    (tabId: VisibilityTabId) => {
      history.push(`${SIEM_READINESS_PATH}/visibility/${tabId}`);
    },
    [history]
  );

  useEffect(() => {
    if (getReadinessCategories.data) {
      // eslint-disable-next-line no-console
      console.log('Raw Categories Map:', getReadinessCategories.data.rawCategoriesMap);
      // eslint-disable-next-line no-console
      console.log('Main Categories Map:', getReadinessCategories.data.mainCategoriesMap);
    }
  }, [getReadinessCategories.data]);

  return (
    <div>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.securitySolution.siemReadiness.pageTitle', {
          defaultMessage: 'SIEM Readiness',
        })}
        bottomBorder={true}
      />
      <EuiPageSection>
        <VisibilitySectionBoxes selectedTabId={selectedTabId} onTabSelect={handleTabSelect} />
      </EuiPageSection>
      <EuiPageSection>
        <VisibilitySectionTabs selectedTabId={selectedTabId} onTabSelect={handleTabSelect} />
      </EuiPageSection>
    </div>
  );
};

SiemReadinessDashboard.displayName = 'SiemReadinessDashboard';

// eslint-disable-next-line import/no-default-export
export default SiemReadinessDashboard;
