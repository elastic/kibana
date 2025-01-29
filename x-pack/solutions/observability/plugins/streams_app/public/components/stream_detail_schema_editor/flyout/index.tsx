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
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { SchemaEditorEditingState } from '../hooks/use_editing_state';
import { ChildrenAffectedCallout } from './children_affected_callout';
import { SamplePreviewTable } from './sample_preview_table';
import { FieldSummary } from './field_summary';

export type SchemaEditorFlyoutProps = {
  streamsRepositoryClient: StreamsRepositoryClient;
  definition: WiredStreamGetResponse;
} & SchemaEditorEditingState;

export const SchemaEditorFlyout = (props: SchemaEditorFlyoutProps) => {
  const {
    definition,
    streamsRepositoryClient,
    selectedField,
    reset,
    nextFieldDefinition,
    isEditing,
    isSaving,
    saveChanges,
  } = props;

  return (
    <EuiFlyout onClose={() => reset()} maxWidth="500px">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>{selectedField?.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <FieldSummary {...props} />
          {isEditing && definition.stream.ingest.routing.length > 0 ? (
            <EuiFlexItem grow={false}>
              <ChildrenAffectedCallout childStreams={definition.stream.ingest.routing} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <SamplePreviewTable
              definition={definition}
              nextFieldDefinition={nextFieldDefinition}
              streamsRepositoryClient={streamsRepositoryClient}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="streamsAppSchemaEditorFlyoutCloseButton"
              iconType="cross"
              onClick={() => reset()}
              flush="left"
            >
              {i18n.translate('xpack.streams.schemaEditorFlyout.closeButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppSchemaEditorFieldSaveButton"
              isDisabled={isSaving || !saveChanges}
              onClick={() => saveChanges && saveChanges()}
            >
              {i18n.translate('xpack.streams.fieldForm.saveButtonLabel', {
                defaultMessage: 'Save changes',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
