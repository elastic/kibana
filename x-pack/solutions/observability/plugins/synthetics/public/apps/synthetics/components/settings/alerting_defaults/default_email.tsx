/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SyntheticsPluginServices } from '../../../../../plugin';
import { DefaultEmail as DefaultEmailType } from '../../../../../../common/runtime_types';
import { hasInvalidEmail } from './validation';

export function DefaultEmail({
  loading,
  onChange,
  value,
  isDisabled,
  selectedConnectors,
}: {
  onChange: (value: Partial<DefaultEmailType>) => void;
  value?: Partial<DefaultEmailType>;
  isDisabled: boolean;
  loading: boolean;
  selectedConnectors: string[];
}) {
  const { actionTypeRegistry } = useKibana<SyntheticsPluginServices>().services.triggersActionsUi;

  const emailActionType = actionTypeRegistry.get('.email');
  const ActionParams = emailActionType.actionParamsFields;

  const [isTouched, setIsTouched] = useState(false);

  const errors = hasInvalidEmail(selectedConnectors, value, isTouched);

  return (
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.synthetics.sourceConfiguration.alertConnectors.defaultEmail"
            defaultMessage="Default email"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.synthetics.sourceConfiguration.defaultConnectors.description.defaultEmail"
          defaultMessage="Email settings required for selected email alert connectors."
        />
      }
    >
      <ActionParams
        isLoading={loading}
        actionParams={value ?? {}}
        errors={errors}
        editAction={(key, val, index) => {
          if (key !== 'message') {
            onChange({ ...(value ?? {}), [key]: val });
          }
        }}
        showEmailSubjectAndMessage={false}
        index={1}
        isDisabled={isDisabled}
        onBlur={() => setIsTouched(true)}
      />
    </EuiDescribedFormGroup>
  );
}
