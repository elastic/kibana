/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';

import type { AttackDiscoveryScheduleSchema } from './types';
import { debouncedValidateRuleActionsField } from '../../../../../common/containers/rule_actions/validate_rule_actions_field';
import type { FormSchema } from '../../../../../shared_imports';
import { FIELD_TYPES, fieldValidators } from '../../../../../shared_imports';

const { emptyField } = fieldValidators;

export const getSchema = ({
  actionTypeRegistry,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
}): FormSchema<AttackDiscoveryScheduleSchema> => ({
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.securitySolution.attackDiscovery.schedule.fieldNameLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.securitySolution.attackDiscovery.schedule.nameFieldRequiredError', {
            defaultMessage: 'A name is required.',
          })
        ),
      },
    ],
  },
  connectorId: {
    label: i18n.translate('xpack.securitySolution.attackDiscovery.schedule.fieldConnectorIdLabel', {
      defaultMessage: 'Connector',
    }),
    helpText: i18n.translate(
      'xpack.securitySolution.attackDiscovery.schedule.fieldConnectorIdHelpText',
      {
        defaultMessage: 'This connector will apply to this schedule, only.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.attackDiscovery.schedule.connectorIdFieldRequiredError',
            {
              defaultMessage: 'A connector is required.',
            }
          )
        ),
      },
    ],
  },
  alertsSelectionSettings: {},
  interval: {
    label: i18n.translate('xpack.securitySolution.attackDiscovery.schedule.fieldIntervalLabel', {
      defaultMessage: 'Runs every',
    }),
  },
  actions: {
    validations: [
      {
        // Debounced validator is necessary here to prevent error validation
        // flashing when first adding an action. Also prevents additional renders
        validator: debouncedValidateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
});
