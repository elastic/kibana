/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { useIOCDetailsContext } from './context';
import { Header } from '../../flyout_v2/ioc/header';
import { Content } from '../../flyout_v2/ioc/content';
import { Footer } from '../../flyout_v2/ioc/footer';
import { getTabsDisplayed } from '../../flyout_v2/ioc/tabs';
import type { RightPanelPaths } from '../../flyout_v2/ioc/tabs';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import { FlyoutHeader } from '../shared/components/flyout_header';
import type { IOCDetailsProps } from './types';
import { IOCRightPanelKey } from './constants/panel_keys';
import { useTabs } from './hooks/use_tabs';
import { FLYOUT_STORAGE_KEYS } from '../../flyout_v2/ioc/constants/local_storage';
import { useKibana } from '../../common/lib/kibana';
import { FLYOUT_FOOTER_TEST_ID } from '../document_details/right/test_ids';
import { iocFlyoutBodyCss } from '../../flyout_v2/ioc';
import { cellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';

/**
 * Panel to be displayed in the ioc details expandable flyout right section
 */
export const IOCPanel: FC<Partial<IOCDetailsProps>> = memo(({ path }) => {
  const { storage } = useKibana().services;
  const { indicator } = useIOCDetailsContext();
  const { openRightPanel } = useExpandableFlyoutApi();

  const { selectedTabId } = useTabs({ path });

  const setSelectedTabId = useCallback(
    (tabId: RightPanelPaths) => {
      openRightPanel({
        id: IOCRightPanelKey,
        path: {
          tab: tabId,
        },
        params: {
          id: indicator._id,
        },
      });

      storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);
    },
    [indicator._id, openRightPanel, storage]
  );

  const onViewAllFieldsInTable = useCallback(() => {
    setSelectedTabId('table');
  }, [setSelectedTabId]);

  const tabs = useMemo(
    () =>
      getTabsDisplayed({
        indicator,
        onViewAllFieldsInTable,
        renderCellActions: cellActionRenderer,
      }),
    [indicator, onViewAllFieldsInTable]
  );

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader css={{ '.euiFlyoutHeader > .euiPanel': { 'padding-bottom': '0' } }}>
        <Header
          indicator={indicator}
          tabs={tabs}
          selectedTabId={selectedTabId}
          setSelectedTabId={setSelectedTabId}
          renderCellActions={cellActionRenderer}
        />
      </FlyoutHeader>
      <EuiFlyoutBody css={iocFlyoutBodyCss}>
        <EuiPanel hasShadow={false} color="transparent" css={{ height: '100%' }}>
          <Content tabs={tabs} selectedTabId={selectedTabId} />
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
        <EuiPanel color="transparent">
          <Footer indicator={indicator} />
        </EuiPanel>
      </EuiFlyoutFooter>
    </>
  );
});

IOCPanel.displayName = 'IOCPanel';
