/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import {
  NamedFieldDefinitionConfig,
  WiredStreamGetResponse,
  getAdvancedParameters,
} from '@kbn/streams-schema';
import { isEqual, omit } from 'lodash';
import { useMemo, useCallback } from 'react';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { SchemaField, isSchemaFieldTyped } from '../types';
import { convertToFieldDefinitionConfig } from '../utils';
import { getFormattedError } from '../../../util/errors';

export const useSchemaFields = ({
  definition,
  refreshDefinition,
}: {
  definition: WiredStreamGetResponse;
  refreshDefinition: () => void;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const abortController = useAbortController();

  const {
    value: unmappedFieldsValue,
    loading: isLoadingUnmappedFields,
    refresh: refreshUnmappedFields,
  } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams/{name}/schema/unmapped_fields', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
        },
      });
    },
    [definition.stream.name, streamsRepositoryClient]
  );

  const fields = useMemo(() => {
    const inheritedFields: SchemaField[] = Object.entries(definition.inherited_fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: field.format,
        additionalParameters: getAdvancedParameters(name, field),
        parent: field.from,
        status: 'inherited',
      })
    );

    const mappedFields: SchemaField[] = Object.entries(definition.stream.ingest.wired.fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: field.format,
        additionalParameters: getAdvancedParameters(name, field),
        parent: definition.stream.name,
        status: 'mapped',
      })
    );

    const unmappedFields: SchemaField[] =
      unmappedFieldsValue?.unmappedFields.map((field) => ({
        name: field,
        parent: definition.stream.name,
        status: 'unmapped',
      })) ?? [];

    return [...inheritedFields, ...mappedFields, ...unmappedFields];
  }, [definition, unmappedFieldsValue]);

  const refreshFields = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
  }, [refreshDefinition, refreshUnmappedFields]);

  const updateField = useCallback(
    async (field: SchemaField) => {
      try {
        if (!isSchemaFieldTyped(field)) {
          throw new Error('The field is not complete or fully mapped.');
        }

        const nextFieldDefinitionConfig = convertToFieldDefinitionConfig(field);
        const persistedFieldDefinitionConfig = definition.stream.ingest.wired.fields[field.name];

        if (!hasChanges(persistedFieldDefinitionConfig, nextFieldDefinitionConfig)) {
          throw new Error('The field is not different, hence updating is not necessary.');
        }

        await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest`, {
          signal: abortController.signal,
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              ingest: {
                ...definition.stream.ingest,
                wired: {
                  fields: {
                    ...definition.stream.ingest.wired.fields,
                    [field.name]: nextFieldDefinitionConfig,
                  },
                },
              },
            },
          },
        });

        toasts.addSuccess(
          i18n.translate('xpack.streams.streamDetailSchemaEditorEditSuccessToast', {
            defaultMessage: '{field} was successfully edited',
            values: { field: field.name },
          })
        );

        refreshFields();
      } catch (error) {
        toasts.addError(new Error(error.body.message), {
          title: i18n.translate('xpack.streams.streamDetailSchemaEditorEditErrorToast', {
            defaultMessage: 'Something went wrong editing the {field} field',
            values: { field: field.name },
          }),
          toastMessage: getFormattedError(error).message,
          toastLifeTimeMs: 5000,
        });
      }
    },
    [abortController.signal, definition, refreshFields, streamsRepositoryClient, toasts]
  );

  const unmapField = useCallback(
    async (fieldName: SchemaField['name']) => {
      try {
        const persistedFieldDefinitionConfig = definition.stream.ingest.wired.fields[fieldName];

        if (!persistedFieldDefinitionConfig) {
          throw new Error('The field is not mapped, hence it cannot be unmapped.');
        }

        await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest`, {
          signal: abortController.signal,
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              ingest: {
                ...definition.stream.ingest,
                wired: {
                  fields: omit(definition.stream.ingest.wired.fields, fieldName),
                },
              },
            },
          },
        });

        toasts.addSuccess(
          i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapSuccessToast', {
            defaultMessage: '{field} was successfully unmapped',
            values: { field: fieldName },
          })
        );

        refreshFields();
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapErrorToast', {
            defaultMessage: 'Something went wrong unmapping the {field} field',
            values: { field: fieldName },
          }),
          toastMessage: getFormattedError(error).message,
          toastLifeTimeMs: 5000,
        });
      }
    },
    [abortController.signal, definition, refreshFields, streamsRepositoryClient, toasts]
  );

  return {
    fields,
    isLoadingUnmappedFields,
    refreshFields,
    unmapField,
    updateField,
  };
};

const hasChanges = (
  field: Partial<NamedFieldDefinitionConfig>,
  fieldUpdate: Partial<NamedFieldDefinitionConfig>
) => {
  return !isEqual(field, fieldUpdate);
};
