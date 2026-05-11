/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import {
  EndpointIsolateSuccess,
  HostIsolationPanel,
} from '../../../common/components/endpoint/host_isolation';
import { useWithCaseDetailsRefresh } from '../../../common/components/endpoint';
import { HOST_ISOLATION_PANEL_TEST_ID } from '../test_ids';

export interface HostIsolationViewProps {
  /**
   * Discover-shaped document. Source of alert id and host name.
   */
  hit: DataTableRecord;
  /**
   * Field-browser shaped data for the alert. Drives the legacy isolate form.
   */
  detailsData: TimelineEventsDetailsItem[];
  /**
   * Whether to render the isolate or release host form.
   */
  isolateAction: 'isolateHost' | 'unisolateHost';
  /**
   * Closes the surrounding system flyout when the user cancels the form.
   */
  onClose: () => void;
}

/**
 * Body of the host isolation tools flyout. Renders the legacy isolate/unisolate
 * form and a success banner once the action completes.
 */
export const HostIsolationView: FC<HostIsolationViewProps> = ({
  hit,
  detailsData,
  isolateAction,
  onClose,
}) => {
  const alertId = getFieldValue(hit, '_id') as string;
  const hostName = getFieldValue(hit, 'host.name') as string;
  const caseDetailsRefresh = useWithCaseDetailsRefresh();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSuccess = useCallback(() => {
    setIsSuccess(true);
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshCase();
    }
  }, [caseDetailsRefresh]);

  return (
    <div data-test-subj={HOST_ISOLATION_PANEL_TEST_ID}>
      {isSuccess && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <HostIsolationPanel
        details={detailsData}
        cancelCallback={onClose}
        successCallback={handleSuccess}
        isolateAction={isolateAction}
      />
    </div>
  );
};

HostIsolationView.displayName = 'HostIsolationView';
