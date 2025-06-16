/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { demoEndpointProcessExecutionMalwarePreventionAlert } from '../../../../common/demo_data/endpoint/process_execution_malware_prevention_alert';
import { createEndpointAlertsRowRenderer } from '../../timeline/body/renderers/system/generic_row_renderer';
import { WAS_PREVENTED_FROM_EXECUTING_A_MALICIOUS_PROCESS } from '../../timeline/body/renderers/system/translations';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../constants';

const AlertsExampleComponent: React.FC = () => {
  const alertsRowRenderer = createEndpointAlertsRowRenderer({
    eventAction: 'execution',
    eventCategory: 'process',
    eventType: 'denied',
    skipRedundantFileDetails: true,
    text: WAS_PREVENTED_FROM_EXECUTING_A_MALICIOUS_PROCESS,
  });

  return (
    <>
      {alertsRowRenderer.renderRow({
        data: demoEndpointProcessExecutionMalwarePreventionAlert,
        scopeId: ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID,
      })}
    </>
  );
};
export const AlertsExample = React.memo(AlertsExampleComponent);
