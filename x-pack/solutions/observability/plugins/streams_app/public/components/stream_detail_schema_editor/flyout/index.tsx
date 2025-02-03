/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import React, { useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { WiredStreamDefinition } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import { MappedSchemaField, SchemaField } from '../types';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  isEditingByDefault?: boolean;
  onCancel: () => void;
  onSave: (field: SchemaField) => void;
  stream: WiredStreamDefinition;
  withFieldSimulation?: boolean;
}

export const SchemaEditorFlyout = ({
  field,
  stream,
  onCancel,
  onSave,
  isEditingByDefault = false,
  withFieldSimulation = false,
}: SchemaEditorFlyoutProps) => {
  // const {
  //   definition,
  //   streamsRepositoryClient,
  //   selectedField,
  //   reset,
  //   nextFieldDefinition,
  //   isEditing,
  // } = props;

  const [nextField, setNextField] = useReducer(
    (prev: SchemaField, updated: Partial<SchemaField>): SchemaField => ({
      ...prev,
      ...updated,
    }),
    field
  );

  const [{ loading: isSaving }, saveChanges] = useAsyncFn(async () => {
    if (onSave) return onSave(nextField);
  }, [nextField, onSave]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{field.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <FieldSummary
            isEditingByDefault={isEditingByDefault}
            field={nextField}
            onChange={setNextField}
          />
          {withFieldSimulation && (
            <EuiFlexItem grow={false}>
              <SamplePreviewTable stream={stream} nextField={nextField} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppSchemaEditorFlyoutCloseButton"
            iconType="cross"
            onClick={onCancel}
            flush="left"
          >
            {i18n.translate('xpack.streams.schemaEditorFlyout.closeButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppSchemaEditorFieldSaveButton"
            isDisabled={!onSave || isSaving}
            onClick={saveChanges}
          >
            {i18n.translate('xpack.streams.fieldForm.saveButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
