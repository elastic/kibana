/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiCodeBlock, EuiPanel, useGeneratedHtmlId } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SchemaField } from '../types';

const label = i18n.translate('xpack.streams.advancedFieldMappingOptions.label', {
  defaultMessage: 'Advanced field mapping options',
});

export const AdvancedFieldMappingOptions = ({
  field,
  onChange,
  isEditing,
}: {
  field: SchemaField;
  onChange: (field: Partial<SchemaField>) => void;
  isEditing: boolean;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordionID' });

  const [jsonOptions, setJsonOptions] = useState(() => {
    return field.additionalProperties
      ? JSON.stringify(field.additionalProperties, null, 2)
      : undefined;
  });

  return (
    <EuiAccordion id={accordionId} buttonContent={label}>
      <EuiPanel color="subdued">
        {isEditing ? (
          <CodeEditor
            height={120}
            languageId="json"
            value={jsonOptions || ''}
            onChange={(e) => {
              setJsonOptions(e);
              try {
                const options = JSON.parse(e);
                onChange({ additionalProperties: options });
              } catch (error: unknown) {
                // do nothing
              }
            }}
          />
        ) : (
          <EuiCodeBlock language="json" isCopyable>
            {jsonOptions ?? ''}
          </EuiCodeBlock>
        )}
      </EuiPanel>
    </EuiAccordion>
  );
};
