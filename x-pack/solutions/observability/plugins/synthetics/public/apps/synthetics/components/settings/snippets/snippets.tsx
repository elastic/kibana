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
import type { FieldValues } from 'react-hook-form';
import { FormProvider, useController } from 'react-hook-form';
import { euiStyled } from '@kbn/react-kibana-context-styled';
import type {
  SyntheticsServiceSnippetType,
  SyntheticsServiceSnippetWithIdType,
} from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { MonacoEditorLangId } from '../../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { CodeEditor } from '../../monitor_add_edit/fields/code_editor';
import { useDeleteSnippet, useGetSnippets, usePostSnippet } from './hooks';
import { useSnippetsSuggestions } from './use_snippets_suggestions';

export const Snippets = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<
    SyntheticsServiceSnippetWithIdType | undefined
  >(undefined);

  const {
    snippets = [],
    refetch: refetchSnippets,
    isFetching: isFetchingSnippets,
  } = useGetSnippets();
  const postSnippetMutation = usePostSnippet();
  const deleteSnippetMutation = useDeleteSnippet();
  useSnippetsSuggestions({ snippets });

  const isLoading = isFetchingSnippets || postSnippetMutation.isLoading;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditSnippet = (snippet: SyntheticsServiceSnippetWithIdType) => {
    // Logic to open the snippet in an editor or modal for editing
    setSelectedSnippet(snippet);
    setIsFlyoutVisible(true);
  };

  const handleCreateSnippet = () => {
    setSelectedSnippet(undefined);
    setIsFlyoutVisible(true);
  };

  const submitAddSnippet = async (snippet: SyntheticsServiceSnippetType) => {
    await postSnippetMutation.mutateAsync({ snippet });
    refetchSnippets();
    setIsFlyoutVisible(false);
  };

  const submitEditSnippet = (snippet: SyntheticsServiceSnippetWithIdType) => {
    // ToDo: Logic to save the edited snippet
    setIsFlyoutVisible(false);
  };

  const submitDeleteSnippet = async (snippet: SyntheticsServiceSnippetWithIdType) => {
    try {
      setIsDeleting(true);
      await deleteSnippetMutation.mutateAsync({ snippet });
      await refetchSnippets();
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = !!selectedSnippet && isFlyoutVisible;

  const columns: Array<EuiBasicTableColumn<SyntheticsServiceSnippetWithIdType>> = [
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
          name: 'Edit',
          description: 'Edit Snippet',
          render: (snippet) => (
            <EuiButton
              iconType="pencil"
              size="s"
              data-test-subj="syntheticsEditSnippetButton"
              onClick={() => handleEditSnippet(snippet)}
            />
          ),
        },
        {
          name: 'Delete',
          description: 'Delete Snippet',
          color: 'danger',
          render: (snippet) => (
            <EuiButton
              color="danger"
              iconType="trash"
              onClick={() => submitDeleteSnippet(snippet)}
              size="s"
              data-test-subj="syntheticsDeleteSnippetButton"
              isLoading={isDeleting}
            />
          ),
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
              {isEditing ? (
                <EditSnippetForm
                  initialData={selectedSnippet}
                  onSubmit={submitEditSnippet}
                  isLoading={false}
                />
              ) : (
                <CreateSnippetForm
                  onSubmit={submitAddSnippet}
                  isLoading={postSnippetMutation.isLoading}
                />
              )}
            </EuiFlyoutBody>
          </FlyoutBodyContainer>
        </EuiFlyout>
      )}
    </>
  );
};

interface SnippetFormProps<T extends FieldValues> {
  initialData?: SyntheticsServiceSnippetType;
  form: ReturnType<typeof useFormWrapped<T>>;
  onSubmit?: () => void;
  isLoading?: boolean;
}
const SnippetForm = <T extends FieldValues>({ form, onSubmit, isLoading }: SnippetFormProps<T>) => {
  const { register } = form;
  const customRegister = (name: keyof SyntheticsServiceSnippetType) => {
    const { ref, ...restField } = register(name);
    return restField;
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
            disabled={!!form.formState.defaultValues}
            title={!!form.formState.defaultValues ? 'Coming soon!' : ''}
            onClick={onSubmit}
            isLoading={isLoading}
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

interface CreateSnippetFormProps {
  onSubmit: (data: SyntheticsServiceSnippetType) => void;
  isLoading: boolean;
}
const CreateSnippetForm = ({ onSubmit, isLoading }: CreateSnippetFormProps) => {
  const form = useFormWrapped<SyntheticsServiceSnippetType>();
  const { handleSubmit } = form;

  return <SnippetForm form={form} onSubmit={handleSubmit(onSubmit)} isLoading={isLoading} />;
};
interface EditSnippetFormProps {
  initialData: SyntheticsServiceSnippetWithIdType;
  onSubmit: (data: SyntheticsServiceSnippetWithIdType) => void;
  isLoading: boolean;
}
const EditSnippetForm = ({ initialData, onSubmit, isLoading }: EditSnippetFormProps) => {
  const form = useFormWrapped<SyntheticsServiceSnippetWithIdType>({
    defaultValues: initialData,
  });
  const { handleSubmit } = form;

  return <SnippetForm form={form} onSubmit={handleSubmit(onSubmit)} isLoading={isLoading} />;
};

const SnippetEditor = () => {
  const {
    field: { value, onChange },
  } = useController<SyntheticsServiceSnippetType>({ name: 'insertText' });

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
