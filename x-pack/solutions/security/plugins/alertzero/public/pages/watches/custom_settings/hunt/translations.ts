/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HUNT_AGENT_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.huntSettings.agentSectionTitle',
  { defaultMessage: 'Agent' }
);

export const HUNT_AGENT_LABEL = i18n.translate('xpack.alertzero.watches.huntSettings.agentLabel', {
  defaultMessage: 'Agent',
});

export const HUNT_AGENT_HELP = i18n.translate('xpack.alertzero.watches.huntSettings.agentHelp', {
  defaultMessage:
    'Agent Builder agent this Worker runs with. Leave it on the default agent, or choose one of your custom agents.',
});

export const HUNT_AGENT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.huntSettings.agentAriaLabel',
  { defaultMessage: 'Select the agent this Worker runs with' }
);
