/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiComboBox,
  EuiTextArea,
  EuiFilePicker,
  EuiText,
  EuiCheckbox,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
  htmlIdGenerator,
  EuiButtonEmpty,
  EuiIcon,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedError } from '../../../../../components/formatted_error';
import type {
  usePatchEndpointScript,
  usePostEndpointScript,
} from '../../../../../hooks/script_library';
import { OS_TITLES } from '../../../../../common/translations';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../../../common/endpoint/constants';
import {
  SCRIPT_TAGS,
  SORTED_SCRIPT_TAGS_KEYS,
} from '../../../../../../../common/endpoint/service/scripts_library/constants';
import type {
  EditableScriptFields,
  EndpointScript,
} from '../../../../../../../common/endpoint/types';
import { SCRIPT_LIBRARY_LABELS } from '../../../translations';
import { EndpointScriptEditItem } from './script_edit_item';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';

const buildDraft = (
  item?: EndpointScript & { file?: File }
): EditableScriptFields & { file?: File; fileName?: string; fileSize?: number } => ({
  name: item?.name,
  file: item?.file,
  fileName: item?.fileName,
  fileSize: item?.fileSize,
  platform: item?.platform,
  requiresInput: item?.requiresInput,
  tags: item?.tags,
  pathToExecutable: item?.pathToExecutable,
  description: item?.description,
  instructions: item?.instructions,
  example: item?.example,
});

export interface EndpointScriptEditFormProps {
  error?:
    | ReturnType<typeof usePatchEndpointScript>['error']
    | ReturnType<typeof usePostEndpointScript>['error'];
  onChange: ({
    script,
    isValid,
  }: {
    script: EditableScriptFields & { file?: File; fileName?: string; fileSize?: number };
    isValid: boolean;
  }) => void;
  scriptItem?: EndpointScript & { file?: File };
  show: Extract<Required<ScriptsLibraryUrlParams>['show'], 'edit' | 'create'>;
  'data-test-subj'?: string;
}
export const EndpointScriptEditForm = memo<EndpointScriptEditFormProps>(
  ({ error: submitError, onChange, scriptItem, show, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    const [draftScript, setDraftScript] = useState<
      EditableScriptFields & { file?: File; fileName?: string; fileSize?: number }
    >(() => buildDraft(scriptItem));

    const [hasFormChanged, setHasFormChanged] = useState<boolean>(false);

    const [hasFileError, toggleHasFileError] = useState<boolean>(
      !scriptItem?.fileName || !scriptItem?.fileSize
    );
    const [hasNameError, toggleHasNameError] = useState<boolean>(!scriptItem?.name);
    const [hasPlatformError, toggleHasPlatformError] = useState<boolean>(
      !scriptItem?.platform || !scriptItem?.platform.length
    );

    // show help text for optional fields
    const [hasEmptyDescription, toggleHasEmptyDescription] = useState<boolean>(
      !scriptItem?.description || scriptItem?.description.length === 0
    );
    const [hasEmptyInstructions, toggleHasEmptyInstructions] = useState<boolean>(
      !scriptItem?.instructions || scriptItem?.instructions.length === 0
    );
    const [hasEmptyExample, toggleHasEmptyExample] = useState<boolean>(
      !scriptItem?.example || scriptItem?.example.length === 0
    );

    const hasValidFormData = useMemo(
      () => hasFormChanged && !hasFileError && !hasNameError && !hasPlatformError,
      [hasFormChanged, hasFileError, hasNameError, hasPlatformError]
    );

    // fake file picker state for validation
    const [showFakeFilePicker, setShowFakeFilePicker] = useState<boolean>(!!scriptItem?.fileName);
    // callback used for validation when the file name is cleared to denote "existing file was removed"
    const onRemoveFile = useCallback(() => {
      setShowFakeFilePicker(false);
      toggleHasFileError(true);
      setHasFormChanged(true);

      setDraftScript((prev) => ({
        ...prev,
        file: undefined,
        fileName: undefined,
        fileSize: undefined,
      }));
    }, [setDraftScript]);

    // Since we don't have a File type data on the API response the
    // FilePicker component can't show the existing file as selected and thus
    // we use a fake file picker display to represent the existing file
    // visible when showFakeFilePicker is true or when editing an existing script with fileName
    const fakeFilePickerStyle = useMemo(
      () => ({
        border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`,
        borderRadius: euiTheme.border.radius.small,
        padding: euiTheme.size.l,
      }),
      [euiTheme]
    );

    const fakeFilePicker = useMemo(() => {
      return (
        <>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            direction="column"
            responsive={false}
            css={fakeFilePickerStyle}
            data-test-subj={`${dataTestSubj}-fakeFilePicker`}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="download" size="l" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h5>{scriptItem?.fileName}</h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty type="button" size="xs" onClick={onRemoveFile}>
                {SCRIPT_LIBRARY_LABELS.flyout.body.edit.removeFileButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      );
    }, [dataTestSubj, fakeFilePickerStyle, scriptItem?.fileName, onRemoveFile]);

    // real file picker
    const filePickerUUID = useMemo(() => {
      return htmlIdGenerator('scriptFilePicker')();
    }, []);

    //  platforms
    const selectedPlatforms = useMemo(
      () => scriptItem?.platform?.sort().map((platform) => ({ label: OS_TITLES[platform] })),
      [scriptItem?.platform]
    );

    // types/tags
    const selectedTags = useMemo(
      () => scriptItem?.tags?.sort().map((tag) => ({ label: SCRIPT_TAGS[tag] })) || [],
      [scriptItem?.tags]
    );

    const onChangeFile = useCallback(
      (files: FileList | null) => {
        const selectedFile = files?.item(0) ?? null;
        toggleHasFileError(!selectedFile || !selectedFile.size);
        setHasFormChanged(true);

        setDraftScript((prev) => ({
          ...prev,
          file: selectedFile ?? undefined,
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size,
        }));
      },
      [setDraftScript]
    );

    const onChangeName = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value.trim();
        toggleHasNameError(!name.length);
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, name }));
      },
      [setDraftScript]
    );

    const onChangePlatforms = useCallback(
      (selectedOptions: Array<{ label: string }>) => {
        const platforms = selectedOptions
          .map((option) =>
            Object.keys(OS_TITLES).find(
              (key) => OS_TITLES[key as keyof typeof OS_TITLES] === option.label
            )
          )
          .sort() as EndpointScript['platform'];
        toggleHasPlatformError(!platforms.length);
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, platform: platforms }));
      },
      [setDraftScript]
    );

    const onChangeTags = useCallback(
      (selectedOptions: Array<{ label: string }>) => {
        const tags = selectedOptions
          .map((option) =>
            Object.keys(SCRIPT_TAGS).find(
              (key) => SCRIPT_TAGS[key as keyof typeof SCRIPT_TAGS] === option.label
            )
          )
          .sort() as EndpointScript['tags'];
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, tags }));
      },
      [setDraftScript]
    );

    const onChangeRequiresInput = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const requiresInput = event.target.checked;
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, requiresInput }));
      },
      [setDraftScript]
    );

    const onChangePathToExecutable = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const pathToExecutable = event.target.value;
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, pathToExecutable }));
      },
      [setDraftScript]
    );

    const onChangeDescription = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const description = e.target.value.trim();
        toggleHasEmptyDescription(!description);
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, description }));
      },
      [setDraftScript]
    );

    const onChangeInstructions = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const instructions = event.target.value.trim();
        toggleHasEmptyInstructions(!instructions);
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, instructions }));
      },
      [setDraftScript]
    );

    const onChangeExample = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const example = event.target.value.trim();
        toggleHasEmptyExample(!example);
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, example }));
      },
      [setDraftScript]
    );

    const labelAppend = (
      <EuiText size="xs" color="subdued">
        {SCRIPT_LIBRARY_LABELS.flyout.body.edit.optionalFieldLabel}
      </EuiText>
    );

    useEffect(() => {
      onChange({
        script: draftScript,
        isValid: hasValidFormData,
      });
    }, [draftScript, hasValidFormData, onChange]);

    return (
      <EuiForm
        component="div"
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={`${dataTestSubj}-submitError`} />
          ) : undefined
        }
        fullWidth
        isInvalid={!!submitError}
        data-test-subj={`${dataTestSubj}-form`}
      >
        {/* file picker */}
        {showFakeFilePicker ? (
          fakeFilePicker
        ) : (
          <EuiFormRow
            isInvalid={hasFileError}
            error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.filePickerPrompt.validationErrorMessage}
          >
            <EuiFilePicker
              isInvalid={hasFileError}
              id={filePickerUUID}
              initialPromptText={SCRIPT_LIBRARY_LABELS.flyout.body.edit.filePickerPrompt.label}
              onChange={onChangeFile}
            />
          </EuiFormRow>
        )}

        {/* name */}
        <EuiFormRow
          isInvalid={hasNameError}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.name.validationErrorMessage}
          label={
            <EndpointScriptEditItem label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.name.label} />
          }
        >
          <EuiFieldText
            isInvalid={hasNameError}
            defaultValue={scriptItem?.name}
            onChange={onChangeName}
          />
        </EuiFormRow>

        {/* platforms */}
        <EuiFormRow
          isInvalid={hasPlatformError}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.platforms.validationErrorMessage}
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.platforms.label}
            />
          }
        >
          <EuiComboBox
            isInvalid={hasPlatformError}
            fullWidth
            options={SUPPORTED_HOST_OS_TYPE.map((platform) => ({
              label: OS_TITLES[platform],
            }))}
            selectedOptions={selectedPlatforms}
            onChange={onChangePlatforms}
            isClearable={true}
          />
        </EuiFormRow>

        {/* requires input */}
        <EuiFormRow>
          <EuiFlexGroup alignItems="flexStart" gutterSize="xs" direction="row" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id="scriptRequiresInputCheckbox"
                label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.requiresInput.label}
                checked={scriptItem?.requiresInput}
                onChange={onChangeRequiresInput}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={SCRIPT_LIBRARY_LABELS.flyout.body.edit.requiresInput.tooltip}
                type="info"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {/* tags */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem label={SCRIPT_LIBRARY_LABELS.flyout.body.details.tags.label} />
          }
          labelAppend={labelAppend}
        >
          <EuiComboBox
            fullWidth
            options={SORTED_SCRIPT_TAGS_KEYS.map((tag) => ({
              label: SCRIPT_TAGS[tag],
            }))}
            selectedOptions={selectedTags}
            onChange={onChangeTags}
            isClearable={true}
          />
        </EuiFormRow>

        {/* path to executable */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.details.pathToExecutable.label}
            />
          }
          labelAppend={labelAppend}
        >
          <EuiFieldText
            defaultValue={scriptItem?.pathToExecutable}
            onChange={onChangePathToExecutable}
          />
        </EuiFormRow>

        {/* description */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.details.description.label}
            />
          }
          labelAppend={labelAppend}
          helpText={
            hasEmptyDescription
              ? SCRIPT_LIBRARY_LABELS.flyout.body.edit.description.helpText
              : undefined
          }
        >
          <EuiFieldText defaultValue={scriptItem?.description} onChange={onChangeDescription} />
        </EuiFormRow>

        {/* instructions */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.details.instructions.label}
            />
          }
          helpText={
            hasEmptyInstructions
              ? SCRIPT_LIBRARY_LABELS.flyout.body.edit.instructions.helpText
              : undefined
          }
          labelAppend={labelAppend}
        >
          <EuiTextArea
            defaultValue={scriptItem?.instructions}
            rows={5}
            onChange={onChangeInstructions}
          />
        </EuiFormRow>

        {/* examples */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.details.example.label}
            />
          }
          helpText={
            hasEmptyExample ? SCRIPT_LIBRARY_LABELS.flyout.body.edit.example.helpText : undefined
          }
          labelAppend={labelAppend}
        >
          <EuiTextArea defaultValue={scriptItem?.example} rows={5} onChange={onChangeExample} />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

EndpointScriptEditForm.displayName = 'EndpointScriptEditForm';
