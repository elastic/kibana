/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import {
  MAX_SOURCE_DESCRIPTION_LENGTH,
  MAX_SOURCE_TAGS,
  MAX_SOURCE_TAG_LENGTH,
  MAX_SOURCE_TITLE_LENGTH,
  validateSourceQuery,
  type NightshiftSource,
} from '@kbn/nightshift-shared';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useSourcesApi } from '../../../../../hooks/use_sources_api';
import { getFormattedError } from '../../../../../util/errors';
import { SourcePreview } from './source_preview';

interface SourceFormValues {
  title: string;
  description: string;
  tags: string[];
  esql: string;
}

interface SourceFlyoutProps {
  /** Source to edit; the flyout creates a new source when it is absent. */
  source?: NightshiftSource;
  /** Shows the source without letting the user change it, for users who cannot manage sources. */
  readOnly?: boolean;
  onClose: () => void;
}

// Title, description and tags limits are checked before sending, so a 400 from the sources
// API is about the query (parse, allowed commands, or the `LIMIT 0` probe).
const isBadRequest = (error: unknown) => isHttpFetchError(error) && error.response?.status === 400;

export function SourceFlyout({ source, readOnly = false, onClose }: SourceFlyoutProps) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { createSource, updateSource } = useSourcesApi();
  const titleId = useGeneratedHtmlId();
  // Only the query the user ran is previewed, so typing does not search on every keystroke.
  // `runId` changes on every run, so running an unchanged query still refetches it.
  const [preview, setPreview] = useState({ esql: source?.esql ?? '', runId: 0 });
  const runPreview = (esql: string) => setPreview(({ runId }) => ({ esql, runId: runId + 1 }));

  const { control, getValues, handleSubmit, setError, formState } = useForm<SourceFormValues>({
    defaultValues: {
      title: source?.title ?? '',
      description: source?.description ?? '',
      tags: source?.tags ?? [],
      esql: source?.esql ?? '',
    },
  });

  const save = handleSubmit(async ({ title, description, tags, esql }) => {
    const body = {
      title,
      description: description.trim() === '' ? undefined : description,
      tags,
      esql,
    };
    try {
      if (source) {
        await updateSource.mutateAsync({ sourceId: source.id, body });
      } else {
        await createSource.mutateAsync(body);
      }
      onClose();
    } catch (error) {
      if (isBadRequest(error)) {
        setError('esql', { message: getFormattedError(error).message });
        return;
      }
      toasts.addError(getFormattedError(error), { title: SAVE_ERROR_TOAST_TITLE });
    }
  });

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="significantEventsAppSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{readOnly ? DETAILS_TITLE : source ? EDIT_TITLE : CREATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* A flex child of the flyout, so both panels fill the height between header and footer. */}
      <EuiResizableContainer css={{ flexGrow: 1, minHeight: 0 }}>
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel initialSize={40} minSize="350px" paddingSize="l" tabIndex={0}>
              <EuiText size="s" color="subdued">
                <p>{FORM_DESCRIPTION}</p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiForm fullWidth>
                <Controller
                  name="title"
                  control={control}
                  rules={{ validate: (value) => value.trim() !== '' || TITLE_REQUIRED }}
                  render={({ field, fieldState }) => (
                    <EuiFormRow
                      label={TITLE_LABEL}
                      isInvalid={fieldState.invalid}
                      error={fieldState.error?.message}
                    >
                      <EuiFieldText
                        data-test-subj="significantEventsAppSourceFlyoutTitleInput"
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        maxLength={MAX_SOURCE_TITLE_LENGTH}
                        isInvalid={fieldState.invalid}
                        readOnly={readOnly}
                      />
                    </EuiFormRow>
                  )}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <EuiFormRow label={DESCRIPTION_LABEL} labelAppend={OPTIONAL_LABEL}>
                      <EuiTextArea
                        data-test-subj="significantEventsAppSourceFlyoutDescriptionInput"
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        maxLength={MAX_SOURCE_DESCRIPTION_LENGTH}
                        rows={3}
                        readOnly={readOnly}
                      />
                    </EuiFormRow>
                  )}
                />
                <Controller
                  name="tags"
                  control={control}
                  rules={{
                    validate: (tags) => {
                      if (tags.length > MAX_SOURCE_TAGS) {
                        return i18n.translate(
                          'xpack.significantEventsApp.sources.flyout.tooManyTags',
                          {
                            defaultMessage: 'A source can have at most {max} tags',
                            values: { max: MAX_SOURCE_TAGS },
                          }
                        );
                      }
                      if (tags.some((tag) => tag.length > MAX_SOURCE_TAG_LENGTH)) {
                        return i18n.translate(
                          'xpack.significantEventsApp.sources.flyout.tagTooLong',
                          {
                            defaultMessage: 'A tag can have at most {max} characters',
                            values: { max: MAX_SOURCE_TAG_LENGTH },
                          }
                        );
                      }
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <EuiFormRow
                      label={TAGS_LABEL}
                      labelAppend={OPTIONAL_LABEL}
                      isInvalid={fieldState.invalid}
                      error={fieldState.error?.message}
                    >
                      <EuiComboBox
                        data-test-subj="significantEventsAppSourceFlyoutTagsInput"
                        fullWidth
                        noSuggestions
                        // EuiComboBox has no read-only mode.
                        isDisabled={readOnly}
                        isInvalid={fieldState.invalid}
                        selectedOptions={field.value.map((tag) => ({ label: tag }))}
                        onChange={(options) => field.onChange(options.map(({ label }) => label))}
                        onCreateOption={(value) => {
                          const tag = value.trim();
                          if (tag !== '' && !field.value.includes(tag)) {
                            field.onChange([...field.value, tag]);
                          }
                        }}
                        onBlur={field.onBlur}
                      />
                    </EuiFormRow>
                  )}
                />
                <Controller
                  name="esql"
                  control={control}
                  rules={{ validate: (esql) => validateSourceQuery(esql) ?? true }}
                  render={({ field, fieldState }) => (
                    <EuiFormRow
                      label={QUERY_LABEL}
                      helpText={QUERY_HELP_TEXT}
                      isInvalid={fieldState.invalid}
                      error={fieldState.error?.message}
                      data-test-subj="significantEventsAppSourceFlyoutQueryRow"
                    >
                      <ESQLLangEditor
                        dataTestSubj="significantEventsAppSourceFlyoutQueryEditor"
                        query={{ esql: field.value }}
                        onTextLangQueryChange={({ esql }) => field.onChange(esql)}
                        onTextLangQuerySubmit={async (query) => {
                          if (query) {
                            runPreview(query.esql);
                          }
                        }}
                        disableAutoFocus
                        editorIsInline
                        expandToFitQueryOnMount
                        hasOutline
                        // Replaced by the Run query button below, which lines up with the form.
                        hideRunQueryButton
                        isDisabled={readOnly}
                      />
                    </EuiFormRow>
                  )}
                />
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="significantEventsAppSourceFlyoutRunQueryButton"
                      size="s"
                      iconType="play"
                      onClick={() => runPreview(getValues('esql'))}
                    >
                      {RUN_QUERY_LABEL}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiForm>
            </EuiResizablePanel>
            <EuiResizableButton indicator="border" />
            <EuiResizablePanel initialSize={60} minSize="300px" paddingSize="l" tabIndex={0}>
              <SourcePreview esql={preview.esql} runId={preview.runId} />
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="significantEventsAppSourceFlyoutCancelButton"
            iconType="cross"
            flush="left"
            onClick={onClose}
          >
            {readOnly ? CLOSE_LABEL : CANCEL_LABEL}
          </EuiButtonEmpty>
          {!readOnly && (
            <EuiButton
              data-test-subj="significantEventsAppSourceFlyoutSaveButton"
              fill
              isLoading={formState.isSubmitting}
              onClick={save}
            >
              {source ? SAVE_LABEL : CREATE_LABEL}
            </EuiButton>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

const CREATE_TITLE = i18n.translate('xpack.significantEventsApp.sources.flyout.createTitle', {
  defaultMessage: 'Create source',
});

const EDIT_TITLE = i18n.translate('xpack.significantEventsApp.sources.flyout.editTitle', {
  defaultMessage: 'Edit source',
});

const DETAILS_TITLE = i18n.translate('xpack.significantEventsApp.sources.flyout.detailsTitle', {
  defaultMessage: 'Source details',
});

const FORM_DESCRIPTION = i18n.translate('xpack.significantEventsApp.sources.flyout.description', {
  defaultMessage:
    'Describe the data to learn about with an ES|QL query. Nightshift onboards it, finds its knowledge indicators and watches it for significant events.',
});

const TITLE_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.titleLabel', {
  defaultMessage: 'Title',
});

const TITLE_REQUIRED = i18n.translate('xpack.significantEventsApp.sources.flyout.titleRequired', {
  defaultMessage: 'Title is required',
});

const DESCRIPTION_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.flyout.descriptionLabel',
  { defaultMessage: 'Description' }
);

const TAGS_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.tagsLabel', {
  defaultMessage: 'Tags',
});

const OPTIONAL_LABEL = (
  <EuiText size="xs" color="subdued">
    {i18n.translate('xpack.significantEventsApp.sources.flyout.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);

const QUERY_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.queryLabel', {
  defaultMessage: 'ES|QL query',
});

const QUERY_HELP_TEXT = i18n.translate('xpack.significantEventsApp.sources.flyout.queryHelpText', {
  defaultMessage: 'Start with FROM or TS; only WHERE may follow. Run the query to preview it.',
});

const RUN_QUERY_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.runQueryLabel', {
  defaultMessage: 'Run query',
});

const CANCEL_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.cancelLabel', {
  defaultMessage: 'Cancel',
});

const CLOSE_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.closeLabel', {
  defaultMessage: 'Close',
});

const CREATE_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.createLabel', {
  defaultMessage: 'Create source',
});

const SAVE_LABEL = i18n.translate('xpack.significantEventsApp.sources.flyout.saveLabel', {
  defaultMessage: 'Save',
});

const SAVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.flyout.saveErrorToastTitle',
  { defaultMessage: 'Could not save the source' }
);
