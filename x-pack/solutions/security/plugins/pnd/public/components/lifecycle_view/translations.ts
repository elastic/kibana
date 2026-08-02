/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VIEW_STEP = i18n.translate('xpack.pnd.lifecycleView.viewStep', {
  defaultMessage: 'View step',
});

export const VIEW_STEP_TOOLTIP = i18n.translate('xpack.pnd.lifecycleView.viewStepTooltip', {
  defaultMessage: 'Open this step execution in the Workflows app, in a new tab',
});

export const NO_STEP_EXECUTION = i18n.translate('xpack.pnd.lifecycleView.noStepExecution', {
  defaultMessage: 'No step execution yet',
});

export const NO_STEP_EXECUTION_TOOLTIP = i18n.translate(
  'xpack.pnd.lifecycleView.noStepExecutionTooltip',
  {
    defaultMessage:
      'Nothing has executed for this step, so there is no execution to link to. The link appears once it runs.',
  }
);

export const WORKFLOWS_APP_UNAVAILABLE = i18n.translate(
  'xpack.pnd.lifecycleView.workflowsAppUnavailable',
  {
    defaultMessage: 'Workflows app unavailable',
  }
);

export const WORKFLOWS_APP_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.pnd.lifecycleView.workflowsAppUnavailableTooltip',
  {
    defaultMessage:
      'This step really executed, but the Workflows app is not available on this Kibana, so there is nowhere to open it.',
  }
);

export const SAME_STEP_EXECUTION = i18n.translate('xpack.pnd.lifecycleView.sameStepExecution', {
  defaultMessage: 'Same step execution',
});

export const SAME_STEP_EXECUTION_TOOLTIP = i18n.translate(
  'xpack.pnd.lifecycleView.sameStepExecutionTooltip',
  {
    defaultMessage:
      'This catalog row names the same workflow step as the row above, so the two always share one status.',
  }
);

export const STARTED_AT = i18n.translate('xpack.pnd.lifecycleView.startedAt', {
  defaultMessage: 'Started',
});

export const FINISHED_AT = i18n.translate('xpack.pnd.lifecycleView.finishedAt', {
  defaultMessage: 'Finished',
});

export const OPEN_CONVERSATION = i18n.translate('xpack.pnd.lifecycleView.openConversation', {
  defaultMessage: 'Open conversation',
});

export const openConversationTooltip = (title: string): string =>
  i18n.translate('xpack.pnd.lifecycleView.openConversationTooltip', {
    defaultMessage: 'Open "{title}" in Agent Builder, in a new tab',
    values: { title },
  });

/**
 * The visible label of every step link is the same three words, so 14 of them read identically to a
 * screen reader tabbing the lifecycle. The accessible name names the row instead.
 */
export const viewStepAriaLabel = (step: string): string =>
  i18n.translate('xpack.pnd.lifecycleView.viewStepAriaLabel', {
    defaultMessage: 'View the step execution for {step}',
    values: { step },
  });

/** @see {@link viewStepAriaLabel} — same problem, up to three identical "Open conversation" buttons. */
export const openConversationAriaLabel = (step: string): string =>
  i18n.translate('xpack.pnd.lifecycleView.openConversationAriaLabel', {
    defaultMessage: 'Open the Agent Builder conversation for {step}',
    values: { step },
  });

export const LOADING_LIFECYCLE = i18n.translate('xpack.pnd.lifecycleView.loadingLifecycle', {
  defaultMessage: 'Loading the four-phase lifecycle',
});

export const NO_LIFECYCLE_TITLE = i18n.translate('xpack.pnd.lifecycleView.noLifecycleTitle', {
  defaultMessage: 'No lifecycle to show',
});

export const NO_LIFECYCLE_BODY = i18n.translate('xpack.pnd.lifecycleView.noLifecycleBody', {
  defaultMessage: 'The four-phase lifecycle for this attack discovery could not be read.',
});

export const NO_DISCOVERY_TITLE = i18n.translate('xpack.pnd.lifecycleView.noDiscoveryTitle', {
  defaultMessage: 'Pick an attack discovery',
});

export const NO_DISCOVERY_BODY = i18n.translate('xpack.pnd.lifecycleView.noDiscoveryBody', {
  defaultMessage:
    'Open the four-phase lifecycle from an attack discovery, an action in the queue, or a run.',
});

export const TUNING_EVIDENCE_TITLE = i18n.translate('xpack.pnd.lifecycleView.tuningEvidenceTitle', {
  defaultMessage: 'Drafted tuning',
});

export const TUNING_REASONING_TITLE = i18n.translate(
  'xpack.pnd.lifecycleView.tuningReasoningTitle',
  {
    defaultMessage: 'Why this tuning',
  }
);

export const stepCountOfTotal = (rendered: number, total: number): string =>
  i18n.translate('xpack.pnd.lifecycleView.stepCountOfTotal', {
    defaultMessage: '{rendered} of {total} lifecycle steps',
    values: { rendered, total },
  });

export const discoveryIdLabel = (correlationId: string): string =>
  i18n.translate('xpack.pnd.lifecycleView.discoveryIdLabel', {
    defaultMessage: 'Attack discovery {correlationId}',
    values: { correlationId },
  });
