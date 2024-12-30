/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperSelectOption, EuiFlexGroup, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { FieldDefinitionConfig } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { useController } from 'react-hook-form';

interface ProcessorFieldSelectorProps {
  fields: Array<{ name: string; type: FieldDefinitionConfig['type'] }>;
}

export const ProcessorFieldSelector = ({ fields }: ProcessorFieldSelectorProps) => {
  const { field, fieldState } = useController({ name: 'field', rules: { required: true } });

  // Should we filter the available options by "match_only_text" only?
  const options: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      fields.map(({ name, type }) => ({
        value: name,
        inputDisplay: type ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {type && <FieldIcon type={type} size="s" />}
            {name}
          </EuiFlexGroup>
        ) : (
          name
        ),
      })),
    [fields]
  );

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorLabel',
        { defaultMessage: 'Field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorHelpText',
        { defaultMessage: 'Field to search for matches.' }
      )}
    >
      <EuiSuperSelect
        isInvalid={fieldState.invalid}
        options={options}
        valueOfSelected={field.value as string}
        onChange={field.onChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorPlaceholder',
          { defaultMessage: 'message, event.original ...' }
        )}
      />
    </EuiFormRow>
  );
};
