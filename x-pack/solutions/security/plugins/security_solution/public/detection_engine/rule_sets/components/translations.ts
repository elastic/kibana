/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALL_RULES = i18n.translate('xpack.securitySolution.ruleSets.sidebar.allRules', {
  defaultMessage: 'All rules',
});
export const SHARED_GROUPS = i18n.translate(
  'xpack.securitySolution.ruleSets.sidebar.sharedGroups',
  {
    defaultMessage: 'Shared rule sets',
  }
);
export const MY_GROUPS = i18n.translate('xpack.securitySolution.ruleSets.sidebar.myGroups', {
  defaultMessage: 'My rule sets',
});
export const NEW_GROUP = i18n.translate('xpack.securitySolution.ruleSets.sidebar.newGroup', {
  defaultMessage: 'New rule set',
});
export const FIND_GROUP = i18n.translate('xpack.securitySolution.ruleSets.sidebar.findGroup', {
  defaultMessage: 'Find a rule set',
});
export const NO_GROUPS = i18n.translate('xpack.securitySolution.ruleSets.sidebar.noGroups', {
  defaultMessage: 'No rule sets yet',
});
export const EDIT_GROUP = i18n.translate('xpack.securitySolution.ruleSets.menu.editGroup', {
  defaultMessage: 'Edit rule set',
});
export const DELETE_GROUP = i18n.translate('xpack.securitySolution.ruleSets.menu.deleteGroup', {
  defaultMessage: 'Delete rule set (rules stay)',
});
export const GROUP_ACTIONS = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.menu.ariaLabel', {
    defaultMessage: 'Actions for {name}',
    values: { name },
  });
export const FAILED_TOOLTIP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.sidebar.failedTooltip', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} failed on the last run',
    values: { count },
  });

export const PRIVATE_BADGE = i18n.translate('xpack.securitySolution.ruleSets.header.private', {
  defaultMessage: 'Private',
});
export const SHARED_BADGE = i18n.translate('xpack.securitySolution.ruleSets.header.shared', {
  defaultMessage: 'Shared',
});
export const STAT_RULES = i18n.translate('xpack.securitySolution.ruleSets.header.statRules', {
  defaultMessage: 'Rules',
});
export const STAT_FAILED = i18n.translate('xpack.securitySolution.ruleSets.header.statFailed', {
  defaultMessage: 'Failed',
});
export const PICKED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.header.picked', {
    defaultMessage: '{count} picked',
    values: { count },
  });
export const LEFT_OUT = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.header.leftOut', {
    defaultMessage: '{count} left out',
    values: { count },
  });
export const MATCH_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleSets.header.matchConditions',
  {
    defaultMessage: 'Match:',
  }
);
export const NO_CONDITIONS = i18n.translate('xpack.securitySolution.ruleSets.header.noConditions', {
  defaultMessage: 'No conditions',
});

export const EDITOR_CREATE_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.createTitle',
  {
    defaultMessage: 'Create rule set',
  }
);
export const EDITOR_EDIT_TITLE = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.editTitle', {
    defaultMessage: 'Edit rule set "{name}"',
    values: { name },
  });
export const EDITOR_SUBTITLE = i18n.translate('xpack.securitySolution.ruleSets.editor.subtitle', {
  defaultMessage:
    'A rule set is a saved list of rules. It does not change the rules. Use it to find, monitor and update a set of rules together.',
});
export const NAME = i18n.translate('xpack.securitySolution.ruleSets.editor.name', {
  defaultMessage: 'Name',
});
export const DESCRIPTION = i18n.translate('xpack.securitySolution.ruleSets.editor.description', {
  defaultMessage: 'Description',
});
export const OPTIONAL = i18n.translate('xpack.securitySolution.ruleSets.editor.optional', {
  defaultMessage: 'Optional',
});
export const VISIBILITY = i18n.translate('xpack.securitySolution.ruleSets.editor.visibility', {
  defaultMessage: 'Who can see it',
});
export const VISIBILITY_SPACE = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.visibilitySpace',
  {
    defaultMessage: 'Everybody in this space',
  }
);
export const VISIBILITY_PRIVATE = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.visibilityPrivate',
  {
    defaultMessage: 'Only me',
  }
);
export const WHICH_RULES = i18n.translate('xpack.securitySolution.ruleSets.editor.whichRules', {
  defaultMessage: 'Which rules are in the rule set',
});
export const STEP_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.stepConditions',
  {
    defaultMessage: 'Rules that match conditions',
  }
);
export const STEP_CONDITIONS_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.stepConditionsHelp',
  {
    defaultMessage:
      'The same filters as the rules table. Rules that match all filled groups are in the set, and new rules that match join it. Inside a group, any checked value matches.',
  }
);
export const STEP_PICKED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.stepPicked', {
    defaultMessage: 'Rules you pick ({count})',
    values: { count },
  });
export const STEP_PICKED_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.stepPickedHelp',
  {
    defaultMessage:
      'These rules are in the rule set even if they do not match the conditions. New rules do not join.',
  }
);
export const STEP_LEFT_OUT = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.stepLeftOut', {
    defaultMessage: 'Rules to leave out ({count})',
    values: { count },
  });
export const STEP_LEFT_OUT_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.stepLeftOutHelp',
  {
    defaultMessage: 'These rules match the conditions, but are never in the rule set.',
  }
);
export const PICK_RULES = i18n.translate('xpack.securitySolution.ruleSets.editor.pickRules', {
  defaultMessage: 'Pick rules',
});
export const NO_RULES_PICKED = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.noRulesPicked',
  {
    defaultMessage: 'No rules picked.',
  }
);
export const NO_RULES_LEFT_OUT = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.noRulesLeftOut',
  {
    defaultMessage: 'No rules left out.',
  }
);
export const TAGS = i18n.translate('xpack.securitySolution.ruleSets.editor.tags', {
  defaultMessage: 'Tags',
});
export const INTEGRATIONS = i18n.translate('xpack.securitySolution.ruleSets.editor.integrations', {
  defaultMessage: 'Integrations',
});
export const RULE_TYPES = i18n.translate('xpack.securitySolution.ruleSets.editor.ruleTypes', {
  defaultMessage: 'Rule type',
});
export const SEVERITY = i18n.translate('xpack.securitySolution.ruleSets.editor.severity', {
  defaultMessage: 'Severity',
});
export const SOURCE = i18n.translate('xpack.securitySolution.ruleSets.editor.source', {
  defaultMessage: 'Source',
});
export const SOURCE_ANY = i18n.translate('xpack.securitySolution.ruleSets.editor.sourceAny', {
  defaultMessage: 'Any',
});
export const SOURCE_ELASTIC = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.sourceElastic',
  {
    defaultMessage: 'Elastic',
  }
);
export const SOURCE_CUSTOM = i18n.translate('xpack.securitySolution.ruleSets.editor.sourceCustom', {
  defaultMessage: 'Custom',
});
export const NOT_CONDITION = (field: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.notCondition', {
    values: { field },
    defaultMessage: 'Not {field}',
  });

export const EXCLUDE_HINT = i18n.translate('xpack.securitySolution.ruleSets.editor.excludeHint', {
  defaultMessage: 'Click a value twice to exclude it.',
});

export const SEARCH_CONDITION = i18n.translate('xpack.securitySolution.ruleSets.editor.search', {
  defaultMessage: 'Search',
});
export const ANY = i18n.translate('xpack.securitySolution.ruleSets.editor.any', {
  defaultMessage: 'Any',
});
export const PREVIEW = i18n.translate('xpack.securitySolution.ruleSets.editor.preview', {
  defaultMessage: 'Preview',
});
export const PREVIEW_RULES = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.previewRules', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const PREVIEW_BREAKDOWN = (byConditions: number, onlyPicked: number, leftOut: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.previewBreakdown', {
    defaultMessage: '{byConditions} by conditions · {onlyPicked} only picked · {leftOut} left out',
    values: { byConditions, onlyPicked, leftOut },
  });
export const PREVIEW_EMPTY = i18n.translate('xpack.securitySolution.ruleSets.editor.previewEmpty', {
  defaultMessage: 'The rule set is empty. Add conditions or pick rules.',
});
export const WHY = i18n.translate('xpack.securitySolution.ruleSets.editor.why', {
  defaultMessage: 'Why',
});
export const WHY_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.whyConditions',
  {
    defaultMessage: 'Conditions',
  }
);
export const WHY_PICKED = i18n.translate('xpack.securitySolution.ruleSets.editor.whyPicked', {
  defaultMessage: 'Picked',
});
export const WHY_BOTH = i18n.translate('xpack.securitySolution.ruleSets.editor.whyBoth', {
  defaultMessage: 'Both',
});
export const COLUMN_RULE = i18n.translate('xpack.securitySolution.ruleSets.editor.columnRule', {
  defaultMessage: 'Rule',
});
export const COLUMN_TYPE = i18n.translate('xpack.securitySolution.ruleSets.editor.columnType', {
  defaultMessage: 'Type',
});
export const COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.columnSeverity',
  {
    defaultMessage: 'Severity',
  }
);
export const CANCEL = i18n.translate('xpack.securitySolution.ruleSets.editor.cancel', {
  defaultMessage: 'Cancel',
});
export const SAVE_CHANGES = i18n.translate('xpack.securitySolution.ruleSets.editor.saveChanges', {
  defaultMessage: 'Save changes',
});
export const CREATE_GROUP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.createGroup', {
    defaultMessage: 'Create rule set with {count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const SAVED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.savedToast', {
    defaultMessage: 'Rule set "{name}" saved',
    values: { name },
  });
export const DELETED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.deletedToast', {
    defaultMessage: 'Rule set "{name}" deleted. The rules did not change.',
    values: { name },
  });
export const SAVE_ERROR = i18n.translate('xpack.securitySolution.ruleSets.editor.saveError', {
  defaultMessage: 'The rule set was not saved',
});

export const PICKER_TITLE_INCLUDE = i18n.translate(
  'xpack.securitySolution.ruleSets.picker.titleInclude',
  {
    defaultMessage: 'Pick rules for the rule set',
  }
);
export const PICKER_TITLE_EXCLUDE = i18n.translate(
  'xpack.securitySolution.ruleSets.picker.titleExclude',
  {
    defaultMessage: 'Pick rules to leave out',
  }
);
export const PICKER_SEARCH = i18n.translate('xpack.securitySolution.ruleSets.picker.search', {
  defaultMessage: 'Search rules by name',
});
export const PICKER_SELECTED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.picker.selected', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} picked',
    values: { count },
  });
export const DONE = i18n.translate('xpack.securitySolution.ruleSets.picker.done', {
  defaultMessage: 'Done',
});

export const MENU_BUTTON = i18n.translate('xpack.securitySolution.ruleSets.menu.button', {
  defaultMessage: 'Rule sets',
});
export const MENU_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.menu.title', {
    defaultMessage: 'Rule sets for {count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
export const MENU_NEW_GROUP = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.menu.newGroup', {
    defaultMessage: 'New rule set with {count, plural, one {this rule} other {these # rules}}',
    values: { count },
  });
export const MENU_APPLY = i18n.translate('xpack.securitySolution.ruleSets.menu.apply', {
  defaultMessage: 'Apply',
});
export const MENU_LEAVE_OUT_NOTE = i18n.translate(
  'xpack.securitySolution.ruleSets.menu.leaveOutNote',
  {
    defaultMessage:
      'Rules that match the rule set conditions are left out of the rule set, not deleted.',
  }
);
export const MENU_APPLIED_TOAST = i18n.translate(
  'xpack.securitySolution.ruleSets.menu.appliedToast',
  {
    defaultMessage: 'Rule sets updated',
  }
);
export const REMOVE_FROM_GROUP = i18n.translate(
  'xpack.securitySolution.ruleSets.menu.removeFromGroup',
  {
    defaultMessage: 'Remove from this rule set',
  }
);

export const RULE_TYPE_LABELS: Record<string, string> = {
  query: i18n.translate('xpack.securitySolution.ruleSets.ruleType.query', {
    defaultMessage: 'Custom query',
  }),
  saved_query: i18n.translate('xpack.securitySolution.ruleSets.ruleType.savedQuery', {
    defaultMessage: 'Saved query',
  }),
  eql: i18n.translate('xpack.securitySolution.ruleSets.ruleType.eql', {
    defaultMessage: 'Event Correlation (EQL)',
  }),
  esql: i18n.translate('xpack.securitySolution.ruleSets.ruleType.esql', {
    defaultMessage: 'ES|QL',
  }),
  threshold: i18n.translate('xpack.securitySolution.ruleSets.ruleType.threshold', {
    defaultMessage: 'Threshold',
  }),
  new_terms: i18n.translate('xpack.securitySolution.ruleSets.ruleType.newTerms', {
    defaultMessage: 'New Terms',
  }),
  machine_learning: i18n.translate('xpack.securitySolution.ruleSets.ruleType.ml', {
    defaultMessage: 'Machine Learning',
  }),
  threat_match: i18n.translate('xpack.securitySolution.ruleSets.ruleType.threatMatch', {
    defaultMessage: 'Indicator Match',
  }),
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: i18n.translate('xpack.securitySolution.ruleSets.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.securitySolution.ruleSets.severity.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.securitySolution.ruleSets.severity.high', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.securitySolution.ruleSets.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const PICKER_SELECT_ALL = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.picker.selectAll', {
    defaultMessage: 'Select all {count}',
    values: { count },
  });
export const PICKER_CLEAR = i18n.translate('xpack.securitySolution.ruleSets.picker.clear', {
  defaultMessage: 'Clear',
});

export const SHOW_LESS = i18n.translate('xpack.securitySolution.ruleSets.editor.showLess', {
  defaultMessage: 'Show less',
});
export const SHOW_MORE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.showMore', {
    defaultMessage: 'Show {count} more',
    values: { count },
  });
export const PREVIEW_DIFF = (diff: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.editor.previewDiff', {
    defaultMessage: '{diff} compared to saved',
    values: { diff: diff > 0 ? `+${diff}` : String(diff) },
  });

export const BROWSE_BY = i18n.translate('xpack.securitySolution.ruleSets.browseBy.title', {
  defaultMessage: 'Browse by',
});
export const BROWSE_TACTIC = i18n.translate('xpack.securitySolution.ruleSets.browseBy.tactic', {
  defaultMessage: 'MITRE ATT&CK tactic',
});
export const BROWSE_LAST_RESPONSE = i18n.translate(
  'xpack.securitySolution.ruleSets.browseBy.lastResponse',
  { defaultMessage: 'Last response' }
);
export const BROWSE_CREATED_BY = i18n.translate(
  'xpack.securitySolution.ruleSets.browseBy.createdBy',
  { defaultMessage: 'Created by' }
);

export const GROUP_BY = i18n.translate('xpack.securitySolution.ruleSets.groupBy.label', {
  defaultMessage: 'Group by',
});
export const GROUP_BY_NONE = i18n.translate('xpack.securitySolution.ruleSets.groupBy.none', {
  defaultMessage: 'None',
});
export const GROUP_BY_ENABLED = i18n.translate('xpack.securitySolution.ruleSets.groupBy.enabled', {
  defaultMessage: 'Enabled / disabled',
});
export const GROUP_BY_ENABLED_TRUE = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.enabledTrue',
  { defaultMessage: 'Enabled' }
);
export const GROUP_BY_ENABLED_FALSE = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.enabledFalse',
  { defaultMessage: 'Disabled' }
);
export const SECTIONS_SUMMARY = (rules: number, sections: number, field: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.summary', {
    defaultMessage:
      '{rules, plural, one {# rule} other {# rules}} in {sections, plural, one {# section} other {# sections}} by {field}.',
    values: { rules, sections, field: field.toLowerCase() },
  });
export const SECTIONS_MULTI_VALUE_NOTE = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.multiValueNote',
  { defaultMessage: 'A rule with several values is in several sections.' }
);
export const SECTIONS_SHOW_MORE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.showMore', {
    defaultMessage: 'Show more sections ({count} left)',
    values: { count },
  });
export const SECTION_ENABLED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.sectionEnabled', {
    defaultMessage: '{count} enabled',
    values: { count },
  });
export const SECTION_FAILED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.sectionFailed', {
    defaultMessage: '{count} failed',
    values: { count },
  });
export const SECTION_WARNING = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.sectionWarning', {
    defaultMessage: '{count} warning',
    values: { count },
  });
export const SECTION_ACTIONS = i18n.translate('xpack.securitySolution.ruleSets.groupBy.actions', {
  defaultMessage: 'Take actions',
});
export const SECTION_ACTIONS_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.groupBy.actionsTitle', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}} in this section',
    values: { count },
  });
export const SECTION_SHOW_IN_TABLE = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.showInTable',
  { defaultMessage: 'Show only these rules in the table' }
);
export const SECTION_NEW_GROUP = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.newGroup',
  { defaultMessage: 'New rule set from this section' }
);
export const SECTION_NEW_GROUP_DISABLED = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.newGroupDisabled',
  { defaultMessage: 'Rule set conditions can only use integrations, tags and rule types.' }
);
export const BROWSE_FILTER_CLEAR = i18n.translate(
  'xpack.securitySolution.ruleSets.groupBy.clearSectionFilter',
  { defaultMessage: 'Show all rules again' }
);

export const RULE_SETS_ROW_ACTION = i18n.translate('xpack.securitySolution.ruleSets.rowAction', {
  defaultMessage: 'Rule sets…',
});

export const RULE_SET_LABEL = i18n.translate('xpack.securitySolution.ruleSets.switcher.label', {
  defaultMessage: 'Rule set:',
});

export const CHOOSE_RULE_SET = i18n.translate(
  'xpack.securitySolution.ruleSets.switcher.ariaLabel',
  { defaultMessage: 'Choose a rule set' }
);

export const STAT_ENABLED = i18n.translate('xpack.securitySolution.ruleSets.header.statEnabled', {
  defaultMessage: 'Enabled',
});
export const STAT_WARNING = i18n.translate('xpack.securitySolution.ruleSets.header.statWarning', {
  defaultMessage: 'Warning',
});
export const STAT_NO_RESPONSE = i18n.translate(
  'xpack.securitySolution.ruleSets.header.statNoResponse',
  { defaultMessage: 'No response' }
);
export const EMPTY_GROUP_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSets.header.emptyTitle',
  { defaultMessage: 'This rule set has no rules' }
);
export const EMPTY_GROUP_BODY = i18n.translate('xpack.securitySolution.ruleSets.header.emptyBody', {
  defaultMessage:
    'Edit the rule set to add conditions or pick rules. Rules that match the conditions join the rule set automatically.',
});

export const GROUP_BY_NO_VALUE = i18n.translate('xpack.securitySolution.ruleSets.groupBy.noValue', {
  defaultMessage: 'No value',
});

export const RULE_SETS = i18n.translate('xpack.securitySolution.ruleSets.sidebar.title', {
  defaultMessage: 'Rule sets',
});

export const SAVE_FILTERS_AS_GROUP = i18n.translate(
  'xpack.securitySolution.ruleSets.toolbar.saveFilters',
  { defaultMessage: 'Save filters as rule set' }
);
export const SAVE_FILTERS_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.toolbar.saveFiltersHelp',
  {
    defaultMessage:
      'Creates a rule set from the search, tags, rule type and Elastic/custom filters. New rules that match join the rule set. Status filters (enabled, last response, gaps) are not saved.',
  }
);
export const SAVE_FILTERS_DISABLED_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.toolbar.saveFiltersDisabledHelp',
  { defaultMessage: 'Set a search, tag, rule type or Elastic/custom filter first.' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.searchPlaceholder',
  { defaultMessage: 'Rule name, index pattern or MITRE ATT&CK tactic or technique' }
);

export const SAVE_FILTERS = i18n.translate(
  'xpack.securitySolution.ruleSets.toolbar.saveFiltersShort',
  {
    defaultMessage: 'Save filters',
  }
);
export const ADD_FILTERS_TO_GROUP = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.toolbar.addFiltersToGroup', {
    defaultMessage: 'Add filters to "{name}"',
    values: { name },
  });
export const CLEAR_CONDITIONS = i18n.translate(
  'xpack.securitySolution.ruleSets.editor.clearConditions',
  { defaultMessage: 'Clear' }
);

export const MEMBERS_PICKED = (count: number, name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.members.picked', {
    values: { count, name },
    defaultMessage:
      '{count, plural, one {# rule is} other {# rules are}} picked into "{name}": in the set even if they do not match its filters. Select rules and "Remove from set" to take them out.',
  });

export const MEMBERS_LEFT_OUT = (count: number, name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.members.leftOut', {
    values: { count, name },
    defaultMessage:
      '{count, plural, one {# rule is} other {# rules are}} left out of "{name}": they match its filters but are not in the set. Select rules and "Put back in the set" to bring them back.',
  });

export const BACK_TO_SET = i18n.translate('xpack.securitySolution.ruleSets.members.back', {
  defaultMessage: 'Back to the set',
});

export const PUT_BACK = i18n.translate('xpack.securitySolution.ruleSets.members.putBack', {
  defaultMessage: 'Put back in the set',
});

export const SAVE_AS_RULE_SET_TITLE = i18n.translate(
  'xpack.securitySolution.ruleSets.saveDialog.title',
  { defaultMessage: 'Save as rule set' }
);

export const SAVE = i18n.translate('xpack.securitySolution.ruleSets.saveDialog.save', {
  defaultMessage: 'Save',
});

export const HINT_FILTERS = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.saveDialog.hintFilters', {
    values: { count },
    defaultMessage:
      '{count, plural, one {# rule} other {# rules}} now. New rules that match these filters join the set.',
  });

export const HINT_SEARCH_NOT_SAVED = i18n.translate(
  'xpack.securitySolution.ruleSets.saveDialog.hintSearchNotSaved',
  {
    defaultMessage:
      'The set keeps the filters, not the search text. New rules that match the filters join the set.',
  }
);

export const HINT_PICKED = (count: number) =>
  i18n.translate('xpack.securitySolution.ruleSets.saveDialog.hintPicked', {
    values: { count },
    defaultMessage:
      'Exactly {count, plural, one {this rule} other {these # rules}}, with no filters. New rules do not join; add more by selecting rows.',
  });

export const SETTINGS = i18n.translate('xpack.securitySolution.ruleSets.settings.title', {
  defaultMessage: 'Name and description',
});

export const NAME_REQUIRED = i18n.translate(
  'xpack.securitySolution.ruleSets.saveDialog.nameRequired',
  {
    defaultMessage: 'Enter a name',
  }
);

export const SAVE_TO_SET = i18n.translate('xpack.securitySolution.ruleSets.filterBar.saveToSet', {
  defaultMessage: 'Save to set',
});

export const SAVE_AS_NEW_SET = i18n.translate(
  'xpack.securitySolution.ruleSets.filterBar.saveAsNewSet',
  { defaultMessage: 'Save as new set' }
);

export const RESET_FILTERS = i18n.translate('xpack.securitySolution.ruleSets.filterBar.reset', {
  defaultMessage: 'Reset',
});

export const FILTERS_CHANGED = (
  shown: number | undefined,
  total: number | undefined,
  name: string
) =>
  i18n.translate('xpack.securitySolution.ruleSets.filterBar.changed', {
    values: { shown: shown ?? '…', total: total ?? '…', name },
    defaultMessage:
      'Filters changed: {shown} of {total} rules. "{name}" does not change until you save.',
  });

export const FILTERS_MATCH = (shown: number | undefined, total: number | undefined) =>
  i18n.translate('xpack.securitySolution.ruleSets.filterBar.match', {
    values: { shown: shown ?? '…', total: total ?? '…' },
    defaultMessage: 'Filters: {shown} of {total} rules.',
  });

export const SAVE_TO_SET_HELP = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.filterBar.saveToSetHelp', {
    values: { name },
    defaultMessage: 'Adds the filters to the conditions of "{name}".',
  });

export const SAVE_AS_NEW_GROUP = i18n.translate(
  'xpack.securitySolution.ruleSets.toolbar.saveAsNewGroup',
  { defaultMessage: 'Save as new rule set (this rule set + filters)' }
);
export const FILTERS_ADDED_TOAST = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.toolbar.filtersAddedToast', {
    defaultMessage: 'Filters added to "{name}"',
    values: { name },
  });
export const GROUP_CONDITION_TOOLTIP = (name: string) =>
  i18n.translate('xpack.securitySolution.ruleSets.toolbar.conditionTooltip', {
    defaultMessage: 'Condition of the rule set "{name}". Click to edit the rule set.',
    values: { name },
  });

export const SUGGEST_RULE_SETS = i18n.translate(
  'xpack.securitySolution.ruleSets.sidebar.suggestRuleSets',
  { defaultMessage: 'Suggest rule sets' }
);

export const SUGGEST_RULE_SETS_HELP = i18n.translate(
  'xpack.securitySolution.ruleSets.sidebar.suggestRuleSetsHelp',
  {
    defaultMessage:
      'No rule sets yet. The AI agent can analyze your rules and suggest sets for your teams, projects and data sources.',
  }
);

/** The first message of the agent conversation. It is in English, like the other agent prompts. */
export const SUGGEST_RULE_SETS_PROMPT =
  'Analyze my installed detection rules and suggest rule sets for them. Use the suggest-rule-sets skill and show each suggestion as a card.';
