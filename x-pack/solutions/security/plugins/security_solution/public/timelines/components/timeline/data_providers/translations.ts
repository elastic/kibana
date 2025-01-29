/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AND = i18n.translate('xpack.securitySolution.dataProviders.and', {
  defaultMessage: 'AND',
});

export const DELETE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.deleteDataProvider',
  {
    defaultMessage: 'Delete',
  }
);

export const DROP_ANYTHING = i18n.translate('xpack.securitySolution.dataProviders.dropAnything', {
  defaultMessage: 'Drop anything',
});

export const EDIT = i18n.translate('xpack.securitySolution.dataProviders.edit', {
  defaultMessage: 'Edit',
});

export const EDIT_MENU_ITEM = i18n.translate('xpack.securitySolution.dataProviders.editMenuItem', {
  defaultMessage: 'Edit filter',
});

export const EDIT_TITLE = i18n.translate('xpack.securitySolution.dataProviders.editTitle', {
  defaultMessage: 'EDIT FILTER',
});

export const EXCLUDE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.excludeDataProvider',
  {
    defaultMessage: 'Exclude results',
  }
);

export const EXISTS_LABEL = i18n.translate('xpack.securitySolution.dataProviders.existsLabel', {
  defaultMessage: 'exists',
});

export const FIELD = i18n.translate('xpack.securitySolution.dataProviders.fieldLabel', {
  defaultMessage: 'Field',
});

export const FILTER_FOR_FIELD_PRESENT = i18n.translate(
  'xpack.securitySolution.dataProviders.filterForFieldPresentLabel',
  {
    defaultMessage: 'Filter for field present',
  }
);

export const CONVERT_TO_FIELD = i18n.translate(
  'xpack.securitySolution.dataProviders.convertToFieldLabel',
  {
    defaultMessage: 'Convert to field',
  }
);

export const CONVERT_TO_TEMPLATE_FIELD = i18n.translate(
  'xpack.securitySolution.dataProviders.convertToTemplateFieldLabel',
  {
    defaultMessage: 'Convert to template field',
  }
);

export const HIGHLIGHTED = i18n.translate('xpack.securitySolution.dataProviders.highlighted', {
  defaultMessage: 'highlighted',
});

export const HERE_TO_BUILD_AN = i18n.translate(
  'xpack.securitySolution.dataProviders.hereToBuildAn',
  {
    defaultMessage: 'here to build an',
  }
);

export const INCLUDE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.includeDataProvider',
  {
    defaultMessage: 'Include results',
  }
);

export const NOT = i18n.translate('xpack.securitySolution.dataProviders.not', {
  defaultMessage: 'NOT',
});

export const OR = i18n.translate('xpack.securitySolution.dataProviders.or', {
  defaultMessage: 'or',
});

export const QUERY = i18n.translate('xpack.securitySolution.dataProviders.query', {
  defaultMessage: 'query',
});

export const TOGGLE = i18n.translate('xpack.securitySolution.dataProviders.toggle', {
  defaultMessage: 'toggle',
});

export const RE_ENABLE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.reEnableDataProvider',
  {
    defaultMessage: 'Re-enable',
  }
);

export const REMOVE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.removeDataProvider',
  {
    defaultMessage: 'Remove Data Provider',
  }
);

export const SHOW_OPTIONS_DATA_PROVIDER = ({ field, value }: { field: string; value: string }) =>
  i18n.translate('xpack.securitySolution.dataProviders.showOptionsDataProviderAriaLabel', {
    values: { field, value },
    defaultMessage: '{field} {value} Press enter for options, or press space to begin dragging',
  });

export const TEMPORARILY_DISABLE_DATA_PROVIDER = i18n.translate(
  'xpack.securitySolution.dataProviders.temporaryDisableDataProvider',
  {
    defaultMessage: 'Temporarily disable',
  }
);

export const VALUE = i18n.translate('xpack.securitySolution.dataProviders.valuePlaceholder', {
  defaultMessage: 'value',
});

export const ADD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.dataProviders.addFieldPopoverButtonLabel',
  {
    defaultMessage: 'Add field',
  }
);

export const ADD_TEMPLATE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.dataProviders.addTemplateFieldPopoverButtonLabel',
  {
    defaultMessage: 'Add template field',
  }
);

export const TEMPLATE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.dataProviders.templateFieldLabel',
  {
    defaultMessage: 'Template field',
  }
);

export const QUERY_AREA_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.dataProviders.queryAreaAriaLabel',
  {
    defaultMessage:
      'You are in the timeline query area, which contains groups of data providers that query for events',
  }
);

export const GROUP_AREA_ARIA_LABEL = (group: number) =>
  i18n.translate('xpack.securitySolution.dataProviders.groupAreaAriaLabel', {
    values: { group },
    defaultMessage: 'You are in group {group}',
  });

export const FILTER_OR_SEARCH_WITH_KQL = i18n.translate(
  'xpack.securitySolution.timeline.searchOrFilter.filterOrSearchWithKql',
  {
    defaultMessage: 'Filter or Search with KQL',
  }
);
