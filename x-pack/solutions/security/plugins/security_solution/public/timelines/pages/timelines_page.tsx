/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { NewTimelineButton } from '../components/new_timeline';
import { TimelineTypeEnum } from '../../../common/api/timeline';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { StatefulOpenTimeline } from '../components/open_timeline';
import * as i18n from './translations';
import { SecurityPageName } from '../../app/types';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { DataViewManagerScopeName } from '../../data_view_manager/constants';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPage = React.memo(() => {
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { indicesExist: oldIndicesExist } = useSourcererDataView();

  const { dataView, status } = useDataView(DataViewManagerScopeName.default);
  // NOTE: there should be a Suspense / some kind of loader here as this value is not settled immediately
  const experimentalIndicesExist = !!dataView.matchedIndices.length;

  const indicesExist = newDataViewPickerEnabled ? experimentalIndicesExist : oldIndicesExist;

  const {
    timelinePrivileges: { crud: canWriteTimeline },
  } = useUserPrivileges();

  const [isImportDataModalOpen, setImportDataModal] = useState<boolean>(false);
  const openImportModal = useCallback(() => {
    setImportDataModal(true);
  }, [setImportDataModal]);

  const timelineType =
    tabName === TimelineTypeEnum.default ? TimelineTypeEnum.default : TimelineTypeEnum.template;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.timelines}>
      {indicesExist ? (
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {canWriteTimeline && (
                <EuiFlexItem>
                  <EuiButton
                    iconType="indexOpen"
                    onClick={openImportModal}
                    data-test-subj="timelines-page-open-import-data"
                  >
                    {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
                  </EuiButton>
                </EuiFlexItem>
              )}

              <EuiFlexItem data-test-subj="timelines-page-new">
                <NewTimelineButton type={timelineType} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>

          <StatefulOpenTimeline
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            isModal={false}
            importDataModalToggle={isImportDataModalOpen && canWriteTimeline}
            setImportDataModalToggle={setImportDataModal}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
            data-test-subj="stateful-open-timeline"
          />
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}
    </SecurityRoutePageWrapper>
  );
});

TimelinesPage.displayName = 'TimelinesPage';
