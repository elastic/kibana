/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

import { toMountPoint } from '@kbn/react-kibana-mount';
import { PageScope } from '../../../data_view_manager/constants';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../common/lib/kibana';
import { isDashboardViewPath } from '../../../helpers';
import { Sourcerer } from '../../../sourcerer/components';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { timelineSelectors } from '../../../timelines/store';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import {
  getScopeFromPath,
  showSourcererByPath,
} from '../../../sourcerer/containers/sourcerer_paths';
import { DataViewPicker } from '../../../data_view_manager/components/data_view_picker';

// Commented out so the app menu is not dominated by a single "Add integrations" item
// const BUTTON_ADD_DATA = i18n.translate('xpack.securitySolution.globalHeader.buttonAddData', {
//   defaultMessage: 'Add integrations',
// });

/**
 * This component uses the reverse portal to add the Add Data, ML job settings, and AI Assistant buttons on the
 * right hand side of the Kibana global header
 */
export const GlobalHeader = React.memo(() => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const portalNode = useMemo(() => createHtmlPortalNode(), []);
  const {
    theme,
    setHeaderActionMenu,
    i18n: kibanaServiceI18n,
  } = useKibana().services;
  const { pathname } = useLocation();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const showTimeline = useShallowEqualSelector(
    (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
  );

  const sourcererScope = getScopeFromPath(pathname, newDataViewPickerEnabled);
  const showSourcerer = showSourcererByPath(pathname);
  const dashboardViewPath = isDashboardViewPath(pathname);

  const hasHeaderContent = showSourcerer && !showTimeline;

  useEffect(() => {
    if (!setHeaderActionMenu) return;

    if (hasHeaderContent) {
      setHeaderActionMenu((element) => {
        const mount = toMountPoint(<OutPortal node={portalNode} />, {
          theme,
          i18n: kibanaServiceI18n,
        });
        return mount(element);
      });
    } else {
      setHeaderActionMenu(undefined);
    }

    return () => {
      /* Dashboard mounts an edit toolbar, it should be restored when leaving dashboard editing page */
      if (dashboardViewPath) {
        return;
      }
      portalNode.unmount();
      setHeaderActionMenu(undefined);
    };
  }, [
    hasHeaderContent,
    portalNode,
    setHeaderActionMenu,
    theme,
    kibanaServiceI18n,
    dashboardViewPath,
  ]);

  const dataViewPicker = newDataViewPickerEnabled ? (
    <DataViewPicker scope={sourcererScope} disabled={sourcererScope === PageScope.alerts} />
  ) : (
    <Sourcerer scope={sourcererScope} data-test-subj="sourcerer" />
  );

  return (
    <InPortal node={portalNode}>
      <EuiHeaderSection side="right">
        {/* MlPopover and Add integrations button commented out so the app menu is not dominated by a single item */}

        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            {showSourcerer && !showTimeline && dataViewPicker}
          </EuiHeaderLinks>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </InPortal>
  );
});
GlobalHeader.displayName = 'GlobalHeader';
