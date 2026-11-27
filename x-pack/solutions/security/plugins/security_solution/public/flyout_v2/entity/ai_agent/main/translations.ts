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
export const NO_SCORE_YET = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.noScoreYet',
  { defaultMessage: 'Risk: no score yet' }
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

export const HOST_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.host',
  { defaultMessage: 'Host' }
);
export const RUNS_AS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.runsAs',
  { defaultMessage: 'Runs as' }
);
export const SIGNED_IN_AS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.signedInAs',
  { defaultMessage: 'Signed in as' }
);
export const NOT_SIGNED_IN = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.notSignedIn',
  { defaultMessage: 'Not signed in yet' }
);
export const VERSION_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.version',
  { defaultMessage: 'Version' }
);
export const FIRST_SEEN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.firstSeen',
  { defaultMessage: 'First seen' }
);
export const LAST_SEEN_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.header.lastSeen',
  { defaultMessage: 'Last seen' }
);

export const ACTS_FOR_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.actsFor',
  { defaultMessage: 'Acts on behalf of' }
);
export const ACTS_FOR_NONE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.actsForNone',
  { defaultMessage: 'No signed-in account' }
);
export const IDP_STATUS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.idpStatus',
  { defaultMessage: 'IdP status' }
);
export const IDP_UNKNOWN = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.idpUnknown',
  { defaultMessage: 'Not reported' }
);
export const DEPROVISIONED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.deprovisioned',
  { defaultMessage: 'Deprovisioned' }
);
export const SUSPENDED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.suspended',
  { defaultMessage: 'Suspended' }
);
export const ENABLED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.enabled',
  { defaultMessage: 'Enabled' }
);
export const HR_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.hr',
  { defaultMessage: 'HR status' }
);
export const MFA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.mfa',
  { defaultMessage: 'MFA' }
);
export const MFA_ON = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.mfaOn',
  { defaultMessage: 'On' }
);
export const MFA_OFF = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.mfaOff',
  { defaultMessage: 'Off' }
);
export const WATCHLISTS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.watchlists',
  { defaultMessage: 'Watchlists' }
);
export const NONE = i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.none', {
  defaultMessage: 'None',
});
export const watchlistRiskModifierTooltip = (modifier: number) =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.watchlistRiskModifier', {
    defaultMessage: 'Risk modifier {modifier}',
    values: { modifier },
  });

export const CRITICALITY_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.criticality',
  { defaultMessage: 'Criticality' }
);
export const RISK_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.risk',
  { defaultMessage: 'Risk' }
);
export const LAST_SIGNED_IN = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.lastSignedIn',
  { defaultMessage: 'Last signed in' }
);
export const PREVIOUS_ACCOUNT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.previousAccount',
  { defaultMessage: 'Used before' }
);

export const HOST_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.hostTitle',
  { defaultMessage: 'Host' }
);
export const OTHER_AGENTS_ON_HOST = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.otherAgentsOnHost',
  { defaultMessage: 'Other agents on this host' }
);

export const RUNS_AS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.runsAsTitle',
  { defaultMessage: 'Runs as (local user)' }
);
export const RUNS_AS_ROOT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.runsAsRoot',
  { defaultMessage: 'Runs as root' }
);

export const OTHER_INSTALLS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.context.otherInstalls',
  { defaultMessage: 'Other installs on the same account' }
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
