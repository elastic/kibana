/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENTITY_TYPE_BADGE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.entityTypeBadge',
  { defaultMessage: 'AI agent' }
);
export const LOAD_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.loadError',
  { defaultMessage: 'Agent details could not be loaded' }
);

export const TAB_OVERVIEW = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.tabs.overview',
  { defaultMessage: 'Overview' }
);
export const TAB_ACTIVITY = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.tabs.activity',
  { defaultMessage: 'Agent activity' }
);
export const TAB_GRAPH = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.tabs.graph',
  { defaultMessage: 'Graph' }
);

export const ATTRIBUTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.title',
  { defaultMessage: 'Attribution' }
);
export const SIGNED_IN_AS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.signedInAs',
  { defaultMessage: 'Signed in as' }
);
export const HOST_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.host',
  { defaultMessage: 'Host' }
);
export const RUNS_AS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.runsAs',
  { defaultMessage: 'Runs as' }
);
export const NO_SIGNED_IN_ACCOUNT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.noSignedInAccount',
  { defaultMessage: 'No signed-in account' }
);
export const DEPROVISIONED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.deprovisioned',
  { defaultMessage: 'Deprovisioned' }
);
export const SUSPENDED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.suspended',
  { defaultMessage: 'Suspended' }
);
export const TERMINATED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.terminated',
  { defaultMessage: 'Terminated' }
);
export const MFA_OFF = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.mfaOff',
  { defaultMessage: 'MFA off' }
);
export const RUNS_AS_ROOT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.runsAsRoot',
  { defaultMessage: 'Runs as root' }
);
export const watchlistRiskModifierTooltip = (modifier: number) =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.watchlistRiskModifier', {
    defaultMessage: 'Risk modifier {modifier}',
    values: { modifier },
  });

export const relatedAgentsTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.relatedAgents.title', {
    defaultMessage: 'Related agents ({count})',
    values: { count },
  });
export const SAME_ACCOUNT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.relatedAgents.sameAccount',
  { defaultMessage: 'Same account' }
);
export const SAME_HOST = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.relatedAgents.sameHost',
  { defaultMessage: 'Same host' }
);

export const INSTALL_DETAILS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.installDetails.title',
  { defaultMessage: 'Install details' }
);
export const VERSION_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.installDetails.version',
  { defaultMessage: 'Version' }
);
export const FIRST_SEEN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.installDetails.firstSeen',
  { defaultMessage: 'First seen' }
);
export const ENTITY_ID_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.installDetails.entityId',
  { defaultMessage: 'Entity ID' }
);
export const COPY_ENTITY_ID = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.installDetails.copyEntityId',
  { defaultMessage: 'Copy entity ID' }
);

export const ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.title',
  { defaultMessage: 'Alerts' }
);
export const ALERTS_NONE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.none',
  { defaultMessage: 'No alerts carry this agent ID.' }
);
export const ALERTS_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.unavailable',
  { defaultMessage: 'The alerts index could not be read.' }
);
export const ALERT_RULE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.rule',
  { defaultMessage: 'Rule' }
);
export const ALERT_SEVERITY = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.severity',
  { defaultMessage: 'Severity' }
);
export const ALERT_TIME = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.time',
  { defaultMessage: 'Time' }
);

export const GRAPH_OPEN_FULL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.graph.openFull',
  { defaultMessage: 'Open graph view' }
);
