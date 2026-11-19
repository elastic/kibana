/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RESOLUTION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.sectionTitle',
  { defaultMessage: 'Resolution' }
);

export const RESOLUTION_GROUP_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.groupLinkTitle',
  { defaultMessage: 'Resolution group' }
);

export const RESOLUTION_GROUP_LINK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.groupLinkTooltip',
  { defaultMessage: 'Show resolution group details' }
);

export const RESOLUTION_EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.entityResolution.emptyState',
  { defaultMessage: 'No resolved entities' }
);

export const ENTITY_NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.entityName',
  { defaultMessage: 'Entity name' }
);

export const ENTITY_ID_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.entityId',
  { defaultMessage: 'Entity ID' }
);

export const SOURCE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.source',
  { defaultMessage: 'Data source' }
);

export const RISK_SCORE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.riskScore',
  { defaultMessage: 'Risk score' }
);

export const ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.actions',
  { defaultMessage: 'Actions' }
);

export const GROUP_RISK_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityResolution.groupRiskScore',
  { defaultMessage: 'Group risk score:' }
);

export const EXPAND_ENTITY_BUTTON = i18n.translate(
  'xpack.securitySolution.entityResolution.expandEntity',
  { defaultMessage: 'Open entity details' }
);

export const REMOVE_ENTITY_BUTTON = i18n.translate(
  'xpack.securitySolution.entityResolution.removeEntity',
  { defaultMessage: 'Remove from resolution group' }
);

export const TARGET_ENTITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.targetEntityTooltip',
  { defaultMessage: 'This is the primary entity for this resolution group' }
);

export const INSUFFICIENT_PRIVILEGES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.insufficientPrivileges',
  {
    defaultMessage: 'You do not have permission to modify resolution groups',
  }
);

export const CANNOT_REMOVE_TARGET_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.cannotRemoveTarget',
  { defaultMessage: 'The primary entity cannot be removed from the resolution group' }
);

export const ADD_ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.addEntitiesTitle',
  { defaultMessage: 'Add entities to resolution group' }
);

export const SEARCH_ENTITIES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityResolution.searchPlaceholder',
  { defaultMessage: 'Search by entity name or ID' }
);

export const ADD_ENTITY_BUTTON = i18n.translate(
  'xpack.securitySolution.entityResolution.addEntity',
  { defaultMessage: 'Add to resolution group' }
);

export const ENTITY_RESOLVED_TOAST = i18n.translate(
  'xpack.securitySolution.entityResolution.entityResolved',
  { defaultMessage: 'Entity resolved' }
);

export const ENTITY_RESOLVED_TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.entityResolution.entityResolvedText',
  { defaultMessage: "The resolution group's risk score will be recalculated within 1 hour." }
);

export const RESOLUTION_GROUP_CREATED_TOAST = i18n.translate(
  'xpack.securitySolution.entityResolution.groupCreated',
  { defaultMessage: 'Resolution group created' }
);

export const RESOLUTION_GROUP_CREATED_TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.entityResolution.groupCreatedText',
  { defaultMessage: "The resolution group's risk score will be calculated within 1 hour." }
);

export const ENTITY_REMOVED_TOAST = i18n.translate(
  'xpack.securitySolution.entityResolution.entityRemoved',
  { defaultMessage: 'Entity removed from the resolution group' }
);

export const ENTITY_REMOVED_TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.entityResolution.entityRemovedText',
  { defaultMessage: "The resolution group's risk score will be recalculated within 1 hour." }
);

export const CONFIRM_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.title',
  { defaultMessage: 'Confirm entity resolution' }
);

export const CONFIRM_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.cancel',
  { defaultMessage: 'Cancel' }
);

export const CONFIRM_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.confirm',
  { defaultMessage: 'Confirm resolution' }
);

export const RESOLUTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.errorTitle',
  { defaultMessage: 'Resolution error' }
);

export const RESOLUTION_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.fetchError',
  { defaultMessage: 'Unable to load resolution group' }
);

export const RISK_SCORE_NOT_AVAILABLE = i18n.translate(
  'xpack.securitySolution.entityResolution.riskScoreNotAvailable',
  { defaultMessage: 'N/A' }
);

export const LAST_SEEN_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.lastSeen',
  { defaultMessage: 'Last seen' }
);

export const ENTITY_HAS_ALIASES_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.entityHasAliasesError',
  {
    defaultMessage:
      'This entity already belongs to another resolution group. Unlink it from its current group before adding it here.',
  }
);

export const RESOLUTION_GROUP_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.entityResolution.resolutionGroupTableCaption',
  { defaultMessage: 'Entity resolution group' }
);

export const RESOLUTION_GROUP_DETAILS_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.entityResolution.resolutionGroupDetailsTableCaption',
  { defaultMessage: 'Resolution group details' }
);

export const ADD_ENTITIES_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.entityResolution.addEntitiesTableCaption',
  {
    defaultMessage: 'Entities to add',
  }
);

export const RULE_CHECK_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.ruleCheck.title',
  { defaultMessage: 'Resolution rule check' }
);

export const RULE_CHECK_PROTOTYPE_BADGE = i18n.translate(
  'xpack.securitySolution.entityResolution.ruleCheck.prototypeBadge',
  { defaultMessage: 'Prototype' }
);

export const RULE_CHECK_ALL_HEALTHY = i18n.translate(
  'xpack.securitySolution.entityResolution.ruleCheck.allHealthy',
  { defaultMessage: 'All healthy' }
);

export const RULE_CHECK_NEEDS_ATTENTION = (count: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.needsAttention', {
    defaultMessage: '{count, plural, one {# rule needs attention} other {# rules need attention}}',
    values: { count },
  });

export const RULE_CHECK_APPLIED_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.appliedTitle', {
    defaultMessage: 'Rules applied to this entity ({count})',
    values: { count },
  });

export const RULE_CHECK_NO_RULE_APPLIES = i18n.translate(
  'xpack.securitySolution.entityResolution.ruleCheck.noRuleApplies',
  { defaultMessage: 'No rule applies to this entity.' }
);

export const RULE_CHECK_SHOW_ALL = (count: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.showAll', {
    defaultMessage: 'Show the other {count, plural, one {rule} other {# rules}}',
    values: { count },
  });

export const RULE_CHECK_FAILURE_DETAILS = (
  failures: number,
  nextAttempt: string,
  lastError: string
) =>
  i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.failureDetails', {
    defaultMessage:
      'Last error: {lastError}. {failures, plural, one {# failure} other {# failures}} in a row. Next attempt: {nextAttempt}.',
    values: { failures, nextAttempt, lastError },
  });

export const RULE_CHECK_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.ruleCheck.error',
  { defaultMessage: 'The rule check could not be loaded.' }
);

export const RULE_CHECK_STATUS_LABELS = {
  failing: i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.status.failing', {
    defaultMessage: 'Failing',
  }),
  no_data: i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.status.noData', {
    defaultMessage: 'No data',
  }),
  declined: i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.status.declined', {
    defaultMessage: 'Declined',
  }),
  would_link: i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.status.wouldLink', {
    defaultMessage: 'Would link',
  }),
  nothing_to_link: i18n.translate(
    'xpack.securitySolution.entityResolution.ruleCheck.status.nothingToLink',
    { defaultMessage: 'Nothing to link' }
  ),
  not_applicable: i18n.translate(
    'xpack.securitySolution.entityResolution.ruleCheck.status.notApplicable',
    { defaultMessage: 'Not applicable' }
  ),
  off: i18n.translate('xpack.securitySolution.entityResolution.ruleCheck.status.off', {
    defaultMessage: 'Off',
  }),
} as const;

export const RULES_HEALTH_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.title',
  { defaultMessage: 'Resolution rules' }
);

export const RULES_HEALTH_ALL_WORKING = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.allWorking',
  { defaultMessage: 'All enabled rules ran without errors' }
);

export const RULES_HEALTH_FAILING = (count: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.failing', {
    defaultMessage: '{count, plural, one {# rule is failing} other {# rules are failing}}',
    values: { count },
  });

export const RULES_HEALTH_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.error',
  { defaultMessage: 'The rule health could not be loaded.' }
);

export const RULES_HEALTH_COLUMN_RULE = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.columnRule',
  { defaultMessage: 'Rule' }
);

export const RULES_HEALTH_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.columnStatus',
  { defaultMessage: 'Status' }
);

export const RULES_HEALTH_COLUMN_DETAILS = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.columnDetails',
  { defaultMessage: 'Last run' }
);

export const RULES_HEALTH_STATUS_LABELS = {
  failing: i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.status.failing', {
    defaultMessage: 'Failing',
  }),
  healthy: i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.status.healthy', {
    defaultMessage: 'Working',
  }),
  not_run_yet: i18n.translate(
    'xpack.securitySolution.entityResolution.rulesHealth.status.notRunYet',
    { defaultMessage: 'Not run yet' }
  ),
  off: i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.status.off', {
    defaultMessage: 'Off',
  }),
} as const;

export const RULES_HEALTH_LAST_RUN = (linked: number, ambiguous: number, oversized: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.lastRun', {
    defaultMessage:
      '{linked, plural, one {# link} other {# links}} created, {ambiguous} ambiguous and {oversized} oversized {skipped, plural, one {group} other {groups}} skipped',
    values: { linked, ambiguous, oversized, skipped: ambiguous + oversized },
  });

export const RULES_HEALTH_NO_RUN = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.noRun',
  { defaultMessage: 'No run recorded yet' }
);

export const RULES_HEALTH_OFF_DETAILS = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.offDetails',
  { defaultMessage: 'Switched off' }
);

export const RULES_HEALTH_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.tableCaption',
  { defaultMessage: 'Health of the entity resolution rules' }
);

export const RULES_HEALTH_TOGGLED = (ruleId: string, enabled: boolean) =>
  i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.toggled', {
    defaultMessage: '{ruleId} switched {enabled, select, true {on} other {off}}',
    values: { ruleId, enabled },
  });

export const RULES_HEALTH_COLUMN_ENABLED = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.columnEnabled',
  { defaultMessage: 'Enabled' }
);

export const RULES_HEALTH_TOGGLE_LABEL = (ruleId: string) =>
  i18n.translate('xpack.securitySolution.entityResolution.rulesHealth.toggleLabel', {
    defaultMessage: 'Enable the {ruleId} rule',
    values: { ruleId },
  });

export const RULES_HEALTH_HINT_PARTIAL_RESULTS = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.hintPartialResults',
  {
    defaultMessage:
      'Elasticsearch returned only part of the results for this rule, so the rule did not move forward. It retries automatically and waits longer after each failure. Switch the rule off to stop the retries.',
  }
);

export const RULES_HEALTH_COPY_LABEL = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.copyLabel',
  { defaultMessage: 'Copy the failure details' }
);

export const RULES_HEALTH_FILTER_FAILING_LABEL = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.filterFailingLabel',
  { defaultMessage: 'Show only the failing rules' }
);

export const RULES_HEALTH_SHOW_ALL_RULES = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesHealth.showAllRules',
  { defaultMessage: 'Show all rules' }
);

export const RULES_BANNER_TITLE_FAILING = (count: number) =>
  i18n.translate('xpack.securitySolution.entityResolution.rulesBanner.titleFailing', {
    defaultMessage:
      '{count, plural, one {# resolution rule is failing} other {# resolution rules are failing}}',
    values: { count },
  });

export const RULES_BANNER_TITLE_RECENT = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesBanner.titleRecent',
  { defaultMessage: 'Resolution rules failed in the past 24 hours' }
);

export const RULES_BANNER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesBanner.description',
  {
    defaultMessage:
      'A rule that fails cannot link entities until it runs again. The table below shows which rule failed and when it retries. The dashboard shows when failures happened.',
  }
);

export const RULES_BANNER_VIEW_DASHBOARD = i18n.translate(
  'xpack.securitySolution.entityResolution.rulesBanner.viewDashboard',
  { defaultMessage: 'View dashboard' }
);
