/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { AppMenuItemType, AppMenuRunActionParams } from '@kbn/app-menu';
import type { MainCategories } from '@kbn/siem-readiness';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana } from '../../common/lib/kibana';
import { TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_TOOLTIP } from '../../common/translations';
import { CategoryConfigurationPanel } from './components/configuration_panel';

export const CONFIGURATIONS_MENU_ITEM_TEST_ID = 'siemReadinessConfigurationsMenuItem';
export const TECHNICAL_PREVIEW_BADGE_TEST_ID = 'siemReadinessPreviewBadge';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.siemReadiness.pageTitle', {
  defaultMessage: 'SIEM Readiness',
});

const CONFIGURATIONS = i18n.translate('xpack.securitySolution.siemReadiness.configurations', {
  defaultMessage: 'Configurations',
});

const BADGES: AppHeaderBadge[] = [
  {
    label: TECHNICAL_PREVIEW.toUpperCase(),
    tooltip: TECHNICAL_PREVIEW_TOOLTIP,
    color: 'hollow',
    'data-test-subj': TECHNICAL_PREVIEW_BADGE_TEST_ID,
  },
];

interface SiemReadinessHeaderProps {
  /** Notifies the page of saved categories since `useLocalStorage` doesn't sync across components in the same tab */
  onConfigurationsSave: (categories: MainCategories[]) => void;
}

/**
 * SIEM readiness page header. Surfaces the category configuration modal as an app menu action.
 */
export const SiemReadinessHeader = React.memo<SiemReadinessHeaderProps>(
  ({ onConfigurationsSave }) => {
    const {
      services: { docLinks },
    } = useKibana();
    const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
    const returnFocusRef = useRef<(() => void) | undefined>();

    const handleClose = useCallback(() => {
      setIsConfigModalVisible(false);
    }, []);

    useLayoutEffect(() => {
      if (isConfigModalVisible) {
        return;
      }

      const returnFocus = returnFocusRef.current;
      returnFocusRef.current = undefined;
      returnFocus?.();
    }, [isConfigModalVisible]);

    const handleOpen = useCallback((params?: AppMenuRunActionParams) => {
      returnFocusRef.current = params?.returnFocus;
      setIsConfigModalVisible(true);
    }, []);

    const menu = useMemo(() => {
      const items: AppMenuItemType[] = [
        {
          id: 'siemReadinessConfigurations',
          label: CONFIGURATIONS,
          iconType: 'gear',
          run: handleOpen,
          testId: CONFIGURATIONS_MENU_ITEM_TEST_ID,
        },
      ];

      return { items };
    }, [handleOpen]);

    return (
      <>
        <SecurityAppHeader
          title={PAGE_TITLE}
          badges={BADGES}
          menu={menu}
          docLink={docLinks.links.siem.guide}
          spacing="largeBleed"
        />
        {isConfigModalVisible && (
          <CategoryConfigurationPanel onClose={handleClose} onSave={onConfigurationsSave} />
        )}
      </>
    );
  }
);

SiemReadinessHeader.displayName = 'SiemReadinessHeader';
