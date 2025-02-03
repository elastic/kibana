/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NamedFieldDefinitionConfig, WiredStreamGetResponse } from '@kbn/streams-schema';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { useCallback, useMemo, useState } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import { FieldStatus } from '../configuration_maps';

export type SchemaEditorEditingState = ReturnType<typeof useEditingState>;

export interface FieldEntry {
  name: NamedFieldDefinitionConfig['name'];
  type?: NamedFieldDefinitionConfig['type'];
  format?: NamedFieldDefinitionConfig['format'];
  parent: string;
  status: FieldStatus;
}

export type EditableFieldDefinition = FieldEntry;

export const useEditingState = ({
  streamsRepositoryClient,
  definition,
  refreshDefinition,
  refreshUnmappedFields,
  toastsService,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  definition: WiredStreamGetResponse;
  refreshDefinition: () => void;
  refreshUnmappedFields: () => void;
  toastsService: ToastsStart;
}) => {
  const abortController = useAbortController();
  /* Whether the field is being edited, otherwise it's just displayed. */
  const [isEditing, toggleIsEditing] = useToggle(false);
  /* Whether changes are being persisted */
  const [isSaving, toggleIsSaving] = useToggle(false);
  /* Holds errors from saving changes */
  const [error, setError] = useState<Error | undefined>();

  /* Represents the currently selected field. This should not be edited directly. */
  const [selectedField, setSelectedField] = useState<EditableFieldDefinition | undefined>();

  /** Dirty state */
  /* Dirty state of the field type */
  const [nextFieldType, setNextFieldType] = useState<EditableFieldDefinition['type'] | undefined>();
  /* Dirty state of the field format */
  const [nextFieldFormat, setNextFieldFormat] = useState<
    EditableFieldDefinition['format'] | undefined
  >();
  /* Full dirty definition entry that can be persisted against a stream */
  const nextFieldDefinition = useMemo(() => {
    return selectedField
      ? {
          name: selectedField.name,
          type: nextFieldType,
          ...(nextFieldFormat && nextFieldType === 'date' ? { format: nextFieldFormat } : {}),
        }
      : undefined;
  }, [nextFieldFormat, nextFieldType, selectedField]);

  const selectField = useCallback(
    (field: EditableFieldDefinition, selectAndEdit?: boolean) => {
      setSelectedField(field);
      setNextFieldType(field.type);
      setNextFieldFormat(field.format);
      toggleIsEditing(selectAndEdit !== undefined ? selectAndEdit : false);
    },
    [toggleIsEditing]
  );

  const reset = useCallback(() => {
    setSelectedField(undefined);
    setNextFieldType(undefined);
    setNextFieldFormat(undefined);
    toggleIsEditing(false);
    toggleIsSaving(false);
    setError(undefined);
  }, [toggleIsEditing, toggleIsSaving]);

  const saveChanges = useMemo(() => {
    return selectedField &&
      isFullFieldDefinition(nextFieldDefinition) &&
      hasChanges(selectedField, nextFieldDefinition)
      ? async () => {
          toggleIsSaving(true);
          try {
            await streamsRepositoryClient.fetch(`PUT /api/streams/{id}/_ingest`, {
              signal: abortController.signal,
              params: {
                path: {
                  id: definition.stream.name,
                },
                body: {
                  ingest: {
                    ...definition.stream.ingest,
                    wired: {
                      fields: {
                        ...Object.fromEntries(
                          Object.entries(definition.stream.ingest.wired.fields).filter(
                            ([name, _field]) => name !== nextFieldDefinition.name
                          )
                        ),
                        [nextFieldDefinition.name]: omit(nextFieldDefinition, 'name'),
                      },
                    },
                  },
                },
              },
            });
            toastsService.addSuccess(
              i18n.translate('xpack.streams.streamDetailSchemaEditorEditSuccessToast', {
                defaultMessage: '{field} was successfully edited',
                values: { field: nextFieldDefinition.name },
              })
            );
            reset();
            refreshDefinition();
            refreshUnmappedFields();
          } catch (e) {
            toggleIsSaving(false);
            setError(e);
            toastsService.addError(e, {
              title: i18n.translate('xpack.streams.streamDetailSchemaEditorEditErrorToast', {
                defaultMessage: 'Something went wrong editing the {field} field',
                values: { field: nextFieldDefinition.name },
              }),
            });
          }
        }
      : undefined;
  }, [
    abortController.signal,
    definition,
    nextFieldDefinition,
    refreshDefinition,
    refreshUnmappedFields,
    reset,
    selectedField,
    streamsRepositoryClient,
    toastsService,
    toggleIsSaving,
  ]);

  return {
    selectedField,
    selectField,
    isEditing,
    toggleIsEditing,
    nextFieldType,
    setNextFieldType,
    nextFieldFormat,
    setNextFieldFormat,
    isSaving,
    saveChanges,
    reset,
    error,
    nextFieldDefinition,
  };
};

export const isFullFieldDefinition = (
  value?: Partial<NamedFieldDefinitionConfig>
): value is NamedFieldDefinitionConfig => {
  return !!value && !!value.name && !!value.type;
};

const hasChanges = (
  selectedField: Partial<NamedFieldDefinitionConfig>,
  nextFieldEntry: Partial<NamedFieldDefinitionConfig>
) => {
  return (
    selectedField.type !== nextFieldEntry.type || selectedField.format !== nextFieldEntry.format
  );
};
