/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageSection, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useHistory, useParams } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { MainCategories } from '@kbn/siem-readiness';
import { ALL_CATEGORIES } from '@kbn/siem-readiness';
import { SIEM_READINESS_PATH } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../common/lib/telemetry/events/siem_readiness/types';
import { VisibilitySectionBoxes, type VisibilityTabId } from './visibility_section_boxes';
import { VisibilitySectionTabs } from './visibility_section_tabs';
import {
  CategoryConfigurationPanel,
  ACTIVE_CATEGORIES_STORAGE_KEY,
} from './components/configuration_panel';

const VALID_TABS: VisibilityTabId[] = ['coverage', 'quality', 'continuity', 'retention'];
const DEFAULT_TAB: VisibilityTabId = 'coverage';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.siemReadiness.pageTitle', {
  defaultMessage: 'SIEM Readiness',
});

const TECHNICAL_PREVIEW_BADGE = i18n.translate(
  'xpack.securitySolution.siemReadiness.technicalPreviewBadgeLabel',
  { defaultMessage: 'Technical Preview' }
);

const CONFIGURATIONS_LABEL = i18n.translate(
  'xpack.securitySolution.siemReadiness.configurations',
  { defaultMessage: 'Configurations' }
);

const SiemReadinessDashboard = () => {
  const history = useHistory();
  const { tab } = useParams<{ tab?: string }>();
  const { telemetry } = useKibana().services;
  const { euiTheme } = useEuiTheme();

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
      telemetry.reportEvent(SiemReadinessEventTypes.TabVisited, { tabId });
      history.push(`${SIEM_READINESS_PATH}/visibility/${tabId}`);
    },
    [history, telemetry]
  );

  const badges = useMemo<AppHeaderBadge[]>(
    () => [
      {
        label: TECHNICAL_PREVIEW_BADGE,
        color: 'hollow',
        'data-test-subj': 'siemReadinessPreviewBadge',
      },
    ],
    []
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'configurations',
          label: CONFIGURATIONS_LABEL,
          iconType: 'gear',
          testId: 'configurationsButton',
          run: () => setIsConfigModalVisible(true),
        },
      ],
    }),
    []
  );

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  // Route uses noPadding on the page wrapper; escape the section gutter and re-apply the 16px grid.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  return (
    <div css={chromeNextPage}>
      {/* [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed. */}
      <AppHeader
        title={PAGE_TITLE}
        badges={badges}
        menu={menu}
        spacing="bleed"
      />
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
