/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldErrors, Resolver } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { QueryRuleEditorForm } from '../types';

const hasErrors = (errors: FieldErrors<QueryRuleEditorForm>): boolean =>
  Object.keys(errors).length > 0;

export const queryRulesetDetailFormResolver: Resolver<QueryRuleEditorForm> = async (values) => {
  const errors: FieldErrors<QueryRuleEditorForm> = {};

  if (!values.isAlways) {
    if (!values.criteria || values.criteria.length === 0) {
      errors.criteria = {
        type: 'required',
        message: i18n.translate(
          'xpack.queryRules.queryRulesetDetailFormResolver.criteria.required',
          { defaultMessage: 'At least one criteria is required.' }
        ),
      };
    } else {
      values.criteria.forEach((criteria, index) => {
        validateCriteriaNumericTypes(criteria, index, errors);
        if (criteria.type !== 'always') {
          validateCriteriaValues(criteria, index, errors);
          validateCriteriaMetadataField(criteria, index, errors);
        }
      });
    }
  }

  validateActionsExist(values, errors);

  validateDocActions(values, errors);

  validateIdActions(values, errors);

  if (hasErrors(errors)) {
    return {
      values: {},
      errors,
    };
  }

  return {
    values,
    errors: {},
  };
};

const validateCriteriaNumericTypes = (
  criteria: QueryRuleEditorForm['criteria'][number],
  index: number,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  if (
    criteria.type === 'gt' ||
    criteria.type === 'lt' ||
    criteria.type === 'gte' ||
    criteria.type === 'lte'
  ) {
    if (criteria.values) {
      criteria.values.forEach((value, valueIndex) => {
        if (!value || isNaN(Number(value))) {
          // ! operator is used as we check and validate the initialization for all, TS cannot infer this
          if (!errors.criteria) errors.criteria = {};
          if (!errors.criteria[index]) errors.criteria[index] = {};
          if (!errors.criteria[index]!.values) errors.criteria[index]!.values = {};
          errors.criteria[index]!.values = {
            type: 'required',
            message: i18n.translate(
              'xpack.queryRules.queryRulesetDetailFormResolver.criteria.numeric',
              { defaultMessage: 'Values must be numeric for this criteria type.' }
            ),
          };
        }
      });
    }
  }
};

const validateCriteriaMetadataField = (
  criteria: QueryRuleEditorForm['criteria'][number],
  index: number,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  if (!criteria.metadata || criteria.metadata.trim() === '') {
    // ! operator is used as we check and validate the initialization for all, TS cannot infer this
    if (!errors.criteria) errors.criteria = {};
    if (!errors.criteria[index]) errors.criteria[index] = {};
    errors.criteria[index]!.metadata = {
      type: 'required',
      message: i18n.translate(
        'xpack.queryRules.queryRulesetDetailFormResolver.criteria.metadata.required',
        { defaultMessage: 'Metadata is required' }
      ),
    };
  }
};

const validateCriteriaValues = (
  criteria: QueryRuleEditorForm['criteria'][number],
  index: number,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  if (!criteria.values || criteria.values.length === 0) {
    // ! operator is used as we check and validate the initialization for all, TS cannot infer this
    if (!errors.criteria) errors.criteria = {};
    if (!errors.criteria[index]) errors.criteria[index] = {};
    errors.criteria[index]!.values = {
      type: 'required',
      message: i18n.translate('xpack.queryRules.queryRulesetDetailFormResolver.value.required', {
        defaultMessage: 'At least one value is required',
      }),
    };
  }
};

const validateActionsExist = (
  values: QueryRuleEditorForm,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  if (!values.actions) {
    errors.actions = {
      type: 'required',
      message: i18n.translate('xpack.queryRules.queryRulesetDetailFormResolver.action.required', {
        defaultMessage: 'At least one action is required.',
      }),
    };
  }

  if (
    values.actions.docs &&
    (!values.actions.ids || !values.actions.ids.length) &&
    values.actions.docs.length === 0
  ) {
    errors.actions = {
      type: 'required',
      message: i18n.translate('xpack.queryRules.queryRulesetDetailFormResolver.document.required', {
        defaultMessage: 'At least one document action is required.',
      }),
    };
  } else {
    if (
      values.actions.ids &&
      (!values.actions.docs || !values.actions.docs.length) &&
      values.actions.ids.length === 0
    ) {
      errors.actions = {
        type: 'required',
        message: i18n.translate('xpack.queryRules.queryRulesetDetailFormResolver.id.required', {
          defaultMessage: 'At least one ID action is required.',
        }),
      };
    }
  }
};

const validateDocActions = (
  values: QueryRuleEditorForm,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  // check for  docs case all actions are filled
  if (values.actions.docs && values.actions.docs.length > 0) {
    values.actions.docs.forEach((doc, index) => {
      if (!doc._id || !doc._index) {
        if (!errors.actions) errors.actions = {};
        if (!errors.actions.docs) errors.actions.docs = {};
        errors.actions.docs[index] = {
          type: 'required',
          message: i18n.translate(
            'xpack.queryRules.queryRulesetDetailFormResolver.idAndIndex.required',
            {
              defaultMessage: 'Document ID and Index are required.',
            }
          ),
        };
      }
    });
  }
};

const validateIdActions = (
  values: QueryRuleEditorForm,
  errors: FieldErrors<QueryRuleEditorForm>
) => {
  // check for ids case all actions are filled
  if (values.actions.ids && values.actions.ids.length > 0) {
    values.actions.ids.forEach((id, index) => {
      if (!id) {
        if (!errors.actions) errors.actions = {};
        if (!errors.actions.ids) errors.actions.ids = {};
        errors.actions.ids[index] = {
          type: 'required',
          message: i18n.translate(
            'xpack.queryRules.queryRulesetDetailFormResolver.action.id.required',
            {
              defaultMessage: 'ID is required.',
            }
          ),
        };
      }
    });
  }
};
