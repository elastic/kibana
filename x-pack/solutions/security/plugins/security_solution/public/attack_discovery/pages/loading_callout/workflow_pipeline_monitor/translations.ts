/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WORKFLOW_EXECUTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.workflowExecution',
  {
    defaultMessage: 'Workflow Execution',
  }
);

export const ALERT_RETRIEVAL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.alertRetrieval',
  {
    defaultMessage: 'Alert retrieval',
  }
);

export const GENERATION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.generation',
  {
    defaultMessage: 'Generation',
  }
);

export const VALIDATION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.validation',
  {
    defaultMessage: 'Validation',
  }
);

export const OPEN_IN_EDITOR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.openInEditor',
  {
    defaultMessage: 'Open in Editor',
  }
);

export const NO_STEPS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.noStepsAvailable',
  {
    defaultMessage: 'No workflow steps available',
  }
);

export const STEP_PENDING = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.stepPending',
  {
    defaultMessage: 'Pending',
  }
);

export const STEP_RUNNING = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.stepRunning',
  {
    defaultMessage: 'Running',
  }
);

export const STEP_COMPLETED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.stepCompleted',
  {
    defaultMessage: 'Completed',
  }
);

export const STEP_FAILED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.stepFailed',
  {
    defaultMessage: 'Failed',
  }
);

export const ELAPSED_TIME = (time: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.elapsedTime',
    {
      defaultMessage: 'Elapsed: {time}',
      values: { time },
    }
  );

export const INSPECT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspect',
  {
    defaultMessage: 'Inspect',
  }
);

export const INSPECT_VALIDATED_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspectValidatedDiscoveries',
  {
    defaultMessage: 'Inspect validated discoveries',
  }
);

export const INSPECT_RAW_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspectRawAlerts',
  {
    defaultMessage: 'Inspect raw alerts',
  }
);

export const NO_ALERTS_TO_INSPECT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.noAlertsToInspect',
  {
    defaultMessage: 'No alerts were retrieved by this workflow',
  }
);

export const INSPECT_COMBINED_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspectCombinedAlerts',
  {
    defaultMessage: 'Inspect combined alerts',
  }
);

export const INSPECT_COMBINED_ALERTS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspectCombinedAlertsTooltip',
  {
    defaultMessage:
      'Inspect the combined alerts from all retrieval workflows, as provided to generation',
  }
);

export const TOTAL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.total',
  {
    defaultMessage: 'total',
  }
);

export const INSPECT_RAW_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.inspectRawDiscoveries',
  {
    defaultMessage: 'Inspect raw discoveries',
  }
);
