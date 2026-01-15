/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SuperSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { getRbacControl } from '../../../../common/endpoint/service/response_actions/utils';
import { useKibana } from '../../../common/lib/kibana';
import { CHOOSE_FROM_THE_LIST, LEARN_MORE } from './translations';
import { EndpointActionText } from './utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import {
  ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
} from '../../../../common/endpoint/service/response_actions/constants';

interface ActionTypeFieldProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const ActionTypeFieldComponent = ({
  basePath,
  disabled,
  readDefaultValueOnForm,
}: ActionTypeFieldProps) => {
  const { endpointPrivileges } = useUserPrivileges();
  const [data] = useFormData();
  const {
    docLinks: {
      links: {
        securitySolution: { responseActions },
      },
    },
  } = useKibana().services;
  const isAutomatedRunsScriptEnabled = useIsExperimentalFeatureEnabled(
    'responseActionsEndpointAutomatedRunScript'
  );

  const enabledActions = useMemo(() => {
    return ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.filter((command) => {
      return command !== 'runscript' || isAutomatedRunsScriptEnabled;
    });
  }, [isAutomatedRunsScriptEnabled]);

  const fieldOptions = useMemo(
    () =>
      enabledActions.map((name) => {
        const missingRbac = !getRbacControl({
          commandName: RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[name],
          privileges: endpointPrivileges,
        });
        const currentActions = map(data.responseActions, 'params.command');
        // we enable just one instance of each action
        const commandAlreadyExists = currentActions.includes(name);
        const isDisabled = commandAlreadyExists || missingRbac;

        return {
          value: name,
          inputDisplay: name,
          dropdownDisplay: <EndpointActionText name={name} isDisabled={missingRbac} />,
          disabled: isDisabled,
          'data-test-subj': `command-type-${name}`,
        };
      }),
    [data.responseActions, enabledActions, endpointPrivileges]
  );

  return (
    <UseField
      path={`${basePath}.command`}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={{
        label: i18n.translate('xpack.securitySolution.responseActions.endpoint.commandLabel', {
          defaultMessage: 'Response action',
        }),
        helpText: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commandDescription"
            defaultMessage="Select an endpoint response action. The response action only runs on hosts with Elastic Defend installed. {docs}"
            values={{
              docs: (
                <EuiLink href={responseActions} target="_blank">
                  {LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        ),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate(
                'xpack.securitySolution.responseActions.endpoint.validations.commandIsRequiredErrorMessage',
                {
                  defaultMessage: 'Action is a required field.',
                }
              )
            ),
          },
        ],
      }}
      component={SuperSelectField}
      isDisabled={disabled}
      componentProps={{
        euiFieldProps: {
          options: fieldOptions,
          placeholder: CHOOSE_FROM_THE_LIST,
          'data-test-subj': 'commandTypeField',
        },
      }}
    />
  );
};

export const ActionTypeField = React.memo(ActionTypeFieldComponent);
