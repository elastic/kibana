/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING = i18n.translate('xpack.pnd.states.loading', {
  defaultMessage: 'Loading',
});

export const RETRY = i18n.translate('xpack.pnd.states.retry', {
  defaultMessage: 'Retry',
});

export const ERROR_TITLE = i18n.translate('xpack.pnd.states.error.title', {
  defaultMessage: 'Something went wrong',
});

export const ERROR_BODY_FALLBACK = i18n.translate('xpack.pnd.states.error.bodyFallback', {
  defaultMessage: 'The request failed. This is a read error, not an empty result.',
});

export const WORKFLOWS_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.pnd.states.workflowsUnavailable.title',
  {
    defaultMessage: 'Workflows unavailable',
  }
);

export const WORKFLOWS_UNAVAILABLE_BODY = i18n.translate(
  'xpack.pnd.states.workflowsUnavailable.body',
  {
    defaultMessage:
      'AlertZero reads its queue, runs and executions from the Workflows management API, which this Kibana is not serving. Nothing here is empty — it could not be read. Start Kibana with Task Manager enabled so workflows management is wired.',
  }
);

export const ATTACK_DISCOVERY_DISABLED_TITLE = i18n.translate(
  'xpack.pnd.states.attackDiscoveryDisabled.title',
  {
    defaultMessage: 'Attack Discovery workflows are turned off in this space',
  }
);

export const ATTACK_DISCOVERY_DISABLED_BODY = i18n.translate(
  'xpack.pnd.states.attackDiscoveryDisabled.body',
  {
    defaultMessage:
      'No trigger is emitted until this advanced setting is enabled in this space, so the loop never starts and AlertZero stays empty without an error.',
  }
);

export const CORRELATION_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.pnd.states.correlationUnavailable.title',
  {
    defaultMessage: 'Could not correlate this attack discovery to any run',
  }
);

export const CORRELATION_UNAVAILABLE_BODY = i18n.translate(
  'xpack.pnd.states.correlationUnavailable.body',
  {
    defaultMessage:
      'The lifecycle is unknown rather than unstarted: no Watch run could be matched to this attack discovery, which is expected for an older discovery.',
  }
);

export const DEMO_MODE_LABEL = i18n.translate('xpack.pnd.states.demoMode.label', {
  defaultMessage: 'Demo mode',
});

export const DEMO_MODE_TOOLTIP = i18n.translate('xpack.pnd.states.demoMode.tooltip', {
  defaultMessage:
    'xpack.pnd.demo.forceIncident is on, so an incident is opened for every investigation and the assessment verdict was bypassed. Turn it off outside a demo.',
});
