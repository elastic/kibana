/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TimelineId } from '../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../common/api/timeline';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { StatefulOpenTimeline } from '../components/open_timeline';
import { SecurityPageName } from '../../app/types';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { PageScope } from '../../data_view_manager/constants';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { useCreateTimeline } from '../hooks/use_create_timeline';
import { useKibana } from '../../common/lib/kibana';
import { getTimelinesHeaderAppActionsConfig } from '../../app/home/header_app_actions/header_app_actions_config';
import * as i18n from './translations';

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPage = React.memo(() => {
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { indicesExist: oldIndicesExist } = useSourcererDataView();

  const { dataView, status } = useDataView(PageScope.default);
  const experimentalIndicesExist = dataView?.hasMatchedIndices();

  const indicesExist = newDataViewPickerEnabled ? experimentalIndicesExist : oldIndicesExist;

  const {
    timelinePrivileges: { crud: canWriteTimeline },
  } = useUserPrivileges();

  const { chrome } = useKibana().services;
  const timelineType =
    tabName === TimelineTypeEnum.default ? TimelineTypeEnum.default : TimelineTypeEnum.template;
  const createNewTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType,
  });

  const [isImportDataModalOpen, setImportDataModal] = useState<boolean>(false);
  const openImportModal = useCallback(() => {
    setImportDataModal(true);
  }, []);

  const handleNew = useCallback(async () => {
    await createNewTimeline();
  }, [createNewTimeline]);

  useEffect(() => {
    if (chrome?.setHeaderAppActionsConfig && indicesExist) {
      chrome.setHeaderAppActionsConfig(
        getTimelinesHeaderAppActionsConfig({
          onImport: openImportModal,
          onNew: handleNew,
          showImport: canWriteTimeline,
        })
      );
      return () => {
        chrome.setHeaderAppActionsConfig(undefined);
      };
    }
  }, [
    chrome,
    indicesExist,
    openImportModal,
    handleNew,
    canWriteTimeline,
  ]);

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.timelines}>
      {indicesExist ? (
        <SecuritySolutionPageWrapper>
          <EuiPageSection paddingSize="m" component="div" grow>
            <StatefulOpenTimeline
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              importDataModalToggle={isImportDataModalOpen && canWriteTimeline}
              setImportDataModalToggle={setImportDataModal}
              title={i18n.ALL_TIMELINES_PANEL_TITLE}
              data-test-subj="stateful-open-timeline"
            />
          </EuiPageSection>
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}
    </SecurityRoutePageWrapper>
  );
});

TimelinesPage.displayName = 'TimelinesPage';
