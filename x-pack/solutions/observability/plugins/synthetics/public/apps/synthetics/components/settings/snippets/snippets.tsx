/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormProvider, useController } from 'react-hook-form';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import { MonacoEditorLangId } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { CodeEditor } from '../../monitor_add_edit/fields/code_editor';
import { useGetSnippets, usePostSnippet } from './hooks';
import { useSnippetsSuggestions } from './use_snippets_suggestions';

export interface SnippetData {
  name: string;
  label: string;
  detail: string;
  insertText: string;
}

export const Snippets = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<SnippetData | undefined>(undefined);

  const {
    snippets = [],
    refetch: refetchSnippets,
    isLoading: isLoadingSnippets,
  } = useGetSnippets();
  const postSnippetMutation = usePostSnippet();
  useSnippetsSuggestions({ snippets });

  const isLoading = isLoadingSnippets || postSnippetMutation.isLoading;

  const handleEditSnippet = (snippet: SnippetData) => {
    // Logic to open the snippet in an editor or modal for editing
    setSelectedSnippet(snippet);
    setIsFlyoutVisible(true);
  };

  const handleDeleteSnippet = (snippet: SnippetData) => {
    // Logic to delete the snippet
    // setSnippets((prevSnippets) => prevSnippets.filter((s) => s.label !== snippet.label));
    // console.log('Delete snippet:', snippet);
  };

  const handleCreateSnippet = () => {
    setSelectedSnippet(undefined);
    setIsFlyoutVisible(true);
  };

  const submitAddSnippet = async (snippet: SnippetData) => {
    // setSnippets((prevSnippets) => [...prevSnippets, snippet]);
    await postSnippetMutation.mutateAsync({ snippet });
    refetchSnippets();
    setIsFlyoutVisible(false);
  };

  const submitEditSnippet = (snippet: SnippetData) => {
    // setSnippets((prevSnippets) =>
    //   prevSnippets.map((s) => (s.label === snippet.label ? snippet : s))
    // );
    setIsFlyoutVisible(false);
  };

  const isEditing = Boolean(selectedSnippet) && isFlyoutVisible;

  const columns: Array<EuiBasicTableColumn<SnippetData>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.synthetics.snippets.table.nameColumn', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'label',
      name: i18n.translate('xpack.synthetics.snippets.table.labelColumn', {
        defaultMessage: 'Label',
      }),
    },
    {
      field: 'detail',
      name: i18n.translate('xpack.synthetics.snippets.table.detailColumn', {
        defaultMessage: 'Detail',
      }),
    },
    {
      name: i18n.translate('xpack.synthetics.snippets.table.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          icon: 'pencil',
          name: 'Edit',
          description: 'Edit Snippet',
          type: 'icon',
          onClick: handleEditSnippet,
        },
        {
          icon: 'trash',
          name: 'Delete',
          description: 'Delete Snippet',
          type: 'icon',
          onClick: handleDeleteSnippet,
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText>
            {i18n.translate('xpack.synthetics.snippets.defineReusableCodeSnippetsTextLabel', {
              defaultMessage:
                'Define reusable code snippets to enhance your synthetics scripts. These snippets can be easily inserted into your scripts, saving you time and effort.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsAddSnippetButton"
            onClick={handleCreateSnippet}
            fill
            isLoading={isLoading}
          >
            {i18n.translate('xpack.synthetics.snippets.addSnippetButtonLabel', {
              defaultMessage: 'Add Snippet',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        tableCaption="List of code snippets"
        columns={columns}
        items={snippets}
        loading={isLoading}
      />
      {isFlyoutVisible && (
        <EuiFlyout
          onClose={() => setIsFlyoutVisible(false)}
          aria-label={i18n.translate('xpack.synthetics.snippets.euiFlyout.snippetFormLabel', {
            defaultMessage: 'snippet form',
          })}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{selectedSnippet ? 'Edit snippet' : 'Create snippet'}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <FlyoutBodyContainer>
            <EuiFlyoutBody>
              <SnippetForm
                initialData={selectedSnippet}
                onSubmit={isEditing ? submitEditSnippet : submitAddSnippet}
                isLoading={isLoading}
              />
            </EuiFlyoutBody>
          </FlyoutBodyContainer>
        </EuiFlyout>
      )}
    </>
  );
};

interface SnippetFormProps {
  initialData?: SnippetData;
  onSubmit?: (data: SnippetData) => void;
  isLoading?: boolean;
}
const SnippetForm = (props: SnippetFormProps) => {
  const form = useFormWrapped<SnippetData>({
    defaultValues: props.initialData,
  });
  const { register, handleSubmit } = form;

  const customRegister = (name: keyof SnippetData) => {
    const { ref, ...rest } = register(name);
    return rest;
  };

  return (
    <FormProvider {...form}>
      <EuiForm component="form" fullWidth>
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.snippetForm.euiFieldText.snippetNameLabel', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText
            data-test-subj="syntheticsSnippetFormFieldText"
            {...customRegister('name')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.snippetForm.euiFieldText.snippetLabelLabel', {
            defaultMessage: 'Label',
          })}
        >
          <EuiFieldText
            data-test-subj="syntheticsSnippetFormFieldText"
            {...customRegister('label')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.snippetForm.euiFieldText.snippetDetailLabel', {
            defaultMessage: 'Detail',
          })}
        >
          <EuiFieldText
            data-test-subj="syntheticsSnippetFormFieldText"
            {...customRegister('detail')}
          />
        </EuiFormRow>
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
        <EuiFormRow>
          <EuiButton
            data-test-subj="syntheticsAddParamFlyoutButton"
            onClick={handleSubmit(props.onSubmit ?? (() => {}))}
            isLoading={props.isLoading}
            fill
          >
            {i18n.translate('xpack.synthetics.snippetForm.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFormRow>
      </EuiForm>
    </FormProvider>
  );
};

const SnippetEditor = () => {
  const {
    field: { value, onChange },
  } = useController<SnippetData>({ name: 'insertText' });

  return (
    <CodeEditor
      ariaLabel={i18n.translate(
        'xpack.synthetics.snippetForm.euiFieldText.snippetInsertTextLabel',
        {
          defaultMessage: 'Insert Text',
        }
      )}
      id="javascript"
      languageId={MonacoEditorLangId.JAVASCRIPT}
      onChange={onChange}
      value={value}
      placeholder={i18n.translate('xpack.synthetics.addEditMonitor.scriptEditor.placeholder', {
        defaultMessage: '// Paste your Playwright script here...',
      })}
    />
  );
};

// This is a workaround to fix the issue with EuiFlyoutBody overflow styles interfering with Monaco editor
// suggestion dropdown positioning.
// See https://elastic.slack.com/archives/C7QC1JV6F/p1752857243376749?thread_ts=1752777398.249589&cid=C7QC1JV6F
const FlyoutBodyContainer = euiStyled.div`
  & .euiFlyoutBody__overflow {
  position: relative;
  transform: none;
}`;
