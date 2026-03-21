/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '../../../../shared_imports';
import * as i18n from './translations';

export const CORRELATION_TYPE_CONFIG = {
  type: FIELD_TYPES.SELECT,
  defaultValue: 'temporal' as unknown,
};

export const CORRELATION_RULES_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.CORRELATION_RULES_LABEL,
  helpText: i18n.CORRELATION_RULES_HELP_TEXT,
  defaultValue: [] as unknown,
  validations: [
    {
      validator: fieldValidators.emptyField(i18n.CORRELATION_RULES_REQUIRED_ERROR),
    },
  ],
};

export const CORRELATION_GROUP_BY_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.CORRELATION_GROUP_BY_LABEL,
  helpText: i18n.CORRELATION_GROUP_BY_HELP_TEXT,
  defaultValue: [] as unknown,
  validations: [
    {
      validator: fieldValidators.emptyField(i18n.CORRELATION_GROUP_BY_REQUIRED_ERROR),
    },
  ],
};

export const CORRELATION_TIMESPAN_CONFIG = {
  label: i18n.CORRELATION_TIMESPAN_LABEL,
  helpText: i18n.CORRELATION_TIMESPAN_HELP_TEXT,
  defaultValue: '5m' as unknown,
};

export const CORRELATION_CONDITION_OPERATOR_CONFIG = {
  type: FIELD_TYPES.SELECT,
  label: i18n.CORRELATION_CONDITION_OPERATOR_LABEL,
  helpText: i18n.CORRELATION_CONDITION_OPERATOR_HELP_TEXT,
  defaultValue: 'gte' as unknown,
};

export const CORRELATION_CONDITION_VALUE_CONFIG = {
  type: FIELD_TYPES.NUMBER,
  label: i18n.CORRELATION_CONDITION_VALUE_LABEL,
  helpText: i18n.CORRELATION_CONDITION_VALUE_HELP_TEXT,
  defaultValue: 1 as unknown,
  validations: [
    {
      validator: fieldValidators.numberGreaterThanField({
        than: 1,
        message: i18n.CORRELATION_CONDITION_VALUE_ERROR,
        allowEquality: true,
      }),
    },
  ],
};

export const CORRELATION_CONDITION_FIELD_CONFIG = {
  type: FIELD_TYPES.TEXT,
  label: i18n.CORRELATION_CONDITION_FIELD_LABEL,
  helpText: i18n.CORRELATION_CONDITION_FIELD_HELP_TEXT,
  defaultValue: '' as unknown,
};

export const CORRELATION_REMOTE_CLUSTERS_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.CORRELATION_REMOTE_CLUSTERS_LABEL,
  helpText: i18n.CORRELATION_REMOTE_CLUSTERS_HELP_TEXT,
  defaultValue: [] as unknown,
};

export const CORRELATION_TARGET_SPACES_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.CORRELATION_TARGET_SPACES_LABEL,
  helpText: i18n.CORRELATION_TARGET_SPACES_HELP_TEXT,
  defaultValue: [] as unknown,
};
