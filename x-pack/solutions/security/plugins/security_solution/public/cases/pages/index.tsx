/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux-v7';
import type { CaseViewRefreshPropInterface } from '@kbn/cases-plugin/common';
import { CaseMetricsFeature } from '@kbn/cases-plugin/common';
import type { SelectTimelineModalProps } from '@kbn/cases-plugin/public';
import { CaseDetailsRefreshContext } from '../../common/components/endpoint';
import { TimelineId } from '../../../common/types/timeline';
import { useKibana } from '../../common/lib/kibana';
import { APP_ID, CASES_PATH, SecurityPageName } from '../../../common/constants';
import { timelineActions } from '../../timelines/store';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useInsertTimeline } from '../components/use_insert_timeline';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import * as timelineMarkdownPlugin from '../../common/components/markdown_editor/plugins/timeline';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';
import { CASES_FEATURES } from '..';

const LazySelectTimelineModal = lazy(async () => {
  const { SelectTimelineModal: Component } = await import(
    '../attachments/timeline/select_timeline_modal'
  );
  return { default: Component };
});

const SuspendedSelectTimelineModal: React.FC<SelectTimelineModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazySelectTimelineModal {...props} />
  </Suspense>
);
SuspendedSelectTimelineModal.displayName = 'SuspendedSelectTimelineModal';

const CaseContainerComponent: React.FC = () => {
  const { cases } = useKibana().services;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const dispatch = useDispatch();
  const {
    timelinePrivileges: { read: canSeeTimeline },
  } = useUserPrivileges();
  const { hasAlertsRead, hasAlertsAll } = useAlertsPrivileges();

  const interactionsUpsellingMessage = useUpsellingMessage('investigation_guide_interactions');

  const refreshRef = useRef<CaseViewRefreshPropInterface>(null);

  useEffect(() => {
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.casePage,
        columns: [],
        dataViewId: null,
        indexNames: [],
        show: false,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SecuritySolutionPageWrapper noPadding>
      <CaseDetailsRefreshContext.Provider value={refreshRef}>
        {cases.ui.getCases({
          basePath: CASES_PATH,
          owner: [APP_ID],
          features: {
            ...CASES_FEATURES,
            metrics: [
              CaseMetricsFeature.ALERTS_COUNT,
              CaseMetricsFeature.ALERTS_USERS,
              CaseMetricsFeature.ALERTS_HOSTS,
              CaseMetricsFeature.CONNECTORS,
              CaseMetricsFeature.LIFESPAN,
            ],
            alerts: {
              isExperimental: false,
              read: hasAlertsRead,
              all: hasAlertsAll,
            },
            events: { enabled: true },
          },
          refreshRef,
          timelineIntegration: {
            editor_plugins: {
              parsingPlugin: timelineMarkdownPlugin.parser,
              processingPluginRenderer: timelineMarkdownPlugin.renderer,
              uiPlugin: timelineMarkdownPlugin.plugin({
                interactionsUpsellingMessage,
                canSeeTimeline,
              }),
            },
            hooks: {
              useInsertTimeline,
            },
            components: {
              SelectTimelineModal: SuspendedSelectTimelineModal,
            },
          },
          permissions: userCasesPermissions,
        })}
      </CaseDetailsRefreshContext.Provider>
      <SpyRoute pageName={SecurityPageName.case} />
    </SecuritySolutionPageWrapper>
  );
};

export const Cases = React.memo(CaseContainerComponent);
