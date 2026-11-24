/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALL_RULES = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.allRules', {
  defaultMessage: 'All rules',
});
export const SHARED_GROUPS = i18n.translate(
  'xpack.securitySolution.ruleGroups.sidebar.sharedGroups',
  {
    defaultMessage: 'Shared rule sets',
  }
);
export const MY_GROUPS = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.myGroups', {
  defaultMessage: 'My rule sets',
});
export const NEW_GROUP = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.newGroup', {
  defaultMessage: 'New rule set',
});
export const FIND_GROUP = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.findGroup', {
  defaultMessage: 'Find a rule set',
});
export const NO_GROUPS = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.noGroups', {
  defaultMessage: 'No rule sets yet',
});
export const EDIT_GROUP = i18n.translate('xpack.securitySolution.ruleGroups.menu.editGroup', {
  defaultMessage: 'Edit rule set',
});
export const DELETE_GROUP = i18n.translate('xpack.securitySolution.ruleGroups.menu.deleteGroup', {
  defaultMessage: 'Delete rule set (rules stay)',
});
export const GROUP_ACTIONS = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.menu.ariaLabel', {
    defaultMessage: 'Actions for {name}',
    values: { name },
  });
export const FAILED_TOOLTIP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.sidebar.failedTooltip', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} failed on the last run',
    values: { count },
  });

export const PRIVATE_BADGE = i18n.translate('xpack.securitySolution.ruleGroups.header.private', {
  defaultMessage: 'Private',
});
export const SHARED_BADGE = i18n.translate('xpack.securitySolution.ruleGroups.header.shared', {
  defaultMessage: 'Shared',
});
export const STAT_RULES = i18n.translate('xpack.securitySolution.ruleGroups.header.statRules', {
  defaultMessage: 'Rules',
});
export const STAT_FAILED = i18n.translate('xpack.securitySolution.ruleGroups.header.statFailed', {
  defaultMessage: 'Failed',
});
export const PICKED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.header.picked', {
    defaultMessage: '{count} picked',
    values: { count },
  });
export const LEFT_OUT = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.header.leftOut', {
    defaultMessage: '{count} left out',
    values: { count },
  });
export const MATCH_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleGroups.header.matchConditions',
  {
    defaultMessage: 'Match:',
  }
);
export const NO_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleGroups.header.noConditions',
  {
    defaultMessage: 'No conditions',
  }
);

export const EDITOR_CREATE_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.createTitle',
  {
    defaultMessage: 'Create rule set',
  }
);
export const EDITOR_EDIT_TITLE = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.editTitle', {
    defaultMessage: 'Edit rule set "{name}"',
    values: { name },
  });
export const EDITOR_SUBTITLE = i18n.translate('xpack.securitySolution.ruleGroups.editor.subtitle', {
  defaultMessage:
    'A rule set is a saved list of rules. It does not change the rules. Use it to find, monitor and update a set of rules together.',
});
export const NAME = i18n.translate('xpack.securitySolution.ruleGroups.editor.name', {
  defaultMessage: 'Name',
});
export const DESCRIPTION = i18n.translate('xpack.securitySolution.ruleGroups.editor.description', {
  defaultMessage: 'Description',
});
export const OPTIONAL = i18n.translate('xpack.securitySolution.ruleGroups.editor.optional', {
  defaultMessage: 'Optional',
});
export const VISIBILITY = i18n.translate('xpack.securitySolution.ruleGroups.editor.visibility', {
  defaultMessage: 'Who can see it',
});
export const VISIBILITY_SPACE = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.visibilitySpace',
  {
    defaultMessage: 'Everybody in this space',
  }
);
export const VISIBILITY_PRIVATE = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.visibilityPrivate',
  {
    defaultMessage: 'Only me',
  }
);
export const WHICH_RULES = i18n.translate('xpack.securitySolution.ruleGroups.editor.whichRules', {
  defaultMessage: 'Which rules are in the rule set',
});
export const STEP_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.stepConditions',
  {
    defaultMessage: 'Rules that match conditions',
  }
);
export const STEP_CONDITIONS_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.stepConditionsHelp',
  {
    defaultMessage:
      'New rules that match join the rule set automatically. All filled conditions must match. A rule must have all tags, like the tags filter of the table. For the other conditions, any value matches.',
  }
);
export const STEP_PICKED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.stepPicked', {
    defaultMessage: 'Rules you pick ({count})',
    values: { count },
  });
export const STEP_PICKED_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.stepPickedHelp',
  {
    defaultMessage:
      'These rules are in the rule set even if they do not match the conditions. New rules do not join.',
  }
);
export const STEP_LEFT_OUT = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.stepLeftOut', {
    defaultMessage: 'Rules to leave out ({count})',
    values: { count },
  });
export const STEP_LEFT_OUT_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.stepLeftOutHelp',
  {
    defaultMessage: 'These rules match the conditions, but are never in the rule set.',
  }
);
export const PICK_RULES = i18n.translate('xpack.securitySolution.ruleGroups.editor.pickRules', {
  defaultMessage: 'Pick rules',
});
export const NO_RULES_PICKED = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.noRulesPicked',
  {
    defaultMessage: 'No rules picked.',
  }
);
export const NO_RULES_LEFT_OUT = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.noRulesLeftOut',
  {
    defaultMessage: 'No rules left out.',
  }
);
export const TAGS = i18n.translate('xpack.securitySolution.ruleGroups.editor.tags', {
  defaultMessage: 'Tags',
});
export const INTEGRATIONS = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.integrations',
  {
    defaultMessage: 'Integrations',
  }
);
export const RULE_TYPES = i18n.translate('xpack.securitySolution.ruleGroups.editor.ruleTypes', {
  defaultMessage: 'Rule type',
});
export const SEVERITY = i18n.translate('xpack.securitySolution.ruleGroups.editor.severity', {
  defaultMessage: 'Severity',
});
export const SOURCE = i18n.translate('xpack.securitySolution.ruleGroups.editor.source', {
  defaultMessage: 'Source',
});
export const SOURCE_ANY = i18n.translate('xpack.securitySolution.ruleGroups.editor.sourceAny', {
  defaultMessage: 'Any',
});
export const SOURCE_ELASTIC = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.sourceElastic',
  {
    defaultMessage: 'Elastic',
  }
);
export const SOURCE_CUSTOM = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.sourceCustom',
  {
    defaultMessage: 'Custom',
  }
);
export const SEARCH_CONDITION = i18n.translate('xpack.securitySolution.ruleGroups.editor.search', {
  defaultMessage: 'Search',
});
export const ANY = i18n.translate('xpack.securitySolution.ruleGroups.editor.any', {
  defaultMessage: 'Any',
});
export const PREVIEW = i18n.translate('xpack.securitySolution.ruleGroups.editor.preview', {
  defaultMessage: 'Preview',
});
export const PREVIEW_RULES = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.previewRules', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const PREVIEW_BREAKDOWN = (byConditions: number, onlyPicked: number, leftOut: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.previewBreakdown', {
    defaultMessage: '{byConditions} by conditions · {onlyPicked} only picked · {leftOut} left out',
    values: { byConditions, onlyPicked, leftOut },
  });
export const PREVIEW_EMPTY = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.previewEmpty',
  {
    defaultMessage: 'The rule set is empty. Add conditions or pick rules.',
  }
);
export const WHY = i18n.translate('xpack.securitySolution.ruleGroups.editor.why', {
  defaultMessage: 'Why',
});
export const WHY_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.whyConditions',
  {
    defaultMessage: 'Conditions',
  }
);
export const WHY_PICKED = i18n.translate('xpack.securitySolution.ruleGroups.editor.whyPicked', {
  defaultMessage: 'Picked',
});
export const WHY_BOTH = i18n.translate('xpack.securitySolution.ruleGroups.editor.whyBoth', {
  defaultMessage: 'Both',
});
export const COLUMN_RULE = i18n.translate('xpack.securitySolution.ruleGroups.editor.columnRule', {
  defaultMessage: 'Rule',
});
export const COLUMN_TYPE = i18n.translate('xpack.securitySolution.ruleGroups.editor.columnType', {
  defaultMessage: 'Type',
});
export const COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.columnSeverity',
  {
    defaultMessage: 'Severity',
  }
);
export const CANCEL = i18n.translate('xpack.securitySolution.ruleGroups.editor.cancel', {
  defaultMessage: 'Cancel',
});
export const SAVE_CHANGES = i18n.translate('xpack.securitySolution.ruleGroups.editor.saveChanges', {
  defaultMessage: 'Save changes',
});
export const CREATE_GROUP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.createGroup', {
    defaultMessage: 'Create rule set with {count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const SAVED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.savedToast', {
    defaultMessage: 'Rule set "{name}" saved',
    values: { name },
  });
export const DELETED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.deletedToast', {
    defaultMessage: 'Rule set "{name}" deleted. The rules did not change.',
    values: { name },
  });
export const SAVE_ERROR = i18n.translate('xpack.securitySolution.ruleGroups.editor.saveError', {
  defaultMessage: 'The rule set was not saved',
});

export const PICKER_TITLE_INCLUDE = i18n.translate(
  'xpack.securitySolution.ruleGroups.picker.titleInclude',
  {
    defaultMessage: 'Pick rules for the rule set',
  }
);
export const PICKER_TITLE_EXCLUDE = i18n.translate(
  'xpack.securitySolution.ruleGroups.picker.titleExclude',
  {
    defaultMessage: 'Pick rules to leave out',
  }
);
export const PICKER_SEARCH = i18n.translate('xpack.securitySolution.ruleGroups.picker.search', {
  defaultMessage: 'Search rules by name',
});
export const PICKER_SELECTED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.picker.selected', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} picked',
    values: { count },
  });
export const DONE = i18n.translate('xpack.securitySolution.ruleGroups.picker.done', {
  defaultMessage: 'Done',
});

export const MENU_BUTTON = i18n.translate('xpack.securitySolution.ruleGroups.menu.button', {
  defaultMessage: 'Rule sets',
});
export const MENU_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.menu.title', {
    defaultMessage: 'Rule sets for {count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const MENU_NEW_GROUP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.menu.newGroup', {
    defaultMessage: 'New rule set with {count, plural, one {this rule} other {these # rules}}',
    values: { count },
  });
export const MENU_APPLY = i18n.translate('xpack.securitySolution.ruleGroups.menu.apply', {
  defaultMessage: 'Apply',
});
export const MENU_LEAVE_OUT_NOTE = i18n.translate(
  'xpack.securitySolution.ruleGroups.menu.leaveOutNote',
  {
    defaultMessage:
      'Rules that match the rule set conditions are left out of the rule set, not deleted.',
  }
);
export const MENU_APPLIED_TOAST = i18n.translate(
  'xpack.securitySolution.ruleGroups.menu.appliedToast',
  {
    defaultMessage: 'Rule sets updated',
  }
);
export const REMOVE_FROM_GROUP = i18n.translate(
  'xpack.securitySolution.ruleGroups.menu.removeFromGroup',
  {
    defaultMessage: 'Remove from this rule set',
  }
);

export const RULE_TYPE_LABELS: Record<string, string> = {
  query: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.query', {
    defaultMessage: 'Custom query',
  }),
  saved_query: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.savedQuery', {
    defaultMessage: 'Saved query',
  }),
  eql: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.eql', {
    defaultMessage: 'Event Correlation (EQL)',
  }),
  esql: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.esql', {
    defaultMessage: 'ES|QL',
  }),
  threshold: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.threshold', {
    defaultMessage: 'Threshold',
  }),
  new_terms: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.newTerms', {
    defaultMessage: 'New Terms',
  }),
  machine_learning: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.ml', {
    defaultMessage: 'Machine Learning',
  }),
  threat_match: i18n.translate('xpack.securitySolution.ruleGroups.ruleType.threatMatch', {
    defaultMessage: 'Indicator Match',
  }),
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: i18n.translate('xpack.securitySolution.ruleGroups.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.securitySolution.ruleGroups.severity.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.securitySolution.ruleGroups.severity.high', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.securitySolution.ruleGroups.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const PICKER_SELECT_ALL = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.picker.selectAll', {
    defaultMessage: 'Select all {count}',
    values: { count },
  });
export const PICKER_CLEAR = i18n.translate('xpack.securitySolution.ruleGroups.picker.clear', {
  defaultMessage: 'Clear',
});

export const SHOW_LESS = i18n.translate('xpack.securitySolution.ruleGroups.editor.showLess', {
  defaultMessage: 'Show less',
});
export const SHOW_MORE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.showMore', {
    defaultMessage: 'Show {count} more',
    values: { count },
  });
export const PREVIEW_DIFF = (diff: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.editor.previewDiff', {
    defaultMessage: '{diff} compared to saved',
    values: { diff: diff > 0 ? `+${diff}` : String(diff) },
  });

export const BROWSE_BY = i18n.translate('xpack.securitySolution.ruleGroups.browseBy.title', {
  defaultMessage: 'Browse by',
});
export const BROWSE_TACTIC = i18n.translate('xpack.securitySolution.ruleGroups.browseBy.tactic', {
  defaultMessage: 'MITRE ATT&CK tactic',
});
export const BROWSE_LAST_RESPONSE = i18n.translate(
  'xpack.securitySolution.ruleGroups.browseBy.lastResponse',
  { defaultMessage: 'Last response' }
);
export const BROWSE_CREATED_BY = i18n.translate(
  'xpack.securitySolution.ruleGroups.browseBy.createdBy',
  { defaultMessage: 'Created by' }
);

export const GROUP_BY = i18n.translate('xpack.securitySolution.ruleGroups.groupBy.label', {
  defaultMessage: 'Group by',
});
export const GROUP_BY_NONE = i18n.translate('xpack.securitySolution.ruleGroups.groupBy.none', {
  defaultMessage: 'None',
});
export const GROUP_BY_ENABLED = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.enabled',
  {
    defaultMessage: 'Enabled / disabled',
  }
);
export const GROUP_BY_ENABLED_TRUE = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.enabledTrue',
  { defaultMessage: 'Enabled' }
);
export const GROUP_BY_ENABLED_FALSE = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.enabledFalse',
  { defaultMessage: 'Disabled' }
);
export const SECTIONS_SUMMARY = (rules: number, sections: number, field: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.summary', {
    defaultMessage:
      '{rules, plural, one {# rule} other {# rules}} in {sections, plural, one {# section} other {# sections}} by {field}.',
    values: { rules, sections, field: field.toLowerCase() },
  });
export const SECTIONS_MULTI_VALUE_NOTE = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.multiValueNote',
  { defaultMessage: 'A rule with several values is in several sections.' }
);
export const SECTIONS_SHOW_MORE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.showMore', {
    defaultMessage: 'Show more sections ({count} left)',
    values: { count },
  });
export const SECTION_ENABLED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.sectionEnabled', {
    defaultMessage: '{count} enabled',
    values: { count },
  });
export const SECTION_FAILED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.sectionFailed', {
    defaultMessage: '{count} failed',
    values: { count },
  });
export const SECTION_WARNING = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.sectionWarning', {
    defaultMessage: '{count} warning',
    values: { count },
  });
export const SECTION_ACTIONS = i18n.translate('xpack.securitySolution.ruleGroups.groupBy.actions', {
  defaultMessage: 'Take actions',
});
export const SECTION_ACTIONS_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleGroups.groupBy.actionsTitle', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} in this section',
    values: { count },
  });
export const SECTION_SHOW_IN_TABLE = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.showInTable',
  { defaultMessage: 'Show only these rules in the table' }
);
export const SECTION_NEW_GROUP = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.newGroup',
  { defaultMessage: 'New rule set from this section' }
);
export const SECTION_NEW_GROUP_DISABLED = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.newGroupDisabled',
  { defaultMessage: 'Rule set conditions can only use integrations, tags and rule types.' }
);
export const BROWSE_FILTER_CLEAR = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.clearSectionFilter',
  { defaultMessage: 'Show all rules again' }
);

export const RULE_GROUPS_ROW_ACTION = i18n.translate(
  'xpack.securitySolution.ruleGroups.rowAction',
  { defaultMessage: 'Rule sets…' }
);

export const HIDE_SIDEBAR = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.hide', {
  defaultMessage: 'Hide rule sets',
});
export const RULE_GROUPS_SHOW_SIDEBAR = i18n.translate(
  'xpack.securitySolution.ruleGroups.sidebar.show',
  { defaultMessage: 'Show rule sets' }
);

export const STAT_ENABLED = i18n.translate('xpack.securitySolution.ruleGroups.header.statEnabled', {
  defaultMessage: 'Enabled',
});
export const STAT_WARNING = i18n.translate('xpack.securitySolution.ruleGroups.header.statWarning', {
  defaultMessage: 'Warning',
});
export const STAT_NO_RESPONSE = i18n.translate(
  'xpack.securitySolution.ruleGroups.header.statNoResponse',
  { defaultMessage: 'No response' }
);
export const EMPTY_GROUP_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGroups.header.emptyTitle',
  { defaultMessage: 'This rule set has no rules' }
);
export const EMPTY_GROUP_BODY = i18n.translate(
  'xpack.securitySolution.ruleGroups.header.emptyBody',
  {
    defaultMessage:
      'Edit the rule set to add conditions or pick rules. Rules that match the conditions join the rule set automatically.',
  }
);

export const GROUP_BY_NO_VALUE = i18n.translate(
  'xpack.securitySolution.ruleGroups.groupBy.noValue',
  {
    defaultMessage: 'No value',
  }
);

export const RULE_GROUPS = i18n.translate('xpack.securitySolution.ruleGroups.sidebar.title', {
  defaultMessage: 'Rule sets',
});

export const SAVE_FILTERS_AS_GROUP = i18n.translate(
  'xpack.securitySolution.ruleGroups.toolbar.saveFilters',
  { defaultMessage: 'Save filters as rule set' }
);
export const SAVE_FILTERS_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.toolbar.saveFiltersHelp',
  {
    defaultMessage:
      'Creates a rule set from the search, tags, rule type and Elastic/custom filters. New rules that match join the rule set. Status filters (enabled, last response, gaps) are not saved.',
  }
);
export const SAVE_FILTERS_DISABLED_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.toolbar.saveFiltersDisabledHelp',
  { defaultMessage: 'Set a search, tag, rule type or Elastic/custom filter first.' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.ruleGroups.editor.searchPlaceholder',
  { defaultMessage: 'Rule name, index pattern or MITRE ATT&CK tactic or technique' }
);

export const SAVE_FILTERS = i18n.translate(
  'xpack.securitySolution.ruleGroups.toolbar.saveFiltersShort',
  {
    defaultMessage: 'Save filters',
  }
);
export const ADD_FILTERS_TO_GROUP = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.toolbar.addFiltersToGroup', {
    defaultMessage: 'Add filters to "{name}"',
    values: { name },
  });
export const SAVE_AS_NEW_GROUP = i18n.translate(
  'xpack.securitySolution.ruleGroups.toolbar.saveAsNewGroup',
  { defaultMessage: 'Save as new rule set (this rule set + filters)' }
);
export const FILTERS_ADDED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.toolbar.filtersAddedToast', {
    defaultMessage: 'Filters added to "{name}"',
    values: { name },
  });
export const GROUP_CONDITION_TOOLTIP = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleGroups.toolbar.conditionTooltip', {
    defaultMessage: 'Condition of the rule set "{name}". Click to edit the rule set.',
    values: { name },
  });

export const SUGGEST_RULE_SETS = i18n.translate(
  'xpack.securitySolution.ruleGroups.sidebar.suggestRuleSets',
  { defaultMessage: 'Suggest rule sets' }
);

export const SUGGEST_RULE_SETS_HELP = i18n.translate(
  'xpack.securitySolution.ruleGroups.sidebar.suggestRuleSetsHelp',
  {
    defaultMessage:
      'No rule sets yet. The AI agent can analyze your rules and suggest sets for your teams, projects and data sources.',
  }
);

/** The first message of the agent conversation. It is in English, like the other agent prompts. */
export const SUGGEST_RULE_SETS_PROMPT =
  'Analyze my installed detection rules and suggest rule sets for them. Use the suggest-rule-sets skill and show each suggestion as a card.';
