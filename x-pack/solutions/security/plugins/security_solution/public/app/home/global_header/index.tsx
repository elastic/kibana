/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiHeaderLinks, EuiHeaderSection, EuiHeaderSectionItem } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import useObservable from 'react-use/lib/useObservable';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { PageScope } from '../../../data_view_manager/constants';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import { useKibana } from '../../../common/lib/kibana';
import {
  isDashboardViewPath,
  isDetectionsPath,
  isRuleChangesHistoryPath,
} from '../../../helpers';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { timelineSelectors } from '../../../timelines/store';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import {
  getScopeFromPath,
  showDataViewPickerByPath,
} from '../../../sourcerer/containers/sourcerer_paths';
import { DataViewPicker } from '../../../data_view_manager/components/data_view_picker';

/**
 * This component uses the reverse portal to add ML job settings and the data view
 * picker on the right hand side of the Kibana global header.
 *
 * The Security solution view (`project` chrome) does not mount this action-menu bar.
 * Classic no longer shows Add integrations here; that action lives in the in-page
 * AppHeader overflow instead.
 */
export const GlobalHeader = React.memo(() => {
  const portalNode = useMemo(() => createHtmlPortalNode(), []);
  const {
    theme,
    setHeaderActionMenu,
    i18n: kibanaServiceI18n,
    chrome,
  } = useKibana().services;
  const chromeStyle$ = useMemo(() => chrome.getChromeStyle$(), [chrome]);
  const chromeStyle = useObservable(chromeStyle$, chrome.getChromeStyle());
  const isSecuritySolutionView = chromeStyle === 'project';
  const { pathname } = useLocation();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const showTimeline = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
  );

  const pageScope = getScopeFromPath(pathname);
  const showDataViewPicker = showDataViewPickerByPath(pathname);
  const dashboardViewPath = isDashboardViewPath(pathname);
  const changesHistoryPath = isRuleChangesHistoryPath(pathname);

  useEffect(() => {
    if (!setHeaderActionMenu) {
      return;
    }

    if (changesHistoryPath || isSecuritySolutionView) {
      setHeaderActionMenu(undefined);
      return;
    }

    setHeaderActionMenu((element) => {
      const mount = toMountPoint(<OutPortal node={portalNode} />, {
        theme,
        i18n: kibanaServiceI18n,
      });
      return mount(element);
    });

    return () => {
      /* Dashboard mounts an edit toolbar, it should be restored when leaving dashboard editing page */
      if (dashboardViewPath) {
        return;
      }
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [
    portalNode,
    setHeaderActionMenu,
    theme,
    kibanaServiceI18n,
    dashboardViewPath,
    changesHistoryPath,
    isSecuritySolutionView,
  ]);

  if (isSecuritySolutionView) {
    return null;
  }

  return (
    <InPortal node={portalNode}>
      <EuiHeaderSection side="right">
        {isDetectionsPath(pathname) && (
          <EuiHeaderSectionItem>
            <MlPopover />
          </EuiHeaderSectionItem>
        )}

        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            {showDataViewPicker && !showTimeline && (
              <DataViewPicker scope={pageScope} disabled={pageScope === PageScope.alerts} />
            )}
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </InPortal>
  );
});
GlobalHeader.displayName = 'GlobalHeader';
