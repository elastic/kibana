/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { useCallback, useState } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import { WiredStreamGetResponse } from '@kbn/streams-schema';

export type SchemaEditorUnpromotingState = ReturnType<typeof useUnpromotingState>;

export const useUnpromotingState = ({
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
  /* Represents the currently persisted state of the selected field. This should not be edited directly. */
  const [selectedField, setSelectedField] = useState<string | undefined>();
  /* Whether changes are being persisted */
  const [isUnpromotingField, toggleIsUnpromotingField] = useToggle(false);
  /* Holds errors from saving changes */
  const [error, setError] = useState<Error | undefined>();

  const unpromoteField = useCallback(async () => {
    if (!selectedField) {
      return;
    }
    toggleIsUnpromotingField(true);
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
                fields: omit(definition.stream.ingest.wired.fields, selectedField),
              },
            },
          },
        },
      });
      toggleIsUnpromotingField(false);
      setSelectedField(undefined);
      refreshDefinition();
      refreshUnmappedFields();
      toastsService.addSuccess(
        i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapSuccessToast', {
          defaultMessage: '{field} was successfully unmapped',
          values: { field: selectedField },
        })
      );
    } catch (e) {
      toggleIsUnpromotingField(false);
      setError(e);
      toastsService.addError(e, {
        title: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmapErrorToast', {
          defaultMessage: 'Something went wrong unmapping the {field} field',
          values: { field: selectedField },
        }),
      });
    }
  }, [
    abortController.signal,
    definition.stream.ingest,
    definition.stream.name,
    refreshDefinition,
    refreshUnmappedFields,
    selectedField,
    streamsRepositoryClient,
    toastsService,
    toggleIsUnpromotingField,
  ]);

  return { selectedField, setSelectedField, isUnpromotingField, unpromoteField, error };
};
