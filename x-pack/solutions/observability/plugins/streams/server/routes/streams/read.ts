/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import {
  FieldDefinitionConfig,
  isIngestStream,
  isWiredStream,
  ReadStreamDefinition,
} from '@kbn/streams-schema';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { readAncestors, readStream } from '../../lib/streams/stream_crud';
import {
  otelFields,
  otelMappings,
  otelPrefixes,
} from '../../lib/streams/component_templates/otel_layer';
import { getSortedFields } from '../../lib/streams/helpers/field_sorting';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<ReadStreamDefinition> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });

      // TODO: I have no idea why I can just do `isIngestStream` here but when I do,
      // streamEntity becomes `streamEntity: never` in the statements afterwards
      if (!isWiredStream(streamEntity) && isIngestStream(streamEntity)) {
        return {
          ...streamEntity,
          inherited_fields: {},
        };
      }

      const { ancestors } = await readAncestors({
        id: streamEntity.name,
        scopedClusterClient,
      });

      const inheritedFields = ancestors.reduce((acc, def) => {
        getSortedFields(def.stream.ingest.wired.fields).forEach(([key, fieldDef]) => {
          acc[key] = { ...fieldDef, from: def.name };
        });
        if (def.stream.ingest.wired.otel_compat_mode) {
          getSortedFields(otelFields).forEach(([key, fieldDef]) => {
            acc[key] = { ...fieldDef, from: '<otel_compat_mode>' };
          });
        }
        return acc;
        // TODO: replace this with a proper type
      }, {} as Record<string, FieldDefinitionConfig & { from: string; alias_for?: string }>);

      if (streamEntity.stream.ingest.wired.otel_compat_mode) {
        getSortedFields(otelFields).forEach(([key, fieldDef]) => {
          inheritedFields[key] = { ...fieldDef, from: '<otel_compat_mode>' };
        });
        // calculate aliases for all fields based on their prefixes and add them to the inherited fields
        getSortedFields(inheritedFields).forEach(([key, fieldDef]) => {
          // if the field starts with one of the otel prefixes, add an alias without the prefix
          if (otelPrefixes.some((prefix) => key.startsWith(prefix))) {
            inheritedFields[key.replace(new RegExp(`^(${otelPrefixes.join('|')})`), '')] = {
              ...fieldDef,
              from: '<otel_compat_mode>',
              alias_for: key,
            };
          }
        });
        // calculate aliases for regular fields of this stream
        getSortedFields(streamEntity.stream.ingest.wired.fields).forEach(([key, fieldDef]) => {
          if (otelPrefixes.some((prefix) => key.startsWith(prefix))) {
            inheritedFields[key.replace(new RegExp(`^(${otelPrefixes.join('|')})`), '')] = {
              ...fieldDef,
              from: streamEntity.name,
              alias_for: key,
            };
          }
        });
        // add aliases defined by the otel compat mode itself
        Object.entries(otelMappings).forEach(([key, fieldDef]) => {
          if (fieldDef.type === 'alias') {
            inheritedFields[key] = {
              type: otelFields[fieldDef.path!].type,
              alias_for: fieldDef.path,
              from: '<otel_compat_mode>',
            };
          }
        });
      }

      const body = {
        ...streamEntity,
        inherited_fields: inheritedFields,
      };

      return body;
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
