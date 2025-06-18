/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldErrors, Resolver } from 'react-hook-form';
import { QueryRuleEditorForm } from '../types';

const hasErrors = (errors: FieldErrors<QueryRuleEditorForm>): boolean =>
  Object.keys(errors).length > 0;

export const queryRulesetDetailFormResolver: Resolver<QueryRuleEditorForm> = async (values) => {
  const errors: FieldErrors<QueryRuleEditorForm> = {};

  if (!values.criteria || values.criteria.length === 0) {
    errors.criteria = {
      type: 'required',
      message: 'At least one criteria is required.',
    };
  } else {
    values.criteria.forEach((criteria, index) => {
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
                message: `Values must be numeric for criteria type "${criteria.type}".`,
              };
            }
          });
        }
      }
      if (criteria.type !== 'always') {
        if (!criteria.values || criteria.values.length === 0) {
          // ! operator is used as we check and validate the initialization for all, TS cannot infer this
          if (!errors.criteria) errors.criteria = {};
          if (!errors.criteria[index]) errors.criteria[index] = {};
          errors.criteria[index]!.values = {
            type: 'required',
            message: 'At least one value is required',
          };
        }

        if (!criteria.metadata || criteria.metadata.trim() === '') {
          // ! operator is used as we check and validate the initialization for all, TS cannot infer this
          if (!errors.criteria) errors.criteria = {};
          if (!errors.criteria[index]) errors.criteria[index] = {};
          errors.criteria[index]!.metadata = {
            type: 'required',
            message: 'Metadata is required',
          };
        }
      }
    });
  }

  if (!values.actions) {
    errors.actions = {
      type: 'required',
      message: 'At least one action is required.',
    };
  }

  if (values.actions.docs && !values.actions.ids && values.actions.docs.length === 0) {
    errors.actions = {
      type: 'required',
      message: 'At least one document action is required.',
    };
  }

  if (values.actions.ids && !values.actions.docs && values.actions.ids.length === 0) {
    errors.actions = {
      type: 'required',
      message: 'At least one ID action is required.',
    };
  }

  // check for  docs case all actions are filled
  if (values.actions.docs && values.actions.docs.length > 0) {
    values.actions.docs.forEach((doc, index) => {
      if (!doc._id || !doc._index) {
        if (!errors.actions) errors.actions = {};
        if (!errors.actions.docs) errors.actions.docs = {};
        errors.actions.docs[index] = {
          type: 'required',
          message: 'Document ID and Index are required.',
        };
      }
    });
  }

  // check for ids case all actions are filled
  if (values.actions.ids && values.actions.ids.length > 0) {
    values.actions.ids.forEach((id, index) => {
      if (!id) {
        if (!errors.actions) errors.actions = {};
        if (!errors.actions.ids) errors.actions.ids = {};
        errors.actions.ids[index] = {
          type: 'required',
          message: 'ID is required.',
        };
      }
    });
  }

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
