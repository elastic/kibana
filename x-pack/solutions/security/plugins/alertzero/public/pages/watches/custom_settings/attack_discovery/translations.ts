/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVERY_AGENT_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.attackDiscoverySettings.agentSectionTitle',
  { defaultMessage: 'Agent' }
);

export const ATTACK_DISCOVERY_AGENT_LABEL = i18n.translate(
  'xpack.alertzero.watches.attackDiscoverySettings.agentLabel',
  { defaultMessage: 'Agent' }
);

export const ATTACK_DISCOVERY_AGENT_HELP = i18n.translate(
  'xpack.alertzero.watches.attackDiscoverySettings.agentHelp',
  {
    defaultMessage:
      'Agent Builder agent this Worker runs with. Used when a discovery review opens its investigation. Leave it on the default agent, or choose one of your custom agents.',
  }
);

export const ATTACK_DISCOVERY_AGENT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.attackDiscoverySettings.agentAriaLabel',
  { defaultMessage: 'Select the agent this Worker runs with' }
);
