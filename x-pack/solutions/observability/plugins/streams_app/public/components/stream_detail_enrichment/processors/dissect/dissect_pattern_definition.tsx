/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiLink } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../hooks/use_kibana';
import { ProcessorFormState } from '../../types';

export const DissectPatternDefinition = () => {
  const { core } = useKibana();
  const esDocUrl = core.docLinks.links.ingest.dissectKeyModifiers;

  const { field, fieldState } = useController<ProcessorFormState, 'pattern'>({
    name: 'pattern',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternRequiredError',
        { defaultMessage: 'A pattern is required.' }
      ),
    },
  });

  const { invalid, error } = fieldState;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsLabel',
        { defaultMessage: 'Pattern' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsHelpText"
          defaultMessage="Pattern used to dissect the specified field. The pattern is defined by the parts of the string to discard. Use a {keyModifier} to alter the dissection behavior."
          values={{
            keyModifier: (
              <EuiLink
                data-test-subj="streamsAppDissectPatternDefinitionKeyModifierLink"
                target="_blank"
                external
                href={esDocUrl}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsLink',
                  { defaultMessage: 'key modifier' }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      isInvalid={invalid}
      error={error?.message}
      fullWidth
    >
      <CodeEditor
        value={serialize(field.value)}
        onChange={(value) => field.onChange(deserialize(value))}
        languageId="text"
        height={75}
        options={{ minimap: { enabled: false } }}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternDefinitionsAriaLabel',
          { defaultMessage: 'Pattern editor' }
        )}
      />
    </EuiFormRow>
  );
};

const serialize = (input: string) => {
  if (typeof input === 'string') {
    const s = JSON.stringify(input);
    return s.slice(1, s.length - 1);
  }

  return input;
};

const deserialize = (input: string) => {
  if (typeof input === 'string') {
    try {
      return JSON.parse(`"${input}"`);
    } catch (e) {
      return input;
    }
  }
};
