/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import {
  EndpointIsolateSuccess,
  HostIsolationPanel,
} from '../../../common/components/endpoint/host_isolation';
import { useWithCaseDetailsRefresh } from '../../../common/components/endpoint';
import { useBasicDataFromDetailsData } from '../../../flyout/document_details/shared/hooks/use_basic_data_from_details_data';
import { HOST_ISOLATION_PANEL_TEST_ID } from '../test_ids';

export interface HostIsolationViewProps {
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
  detailsData,
  isolateAction,
  onClose,
}) => {
  const { alertId, hostName } = useBasicDataFromDetailsData(detailsData);
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
