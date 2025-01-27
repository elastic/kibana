/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import type {
  ValidationCancelablePromise,
  ValidationFuncArg,
  ValidationResponsePromise,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type {
  RuleAction,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { validateActionFilterQuery } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleActionsFormData } from '../../../../../detection_engine/rule_management_ui/components/rules_table/bulk_actions/forms/rule_actions_form';
import type { ActionsStepRule } from '../../../../pages/detection_engine/rules/types';
import type { ValidationFunc, ERROR_CODE } from '../../../../../shared_imports';
import { getActionTypeName, validateMustache, validateActionParams } from './utils';

export const DEFAULT_VALIDATION_TIMEOUT = 100;

export const validateSingleAction = async (
  actionItem: RuleAction,
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<string[]> => {
  const actionParamsErrors = await validateActionParams(actionItem, actionTypeRegistry);
  const mustacheErrors = validateMustache(actionItem.params);
  const queryErrors = validateActionFilterQuery(actionItem);

  return [...actionParamsErrors, ...mustacheErrors, ...(queryErrors ? [queryErrors] : [])];
};

export const validateRuleActionsField =
  (actionTypeRegistry: ActionTypeRegistryContract) =>
  async (...data: Parameters<ValidationFunc>): ValidationResponsePromise<ERROR_CODE> => {
    const [{ value, path }] = data as [{ value: RuleAction[]; path: string }];

    const errors = [];
    for (const actionItem of value) {
      const errorsArray = await validateSingleAction(actionItem, actionTypeRegistry);

      if (errorsArray.length) {
        const actionTypeName = getActionTypeName(actionItem.actionTypeId);
        const errorsListItems = errorsArray.map((error) => `*   ${error}\n`);

        errors.push(`\n**${actionTypeName}:**\n${errorsListItems.join('')}`);
      }
    }

    if (errors.length) {
      return {
        code: 'ERR_FIELD_FORMAT',
        path,
        message: `${errors.join('\n')}`,
      };
    }
  };

/**
 * Debounces validation by canceling previous validation requests. Essentially leveraging the async validation
 * cancellation behavior from the hook_form_lib. Necessary to prevent error validation flashing when first adding an
 * action until root cause of https://github.com/elastic/kibana/issues/142217 is found
 *
 * See docs for details:
 * https://docs.elastic.dev/form-lib/examples/validation#cancel-asynchronous-validation
 *
 * Note: _.throttle/debounce does not have async support, and so not used https://github.com/lodash/lodash/issues/4815.
 *
 * @param actionTypeRegistry
 * @param defaultValidationTimeout
 */
export const debouncedValidateRuleActionsField =
  (
    actionTypeRegistry: ActionTypeRegistryContract,
    defaultValidationTimeout = DEFAULT_VALIDATION_TIMEOUT
  ) =>
  (data: ValidationFuncArg<ActionsStepRule | RuleActionsFormData>): ValidationResponsePromise => {
    let isCanceled = false;
    const promise: ValidationCancelablePromise = new Promise((resolve) => {
      setTimeout(() => {
        if (isCanceled) {
          resolve();
        } else {
          resolve(validateRuleActionsField(actionTypeRegistry)(data));
        }
      }, defaultValidationTimeout);
    });

    promise.cancel = () => {
      isCanceled = true;
    };

    return promise;
  };
