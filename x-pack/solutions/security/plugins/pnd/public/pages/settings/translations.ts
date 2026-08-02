/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.settings.pageTitle', {
  defaultMessage: 'Settings',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.settings.pageSubtitle', {
  defaultMessage: 'how this deployment is configured',
});

export const INTRO = i18n.translate('xpack.pnd.settings.intro', {
  defaultMessage:
    'AlertZero has no editable settings of its own. Everything below is set in kibana.yml (or kibana.dev.yml) except the per-space advanced setting, and a config change takes effect on restart.',
});

/** Setting keys are identifiers, not prose: they are deliberately not translated. */
export const SETTING_PND_ENABLED = 'xpack.pnd.enabled';
export const SETTING_ATTACK_DISCOVERY_WORKFLOWS = 'securitySolution:enableAttackDiscoveryWorkflows';
export const SETTING_DEMO_FORCE_INCIDENT = 'xpack.pnd.demo.forceIncident';
export const SETTING_USE_MOCK_DATA = 'xpack.pnd.ui.useMockData';

export const PND_ENABLED_DESCRIPTION = i18n.translate('xpack.pnd.settings.pndEnabled.description', {
  defaultMessage:
    'The plugin, and therefore this app, does not exist without it. Defaults to off, so /app/pnd 404s on a stack that has not set it.',
});

export const ATTACK_DISCOVERY_WORKFLOWS_DESCRIPTION = i18n.translate(
  'xpack.pnd.settings.attackDiscoveryWorkflows.description',
  {
    defaultMessage:
      'A per-space advanced setting. Until it is on in this space no Attack Discovery trigger is emitted, so the loop never starts and AlertZero stays empty without reporting an error. This is the single most common cause of "nothing happens".',
  }
);

export const DEMO_FORCE_INCIDENT_DESCRIPTION = i18n.translate(
  'xpack.pnd.settings.demoForceIncident.description',
  {
    defaultMessage:
      'Demo only. Bypasses the model\'s incident verdict so a staged run always reaches Phase 3. Defaults to off; when it is on, every page shows a "Demo mode" badge. Turn it off after a demo.',
  }
);

export const USE_MOCK_DATA_DESCRIPTION = i18n.translate(
  'xpack.pnd.settings.useMockData.description',
  {
    defaultMessage:
      'Serves Watch-catalog fixtures so the Watches pages render without a stack. Defaults to off.',
  }
);

export const USE_MOCK_DATA_SCOPE_NOTE = i18n.translate('xpack.pnd.settings.useMockData.scopeNote', {
  defaultMessage:
    'It now covers the Watch catalog only. The approvals queue, runs, conversations, the four-phase view and the autonomy level all read live data through the internal AlertZero API, so this flag no longer makes the app demonstrable without a stack — and the autonomy dial writes a real per-space setting even when it is on.',
});

export const SETTING_ON = i18n.translate('xpack.pnd.settings.value.on', {
  defaultMessage: 'On',
});

export const SETTING_OFF = i18n.translate('xpack.pnd.settings.value.off', {
  defaultMessage: 'Off',
});

export const SETTING_PER_SPACE = i18n.translate('xpack.pnd.settings.value.perSpace', {
  defaultMessage: 'Per space',
});

export const SETTING_PER_SPACE_HINT = i18n.translate('xpack.pnd.settings.value.perSpaceHint', {
  defaultMessage: 'Check it in Stack Management → Advanced Settings for the space you are in.',
});

export const REQUIRED_TO_BE_HERE = i18n.translate('xpack.pnd.settings.value.requiredToBeHere', {
  defaultMessage: 'On',
});

export const REQUIRED_TO_BE_HERE_HINT = i18n.translate(
  'xpack.pnd.settings.value.requiredToBeHereHint',
  {
    defaultMessage: 'It must be, or this page could not have loaded.',
  }
);
