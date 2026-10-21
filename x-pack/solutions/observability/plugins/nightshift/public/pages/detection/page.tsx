/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NightshiftAppHeader } from '../../app/app_header';
import type { NightshiftAppHeaderProps } from '../../app/app_header';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { useKibana } from '../../hooks/use_kibana';
import { DETECTION_OVERVIEW_TIME_RANGE } from './constants';
import { DetectionOverview } from './overview/detection_overview';

export type DetectionPageHeaderProps = Pick<
  NightshiftAppHeaderProps,
  | 'onSourcesClick'
  | 'sourcesHref'
  | 'onKnowledgeClick'
  | 'knowledgeHref'
  | 'onSettingsClick'
  | 'settingsHref'
  | 'onSandboxSecretsClick'
  | 'onAutomationsClick'
  | 'automationsHref'
>;

export const DetectionPage = ({
  headerProps,
}: {
  headerProps: DetectionPageHeaderProps;
}): React.ReactElement => {
  const { application } = useKibana().services;
  const maintenanceStatus = useMaintenanceStatus();
  const overview = useDetectionOverview(DETECTION_OVERVIEW_TIME_RANGE);

  return (
    <>
      <NightshiftAppHeader
        {...headerProps}
        page="detection"
        back={{
          href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' }),
          label: i18n.translate('xpack.nightshift.detectionPage.backToNightshiftLabel', {
            defaultMessage: 'Nightshift',
          }),
        }}
      />
      <EuiPageTemplate.Section component="div" restrictWidth={false}>
        <DetectionOverview
          status={maintenanceStatus.data}
          isStatusLoading={maintenanceStatus.isLoading}
          isStatusError={maintenanceStatus.isError}
          counts={overview.data}
          isCountsLoading={overview.isLoading}
          isCountsError={overview.isError}
          onRetry={() => void overview.refetch()}
        />
      </EuiPageTemplate.Section>
    </>
  );
};
