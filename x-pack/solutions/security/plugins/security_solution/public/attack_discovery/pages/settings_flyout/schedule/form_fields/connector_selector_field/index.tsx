/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { EuiFormRow } from '@elastic/eui';
import { type FieldHook, getFieldValidityAndErrorMessage } from '../../../../../../shared_imports';

interface Props {
  connectorId?: string;
  field: FieldHook;
  onConnectorIdSelected: (selectedConnectorId: string) => void;
}

export const ConnectorSelectorField: React.FC<Props> = React.memo(
  ({ connectorId, field, onConnectorIdSelected }) => {
    const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

    return (
      <EuiFormRow
        label={field.label}
        labelAppend={field.labelAppend}
        helpText={field.helpText}
        error={errorMessage}
        isInvalid={isInvalid}
        fullWidth
        data-test-subj="attackDiscoveryConnectorSelectorField"
      >
        <ConnectorSelectorInline
          fullWidth={true}
          onConnectorSelected={noop}
          onConnectorIdSelected={onConnectorIdSelected}
          selectedConnectorId={connectorId}
        />
      </EuiFormRow>
    );
  }
);
ConnectorSelectorField.displayName = 'ConnectorSelectorField';
