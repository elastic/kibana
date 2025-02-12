/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SchemaField } from '../types';

const label = i18n.translate('xpack.streams.advancedFieldMappingOptions.label', {
  defaultMessage: 'Advanced field mapping parameters',
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
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.streams.advancedFieldMappingOptions.docs.label"
            defaultMessage="Parameters can be defined with JSON. {link}"
            values={{
              link: (
                <EuiLink
                  data-test-subj="streamsAppAdvancedFieldMappingOptionsViewDocumentationLink"
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-params.html"
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.streams.indexPattern.randomSampling.learnMore"
                    defaultMessage="View documentation."
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        {isEditing ? (
          <CodeEditor
            height={120}
            languageId="json"
            value={jsonOptions || ''}
            onChange={(e) => {
              setJsonOptions(e);
              try {
                if (e === '') {
                  onChange({ additionalProperties: undefined });
                } else {
                  const options = JSON.parse(e);
                  onChange({ additionalProperties: options });
                }
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
