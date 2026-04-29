/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import type { AlertsTableOnLoadedProps } from '@kbn/response-ops-alerts-table/types';
import { TableId } from '@kbn/securitysolution-data-table';
import { getManualAlertIds } from '@kbn/cases-plugin/common';
import { AlertsTable } from '../../../../detections/components/alerts_table';
import { EaseAlertsTable } from '../../../components/ease/wrapper';
import { useFetchNotes } from '../../../../notes/hooks/use_fetch_notes';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useKibana } from '../../../../common/lib/kibana';
import { NoPrivileges } from '../../../../common/components/no_privileges';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { ALERTS_EMPTY_DESCRIPTION } from '../translations';

export const AlertTabContent: React.FC<CommonAttachmentTabViewProps> = ({ caseData }) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const { onLoad: onAlertsTableLoaded } = useFetchNotes();
  const { hasAlertsRead } = useAlertsPrivileges();

  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218741
  const EASE = capabilities[SECURITY_FEATURE_ID].configurations;

  const alertIds = useMemo(() => getManualAlertIds(caseData.comments), [caseData.comments]);
  const alertIdsQuery = useMemo(
    () => ({
      ids: { values: alertIds },
    }),
    [alertIds]
  );

  const onLoaded = useCallback(
    ({ alerts }: AlertsTableOnLoadedProps) => onAlertsTableLoaded(alerts),
    [onAlertsTableLoaded]
  );

  if (!hasAlertsRead) {
    return (
      <NoPrivileges pageName="alerts" docLinkSelector={(docLinks) => docLinks.siem.privileges} />
    );
  }

  if (alertIds.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiEmptyPrompt
            data-test-subj="caseViewAlertsEmpty"
            iconType="casesApp"
            iconColor="default"
            titleSize="xs"
            body={<p>{ALERTS_EMPTY_DESCRIPTION}</p>}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexItem data-test-subj="case-view-alerts">
      {EASE ? (
        <EaseAlertsTable
          id={`case-details-alerts-${caseData.owner}`}
          onLoaded={onLoaded}
          query={alertIdsQuery}
        />
      ) : (
        <AlertsTable
          tableType={TableId.alertsOnCasePage}
          id={`case-details-alerts-${caseData.owner}`}
          onLoaded={onLoaded}
          query={alertIdsQuery}
        />
      )}
    </EuiFlexItem>
  );
};

AlertTabContent.displayName = 'AlertTabContent';
