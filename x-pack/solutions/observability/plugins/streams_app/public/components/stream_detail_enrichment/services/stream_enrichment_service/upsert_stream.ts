/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import { FieldDefinition, IngestUpsertRequest } from '@kbn/streams-schema';
import { ErrorActorEvent, fromPromise } from 'xstate5';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { errors as esErrors } from '@elastic/elasticsearch';
import { StreamEnrichmentContext, StreamEnrichmentServiceDependencies } from './types';
import { processorConverter } from '../../utils';

type UpsertStreamResponse = APIReturnType<'PUT /api/streams/{name}/_ingest'>;

interface UpsertStreamInput extends Pick<StreamEnrichmentContext, 'definition' | 'processors'> {
  fields?: FieldDefinition;
}

export const upsertStreamStub = getPlaceholderFor(createUpsertStreamActor);

export function createUpsertStreamActor({
  streamsRepositoryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<UpsertStreamResponse, UpsertStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest`, {
      signal,
      params: {
        path: {
          name: input.definition.stream.name,
        },
        body: {
          ingest: {
            ...input.definition.stream.ingest,
            processing: input.processors.map(processorConverter.toAPIDefinition),
            ...(input.fields && { wired: { fields: input.fields } }),
          },
        } as IngestUpsertRequest,
      },
    });
  });
}

export const createUpsertStreamSuccessNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  () => {
    toasts.addSuccess(
      i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.saveChangesSuccess', {
        defaultMessage: "Stream's processors updated",
      })
    );
  };

export const createUpsertStreamFailureNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  ({ event }: { event: ErrorActorEvent<esErrors.ResponseError, 'upsertStream'> }) => {
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
        { defaultMessage: "An issue occurred saving processors' changes." }
      ),
      toastMessage: event.error.body.message,
    });
  };
