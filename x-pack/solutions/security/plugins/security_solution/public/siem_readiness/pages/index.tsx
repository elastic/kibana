/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageHeader, EuiPageSection, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useParams } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { MainCategories } from '@kbn/siem-readiness';
import { ALL_CATEGORIES } from '@kbn/siem-readiness';
import { SIEM_READINESS_PATH } from '../../../common/constants';
import { VisibilitySectionBoxes, type VisibilityTabId } from './visibility_section_boxes';
import { VisibilitySectionTabs } from './visibility_section_tabs';
import {
  CategoryConfigurationPanel,
  ACTIVE_CATEGORIES_STORAGE_KEY,
} from './components/configuration_panel';

const VALID_TABS: VisibilityTabId[] = ['coverage', 'quality', 'continuity', 'retention'];
const DEFAULT_TAB: VisibilityTabId = 'coverage';

const SiemReadinessDashboard = () => {
  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();

  // Persistent state for category filtering (shared with configuration panel)
  const [activeCategories, setActiveCategories] = useLocalStorage<MainCategories[]>(
    ACTIVE_CATEGORIES_STORAGE_KEY,
    ALL_CATEGORIES
  );

  // State for showing configuration modal
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

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

  return (
    <div>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.securitySolution.siemReadiness.pageTitle', {
          defaultMessage: 'SIEM Readiness',
        })}
        bottomBorder={true}
        rightSideItems={[
          <EuiButtonEmpty
            iconSide="right"
            size="s"
            iconType="gear"
            onClick={() => setIsConfigModalVisible(true)}
            data-test-subj="configurationsButton"
          >
            {i18n.translate('xpack.securitySolution.siemReadiness.configurations', {
              defaultMessage: 'Configurations',
            })}
          </EuiButtonEmpty>,
        ]}
      />
      <EuiSpacer />
      <EuiPageSection paddingSize="none">
        <VisibilitySectionBoxes selectedTabId={selectedTabId} onTabSelect={handleTabSelect} />
      </EuiPageSection>
      <EuiSpacer />
      <EuiPageSection paddingSize="none">
        <VisibilitySectionTabs
          selectedTabId={selectedTabId}
          onTabSelect={handleTabSelect}
          activeCategories={activeCategories ?? ALL_CATEGORIES}
        />
      </EuiPageSection>
      {isConfigModalVisible && (
        <CategoryConfigurationPanel
          onClose={() => setIsConfigModalVisible(false)}
          onSave={setActiveCategories}
        />
      )}
    </div>
  );
};

SiemReadinessDashboard.displayName = 'SiemReadinessDashboard';

// eslint-disable-next-line import/no-default-export
export default SiemReadinessDashboard;
