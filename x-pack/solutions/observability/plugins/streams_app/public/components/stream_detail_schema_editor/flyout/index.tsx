/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { WiredStreamDefinition, WiredStreamGetResponse } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { SchemaEditorEditingState } from '../hooks/use_editing_state';
import { ChildrenAffectedCallout } from './children_affected_callout';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';
import { SchemaField } from '../types';

export interface SchemaEditorFlyoutProps {
  field: SchemaField;
  stream: WiredStreamDefinition;
  onSave: () => void;
  onCancel: () => void;
  withFieldSimulation?: boolean;
}
// export type SchemaEditorFlyoutProps = {
//   streamsRepositoryClient: StreamsRepositoryClient;
//   definition: WiredStreamGetResponse;
// } & SchemaEditorEditingState;

export const SchemaEditorFlyout = ({
  field,
  stream,
  onCancel,
  onSave,
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

  const [{ loading: isSaving }, saveChanges] = useAsyncFn(async () => {
    if (onSave) return onSave();
  }, [onSave]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{field.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <FieldSummary {...props} />
          {isEditing && stream.ingest.routing.length > 0 ? (
            <EuiFlexItem grow={false}>
              <ChildrenAffectedCallout childStreams={stream.ingest.routing} />
            </EuiFlexItem>
          ) : null}
          {withFieldSimulation && (
            <EuiFlexItem grow={false}>
              <SamplePreviewTable stream={stream} nextFieldDefinition={nextFieldDefinition} />
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
