/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCard, EuiFieldText, EuiFlexGrid, EuiFlexItem, EuiForm, EuiFormRow } from '@elastic/eui';
import { FormProvider, useController } from 'react-hook-form';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import { MonacoEditorLangId } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { CodeEditor } from '../../monitor_add_edit/fields/code_editor';
import { syntheticsSuggestionProvider } from '../../../lib/editor/snippets';

interface SnippetData {
  name: string;
  label: string;
  detail: string;
  insertText: string;
}

const snippetsFixtures: SnippetData[] = [
  {
    name: 'Custom Snippet 1',
    label: 'customSnippet1',
    detail: 'This is a custom snippet 1',
    insertText: `// Custom Snippet 1\nconsole.log('This is custom snippet 1');`,
  },
  {
    name: 'Custom Snippet 2',
    label: 'customSnippet2',
    detail: 'This is a custom snippet 2',
    insertText: `// Custom Snippet 1\nconsole.log('This is custom snippet 2');`,
  },
];

export const Snippets = () => {
  return (
    <div style={{ overflowX: 'scroll' }}>
      <EuiFlexGrid columns={2}>
        {snippetsFixtures.map((snippet) => (
          <EuiFlexItem>
            <EuiCard title={snippet.name} display="subdued">
              <SnippetForm key={snippet.name} initialData={snippet} />
            </EuiCard>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
};

interface SnippetFormProps {
  initialData?: SnippetData;
}
const SnippetForm = (props: SnippetFormProps) => {
  const form = useFormWrapped<SnippetData>({
    defaultValues: props.initialData,
  });
  const { register } = form;

  return (
    <FormProvider {...form}>
      <EuiForm component="form">
        <EuiFlexGrid columns={2}>
          <EuiFlexItem css={{ minWidth: '200px' }}>
            <EuiFormRow
              label={i18n.translate('xpack.synthetics.snippetForm.euiFieldText.snippetNameLabel', {
                defaultMessage: 'Name',
              })}
            >
              <EuiFieldText
                data-test-subj="syntheticsSnippetFormFieldText"
                readOnly
                {...register('name')}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.synthetics.snippetForm.euiFieldText.snippetLabelLabel', {
                defaultMessage: 'Label',
              })}
            >
              <EuiFieldText
                data-test-subj="syntheticsSnippetFormFieldText"
                {...register('label')}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.synthetics.snippetForm.euiFieldText.snippetDetailLabel',
                {
                  defaultMessage: 'Detail',
                }
              )}
            >
              <EuiFieldText
                data-test-subj="syntheticsSnippetFormFieldText"
                {...register('detail')}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.synthetics.snippetForm.euiFieldText.snippetInsertTextLabel',
                {
                  defaultMessage: 'Insert Text',
                }
              )}
            >
              <SnippetEditor />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiForm>
    </FormProvider>
  );
};

const SnippetEditor = () => {
  const {
    field: { value, onChange },
  } = useController<SnippetData>({ name: 'insertText' });

  return (
    <CodeEditorContainer>
      <CodeEditor
        ariaLabel={i18n.translate(
          'xpack.synthetics.snippetForm.euiFieldText.snippetInsertTextLabel',
          {
            defaultMessage: 'Insert Text',
          }
        )}
        id="javascript"
        languageId={MonacoEditorLangId.JAVASCRIPT}
        suggestionProvider={syntheticsSuggestionProvider}
        onChange={onChange}
        value={value}
        placeholder={i18n.translate('xpack.synthetics.addEditMonitor.scriptEditor.placeholder', {
          defaultMessage: '// Paste your Playwright script here...',
        })}
      />
    </CodeEditorContainer>
  );
};

const CodeEditorContainer = euiStyled.div`
    &  .monaco-editor .view-line {
      width: auto !important;
    }
`;
