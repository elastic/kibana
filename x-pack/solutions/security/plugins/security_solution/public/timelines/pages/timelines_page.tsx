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
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { StatefulOpenTimeline } from '../components/open_timeline';
import * as i18n from './translations';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { EmptyPrompt } from '../../common/components/empty_prompt';

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPage = React.memo(() => {
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();
  const { indicesExist } = useSourcererDataView();
  const capabilitiesCanUserCRUD: boolean =
    !!useKibana().services?.application?.capabilities?.siem?.crud;

  const [isImportDataModalOpen, setImportDataModal] = useState<boolean>(false);
  const openImportModal = useCallback(() => {
    setImportDataModal(true);
  }, [setImportDataModal]);

  const timelineType =
    tabName === TimelineTypeEnum.default ? TimelineTypeEnum.default : TimelineTypeEnum.template;

  return (
    <>
      {indicesExist ? (
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            {capabilitiesCanUserCRUD && (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiButton
                    iconType="indexOpen"
                    onClick={openImportModal}
                    data-test-subj="timelines-page-open-import-data"
                  >
                    {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem data-test-subj="timelines-page-new">
                  <NewTimelineButton type={timelineType} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </HeaderPage>

          <StatefulOpenTimeline
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            isModal={false}
            importDataModalToggle={isImportDataModalOpen && capabilitiesCanUserCRUD}
            setImportDataModalToggle={setImportDataModal}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
            data-test-subj="stateful-open-timeline"
          />
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.timelines} />
    </>
  );
});

TimelinesPage.displayName = 'TimelinesPage';
