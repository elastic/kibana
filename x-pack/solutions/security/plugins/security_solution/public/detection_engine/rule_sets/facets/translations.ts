/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTERS = i18n.translate('xpack.securitySolution.ruleSets.facets.title', {
  defaultMessage: 'Filters',
});

export const CLEAR = i18n.translate('xpack.securitySolution.ruleSets.facets.clear', {
  defaultMessage: 'Clear',
});

export const CLEAR_ALL = i18n.translate('xpack.securitySolution.ruleSets.facets.clearAll', {
  defaultMessage: 'Clear all',
});

export const INTEGRATION = i18n.translate('xpack.securitySolution.ruleSets.facets.integration', {
  defaultMessage: 'Integration',
});

export const MITRE_TACTIC = i18n.translate('xpack.securitySolution.ruleSets.facets.tactic', {
  defaultMessage: 'MITRE ATT&CK tactic',
});

export const RULE_TYPE = i18n.translate('xpack.securitySolution.ruleSets.facets.ruleType', {
  defaultMessage: 'Rule type',
});

export const SEVERITY = i18n.translate('xpack.securitySolution.ruleSets.facets.severity', {
  defaultMessage: 'Severity',
});

export const SOURCE = i18n.translate('xpack.securitySolution.ruleSets.facets.source', {
  defaultMessage: 'Source',
});

export const SOURCE_ELASTIC = i18n.translate('xpack.securitySolution.ruleSets.facets.elastic', {
  defaultMessage: 'Elastic rules',
});

export const SOURCE_CUSTOM = i18n.translate('xpack.securitySolution.ruleSets.facets.custom', {
  defaultMessage: 'Custom rules',
});

export const TAGS = i18n.translate('xpack.securitySolution.ruleSets.facets.tags', {
  defaultMessage: 'Tags',
});

export const OTHER_TAGS = i18n.translate('xpack.securitySolution.ruleSets.facets.otherTags', {
  defaultMessage: 'Other tags',
});

export const RULE_STATE = i18n.translate('xpack.securitySolution.ruleSets.facets.ruleState', {
  defaultMessage: 'Rule state',
});

export const RULE_STATE_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.facets.ruleStateHelp',
  {
    defaultMessage:
      'Rule state changes without an edit. A rule set with a state condition gains and loses rules when they are enabled, disabled or run.',
  }
);

export const STATUS = i18n.translate('xpack.securitySolution.ruleSets.facets.status', {
  defaultMessage: 'Status',
});

export const ENABLED = i18n.translate('xpack.securitySolution.ruleSets.facets.enabled', {
  defaultMessage: 'Enabled',
});

export const DISABLED = i18n.translate('xpack.securitySolution.ruleSets.facets.disabled', {
  defaultMessage: 'Disabled',
});

export const LAST_RESPONSE = i18n.translate('xpack.securitySolution.ruleSets.facets.lastResponse', {
  defaultMessage: 'Last response',
});

export const SUCCEEDED = i18n.translate('xpack.securitySolution.ruleSets.facets.succeeded', {
  defaultMessage: 'Succeeded',
});

export const WARNING = i18n.translate('xpack.securitySolution.ruleSets.facets.warning', {
  defaultMessage: 'Warning',
});

export const FAILED = i18n.translate('xpack.securitySolution.ruleSets.facets.failed', {
  defaultMessage: 'Failed',
});

export const MORE_TAG_GROUPS = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.moreTagGroups', {
    values: { count },
    defaultMessage: '{count} more tag {count, plural, one {group} other {groups}}',
  });

export const FEWER_TAG_GROUPS = i18n.translate(
  'xpack.securitySolution.ruleSets.facets.fewerTagGroups',
  { defaultMessage: 'Fewer tag groups' }
);

export const COUNTS_IN_SET = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.countsInSet', {
    values: { name },
    defaultMessage: 'Counts inside {name}',
  });

export const COUNTS_IN_ALL = i18n.translate('xpack.securitySolution.ruleSets.facets.countsInAll', {
  defaultMessage: 'Counts in all rules',
});

export const INCLUDE = (value: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.include', {
    values: { value },
    defaultMessage: 'Include {value}',
  });

export const HIDE_FILTERS = i18n.translate('xpack.securitySolution.ruleSets.facets.hide', {
  defaultMessage: 'Hide filters',
});

export const SHOW_ALL = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.showAll', {
    values: { count },
    defaultMessage: 'Show all ({count})',
  });

export const SHOW_LESS = i18n.translate('xpack.securitySolution.ruleSets.facets.showLess', {
  defaultMessage: 'Show less',
});

export const FIND_VALUE = (field: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.findValue', {
    values: { field },
    defaultMessage: 'Find {field}',
  });

export const EXCLUDE = (value: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.exclude', {
    values: { value },
    defaultMessage: 'Exclude {value}',
  });

export const UNDO_EXCLUDE = (value: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.undoExclude', {
    values: { value },
    defaultMessage: 'Stop excluding {value}',
  });

export const NOT = i18n.translate('xpack.securitySolution.ruleSets.facets.not', {
  defaultMessage: 'NOT',
});

export const REMOVE_FILTER = (filter: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.facets.removeFilter', {
    values: { filter },
    defaultMessage: 'Remove filter {filter}',
  });

export const NO_VALUES = i18n.translate('xpack.securitySolution.ruleSets.facets.noValues', {
  defaultMessage: 'No values',
});
