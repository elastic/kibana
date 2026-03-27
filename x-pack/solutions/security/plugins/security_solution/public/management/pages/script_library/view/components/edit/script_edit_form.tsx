/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiComboBox,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';

import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
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
} from '../../../../../../../common/endpoint/service/script_library/constants';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';
import { SCRIPT_LIBRARY_LABELS } from '../../../translations';
import { EndpointScriptEditItem } from './script_edit_item';
import type { EditableScriptFieldsWithFile, ScriptFlyoutScriptItem } from './types';

const LabelTooltipWithOptionalInput = memo(
  ({ input, label, tooltip }: { label?: string; input?: React.ReactNode; tooltip: string }) => {
    return (
      <EuiFlexGroup alignItems="flexStart" gutterSize="xs" direction="row" responsive={false}>
        <EuiFlexItem grow={false}>
          {input ? input : label ? <EndpointScriptEditItem label={label} /> : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltip} type="info" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

LabelTooltipWithOptionalInput.displayName = 'LabelTooltipWithOptionalInput';

const buildDraft = (item?: ScriptFlyoutScriptItem): EditableScriptFieldsWithFile => ({
  name: item?.name,
  file: item?.file,
  fileName: item?.fileName,
  fileSize: item?.fileSize,
  fileType: item?.fileType,
  platform: item?.platform,
  requiresInput: item?.requiresInput,
  tags: item?.tags,
  pathToExecutable: item?.pathToExecutable,
  description: item?.description,
  instructions: item?.instructions,
  example: item?.example,
});

const buildInitialValidationState = (scriptItem?: ScriptFlyoutScriptItem) => ({
  hasFileError: !scriptItem?.fileName || !scriptItem?.fileSize,
  hasFileTypeError: !scriptItem?.fileType,
  hasPathToExecutableError: scriptItem?.fileType === 'archive' && !scriptItem?.pathToExecutable,
  hasNameError: !scriptItem?.name,
  hasPlatformError: !scriptItem?.platform || !scriptItem?.platform.length,
  hasEmptyDescription: !scriptItem?.description || scriptItem?.description.length === 0,
  hasEmptyInstructions: !scriptItem?.instructions || scriptItem?.instructions.length === 0,
  hasEmptyExample: !scriptItem?.example || scriptItem?.example.length === 0,
});

export interface EndpointScriptEditFormProps {
  isUploading: boolean;
  error?:
    | ReturnType<typeof usePatchEndpointScript>['error']
    | ReturnType<typeof usePostEndpointScript>['error'];
  onChange: ({
    script,
    hasFormChanged,
    isValid,
  }: {
    script: EditableScriptFieldsWithFile;
    hasFormChanged: boolean;
    isValid: boolean;
  }) => void;
  scriptItem?: ScriptFlyoutScriptItem;
  'data-test-subj'?: string;
}
export const EndpointScriptEditForm = memo<EndpointScriptEditFormProps>(
  ({ isUploading, error: submitError, onChange, scriptItem, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { euiTheme } = useEuiTheme();

    const [draftScript, setDraftScript] = useState<EditableScriptFieldsWithFile>(() =>
      buildDraft(scriptItem)
    );

    const [hasFormChanged, setHasFormChanged] = useState<boolean>(false);

    // create input state trackers for validation
    const [hasFileBeenChanged, setHasFileBeenChanged] = useState<boolean>(false);
    const [hasFileTypeBeenChanged, setHasFileTypeBeenChanged] = useState<boolean>(false);
    const [hasNameBeenChanged, setHasNameBeenChanged] = useState<boolean>(false);
    const [hasPlatformBeenChanged, setHasPlatformBeenChanged] = useState<boolean>(false);

    // validation error states and help text states initialized together
    const initialValidationState = useMemo(
      () => buildInitialValidationState(scriptItem),
      [scriptItem]
    );

    const [hasFileError, toggleHasFileError] = useState<boolean>(
      initialValidationState.hasFileError
    );
    const [hasFileTypeError, toggleHasFileTypeError] = useState<boolean>(
      initialValidationState.hasFileTypeError
    );
    const [hasNameError, toggleHasNameError] = useState<boolean>(
      initialValidationState.hasNameError
    );
    const [hasPlatformError, toggleHasPlatformError] = useState<boolean>(
      initialValidationState.hasPlatformError
    );
    const [hasPathToExecutableError, toggleHasPathToExecutableError] = useState<boolean>(
      initialValidationState.hasPathToExecutableError
    );

    // show help text for optional fields
    const [hasEmptyDescription, toggleHasEmptyDescription] = useState<boolean>(
      initialValidationState.hasEmptyDescription
    );
    const [hasEmptyInstructions, toggleHasEmptyInstructions] = useState<boolean>(
      initialValidationState.hasEmptyInstructions
    );
    const [hasEmptyExample, toggleHasEmptyExample] = useState<boolean>(
      initialValidationState.hasEmptyExample
    );

    // Derive disabled state from current fileType to avoid lag
    const isPathToExecutableDisabled = useMemo(
      () => draftScript.fileType !== 'archive',
      [draftScript.fileType]
    );

    const hasValidFormData = useMemo(
      () =>
        // also check pathToExecutable is not empty when file type is archive since it's a required field in that case
        hasFormChanged &&
        !hasFileError &&
        !hasFileTypeError &&
        !hasNameError &&
        !hasPlatformError &&
        !hasPathToExecutableError,
      [
        hasFormChanged,
        hasFileError,
        hasFileTypeError,
        hasNameError,
        hasPlatformError,
        hasPathToExecutableError,
      ]
    );

    // fake file picker state for validation
    const [showFakeFilePicker, setShowFakeFilePicker] = useState<boolean>(!!scriptItem?.fileName);
    // callback used for validation when the file name is cleared to denote "existing file was removed"
    const onRemoveFileName = useCallback(() => {
      setShowFakeFilePicker(false);
      toggleHasFileError(true);
      setHasFormChanged(true);
      setHasFileBeenChanged(true);

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
            data-test-subj={getTestId('fake-file-picker')}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="download" size="l" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h5>{draftScript.fileName}</h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.removeFileButtonLabel}
                type="button"
                size="xs"
                onClick={onRemoveFileName}
                data-test-subj={getTestId('remove-file-button')}
              >
                {SCRIPT_LIBRARY_LABELS.flyout.body.edit.removeFileButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      );
    }, [fakeFilePickerStyle, getTestId, draftScript.fileName, onRemoveFileName]);

    // real file picker
    const filePickerUUID = useMemo(() => {
      return htmlIdGenerator('scriptFilePicker')();
    }, []);

    //  platforms
    const selectedPlatforms = useMemo(
      () => draftScript.platform?.sort().map((platform) => ({ label: OS_TITLES[platform] })),
      [draftScript.platform]
    );

    // types/tags
    const selectedTags = useMemo(
      () => draftScript.tags?.sort().map((tag) => ({ label: SCRIPT_TAGS[tag] })) || [],
      [draftScript.tags]
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

    const fileTypeOptions = useMemo(() => {
      const options = [
        { value: 'archive', text: SCRIPT_LIBRARY_LABELS.flyout.body.edit.fileType.archive },
        { value: 'script', text: SCRIPT_LIBRARY_LABELS.flyout.body.edit.fileType.script },
      ];

      if (isUploading) {
        options.unshift({
          value: '',
          text: SCRIPT_LIBRARY_LABELS.flyout.body.edit.fileType.placeholder,
        });
      }

      return options;
    }, [isUploading]);

    const onChangeFileType = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const _fileType = e.target.value.trim();
        toggleHasFileTypeError(!_fileType.length);
        toggleHasPathToExecutableError(_fileType === 'archive' && !draftScript.pathToExecutable);
        setHasFormChanged(true);

        setDraftScript((prev) => ({
          ...prev,
          fileType: _fileType as EndpointScript['fileType'],
          // clear path to executable if file type is changed to script/empty
          pathToExecutable: _fileType !== 'archive' ? '' : prev.pathToExecutable,
        }));
      },
      [
        draftScript.pathToExecutable,
        setDraftScript,
        toggleHasFileTypeError,
        toggleHasPathToExecutableError,
      ]
    );

    const onChangePathToExecutable = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const pathToExecutable = event.target.value.trim();
        toggleHasPathToExecutableError(
          draftScript.fileType === 'archive' && !pathToExecutable.length
        );
        setHasFormChanged(true);

        setDraftScript((prev) => ({ ...prev, pathToExecutable }));
      },
      [setDraftScript, draftScript.fileType, toggleHasPathToExecutableError]
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

    const onChangeDescription = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      if (hasFormChanged) {
        onChange({
          script: draftScript,
          hasFormChanged,
          isValid: hasValidFormData,
        });
      }
    }, [draftScript, hasFormChanged, hasValidFormData, onChange]);

    return (
      <EuiForm
        component="div"
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={getTestId('submit-error')} />
          ) : undefined
        }
        fullWidth
        isInvalid={!!submitError}
        data-test-subj={getTestId()}
      >
        {/* file picker */}
        {showFakeFilePicker ? (
          fakeFilePicker
        ) : (
          <EuiFormRow
            isInvalid={hasFileError && hasFileBeenChanged}
            error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.filePickerPrompt.validationErrorMessage}
            data-test-subj={getTestId('file-picker-row')}
          >
            <EuiFilePicker
              data-test-subj={getTestId('file-picker')}
              isInvalid={hasFileError && hasFileBeenChanged}
              id={filePickerUUID}
              initialPromptText={SCRIPT_LIBRARY_LABELS.flyout.body.edit.filePickerPrompt.label}
              onChange={onChangeFile}
              onBlur={() => !hasFileBeenChanged && setHasFileBeenChanged(true)}
            />
          </EuiFormRow>
        )}

        {/* file type selection */}
        <EuiFormRow
          isInvalid={hasFileTypeError && hasFileTypeBeenChanged}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.fileType.validationErrorMessage}
          label={
            <EndpointScriptEditItem label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.fileType.label} />
          }
          data-test-subj={getTestId('file-type-row')}
        >
          <EuiSelect
            isInvalid={hasFileTypeError && hasFileTypeBeenChanged}
            data-test-subj={getTestId('file-type-select')}
            options={fileTypeOptions}
            value={draftScript.fileType || ''}
            onChange={onChangeFileType}
            onBlur={() => !hasFileTypeBeenChanged && setHasFileTypeBeenChanged(true)}
          />
        </EuiFormRow>

        {/* path to executable */}
        <EuiFormRow
          isInvalid={hasPathToExecutableError}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.pathToExecutable.validationErrorMessage}
          label={
            <LabelTooltipWithOptionalInput
              label={SCRIPT_LIBRARY_LABELS.flyout.body.details.pathToExecutable.label}
              tooltip={SCRIPT_LIBRARY_LABELS.flyout.body.edit.pathToExecutable.tooltip}
            />
          }
          data-test-subj={getTestId('path-to-executable-row')}
          isDisabled={isPathToExecutableDisabled}
        >
          <EuiFieldText
            data-test-subj={getTestId('path-to-executable-input')}
            value={draftScript.pathToExecutable || ''}
            onChange={onChangePathToExecutable}
            isInvalid={hasPathToExecutableError}
          />
        </EuiFormRow>
        <EuiHorizontalRule margin="l" />

        {/* name */}
        <EuiFormRow
          isInvalid={hasNameError && hasNameBeenChanged}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.name.validationErrorMessage}
          label={
            <EndpointScriptEditItem label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.name.label} />
          }
          data-test-subj={getTestId('name-row')}
        >
          <EuiFieldText
            data-test-subj={getTestId('name-input')}
            isInvalid={hasNameError && hasNameBeenChanged}
            defaultValue={draftScript.name}
            onChange={onChangeName}
            onBlur={() => !hasNameBeenChanged && setHasNameBeenChanged(true)}
          />
        </EuiFormRow>

        {/* platforms */}
        <EuiFormRow
          isInvalid={hasPlatformError && hasPlatformBeenChanged}
          error={SCRIPT_LIBRARY_LABELS.flyout.body.edit.platforms.validationErrorMessage}
          label={
            <EndpointScriptEditItem
              label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.platforms.label}
            />
          }
          data-test-subj={getTestId('platforms-row')}
        >
          <EuiComboBox
            data-test-subj={getTestId('platforms-input')}
            isInvalid={hasPlatformError && hasPlatformBeenChanged}
            fullWidth
            options={SUPPORTED_HOST_OS_TYPE.toSorted().map((platform) => ({
              label: OS_TITLES[platform],
            }))}
            selectedOptions={selectedPlatforms}
            onChange={onChangePlatforms}
            onBlur={() => !hasPlatformBeenChanged && setHasPlatformBeenChanged(true)}
            isClearable={true}
          />
        </EuiFormRow>

        {/* requires input */}
        <EuiFormRow data-test-subj={getTestId('requires-input-row')}>
          <LabelTooltipWithOptionalInput
            input={
              <EuiCheckbox
                id="scriptRequiresInputCheckbox"
                label={SCRIPT_LIBRARY_LABELS.flyout.body.edit.requiresInput.label}
                checked={draftScript.requiresInput}
                onChange={onChangeRequiresInput}
              />
            }
            tooltip={SCRIPT_LIBRARY_LABELS.flyout.body.edit.requiresInput.tooltip}
          />
        </EuiFormRow>

        {/* tags */}
        <EuiFormRow
          label={
            <EndpointScriptEditItem label={SCRIPT_LIBRARY_LABELS.flyout.body.details.tags.label} />
          }
          labelAppend={labelAppend}
          data-test-subj={getTestId('tags-row')}
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
          data-test-subj={getTestId('description-row')}
        >
          <EuiTextArea
            defaultValue={draftScript.description}
            rows={3}
            onChange={onChangeDescription}
            data-test-subj={getTestId('description-input')}
          />
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
          data-test-subj={getTestId('instructions-row')}
        >
          <EuiTextArea
            defaultValue={draftScript.instructions}
            rows={5}
            onChange={onChangeInstructions}
            data-test-subj={getTestId('instructions-input')}
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
          data-test-subj={getTestId('example-row')}
        >
          <EuiTextArea
            defaultValue={draftScript.example}
            rows={5}
            onChange={onChangeExample}
            data-test-subj={getTestId('example-input')}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

EndpointScriptEditForm.displayName = 'EndpointScriptEditForm';
