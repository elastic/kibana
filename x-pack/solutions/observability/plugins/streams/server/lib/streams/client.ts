/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesDataStream,
  QueryDslQueryContainer,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  Condition,
  IngestStreamDefinition,
  StreamDefinition,
  WiredStreamDefinition,
  assertsSchema,
  isIngestStream,
  isRootStream,
  isWiredStream,
  streamDefinitionSchema,
} from '@kbn/streams-schema';
import { cloneDeep, difference, keyBy, omit } from 'lodash';
import { errors } from '@elastic/elasticsearch';
import { AssetClient } from './assets/asset_client';
import { DefinitionNotFound } from './errors';
import { MalformedStreamId } from './errors/malformed_stream_id';
import { getAncestors, getParentId, isChildOf } from './helpers/hierarchy';
import {
  syncIngestStreamDefinitionObjects,
  syncWiredStreamDefinitionObjects,
} from './helpers/sync';
import { validateAncestorFields, validateDescendantFields } from './helpers/validate_fields';
import { rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import {
  checkAccess,
  checkAccessBulk,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
  getUnmanagedElasticsearchAssets,
} from './stream_crud';
import { MalformedChildren } from './errors/malformed_children';
import { validateRootStreamChanges } from './helpers/validate_stream';

interface AcknowledgeResponse<TResult extends Result> {
  acknowledged: true;
  result: TResult;
}

export type EnableStreamsResponse = AcknowledgeResponse<'noop' | 'created'>;
export type DisableStreamsResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type DeleteStreamResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type SyncStreamResponse = AcknowledgeResponse<'updated' | 'created'>;
export type ForkStreamResponse = AcknowledgeResponse<'created'>;
export type ResyncStreamsResponse = AcknowledgeResponse<'updated'>;
export type UpsertStreamResponse = AcknowledgeResponse<'updated' | 'created'>;

function getRootStreamName(type: 'logs') {
  return type;
}

function is404(error: unknown): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

export class StreamsClient {
  constructor(
    private readonly dependencies: {
      scopedClusterClient: IScopedClusterClient;
      assetClient: AssetClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
    }
  ) {}

  async isStreamsEnabled(): Promise<boolean> {
    const rootLogsStreamExists = await this.getStream('logs')
      .then((definition) => isWiredStream(definition))
      .catch((error) => {
        if (is404(error)) {
          return false;
        }
        throw error;
      });

    return rootLogsStreamExists;
  }

  async enableStreams(): Promise<EnableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();

    if (isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    await this.upsertStream({
      definition: rootStreamDefinition,
    });

    return { acknowledged: true, result: 'created' };
  }

  async disableStreams(): Promise<DisableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();
    if (!isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    const definition = await this.getRootStream('logs');

    await this.deleteStreamFromDefinition(definition);

    return { acknowledged: true, result: 'deleted' };
  }

  async resyncStreams(): Promise<ResyncStreamsResponse> {
    const streams = await this.getManagedStreams();

    for (const stream of streams) {
      await this.syncStreamObjects({
        definition: stream,
      });
    }
    return { acknowledged: true, result: 'updated' };
  }

  private async syncStreamObjects({ definition }: { definition: StreamDefinition }) {
    const { assetClient, logger, scopedClusterClient } = this.dependencies;

    if (isWiredStream(definition)) {
      const parentId = getParentId(definition.name);
      await syncWiredStreamDefinitionObjects({
        definition,
        logger,
        scopedClusterClient,
        parentDefinition: parentId
          ? ((await this.getStream(parentId)) as WiredStreamDefinition)
          : undefined,
      });
    } else if (isIngestStream(definition)) {
      await syncIngestStreamDefinitionObjects({
        definition,
        scopedClusterClient,
        logger,
        dataStream: await this.getDataStream(definition.name),
      });
    }

    await assetClient.syncAssetList({
      entityId: definition.name,
      entityType: 'stream',
      assetType: 'dashboard',
      assetIds: definition.dashboards ?? [],
    });
  }

  async upsertStream({
    definition,
  }: {
    definition: StreamDefinition;
  }): Promise<UpsertStreamResponse> {
    const { result, parentDefinition } = await this.validateAndUpsertStream({
      definition,
    });

    if (parentDefinition) {
      const isRoutingToChild = parentDefinition.stream.ingest.routing.find((item) => item.name);

      if (!isRoutingToChild) {
        // add empty condition
        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.stream.ingest.routing.concat({
            name: definition.name,
          }),
        });
      }
    }

    return { acknowledged: true, result };
  }

  private async validateAndUpsertStream({ definition }: { definition: StreamDefinition }): Promise<{
    result: 'created' | 'updated';
    definition: StreamDefinition;
    parentDefinition?: WiredStreamDefinition;
  }> {
    const existingDefinition = await this.getStream(definition.name).catch((error) => {
      if (is404(error)) {
        return undefined;
      }
      throw error;
    });

    let parentDefinition: WiredStreamDefinition | undefined;

    if (isRootStream(definition) && isRootStream(existingDefinition)) {
      validateRootStreamChanges(existingDefinition as WiredStreamDefinition, definition);
    }

    if (isWiredStream(definition)) {
      const [ancestors, descendants] = await Promise.all([
        this.getAncestors(definition.name),
        this.getDescendants(definition.name),
      ]);

      const descendantsById = keyBy(descendants, (stream) => stream.name);

      const parentId = getParentId(definition.name);

      parentDefinition = parentId
        ? ancestors.find((parent) => parent.name === parentId)
        : undefined;

      // If no existing definition exists, this is a fork via upsert,
      // and we need to validate whether the parent is a wired stream
      if (!existingDefinition && parentId && parentDefinition && !isWiredStream(parentDefinition)) {
        throw new MalformedStreamId('Cannot fork a stream that is not managed');
      }

      validateAncestorFields({
        ancestors,
        fields: definition.stream.ingest.wired.fields,
      });

      validateDescendantFields({
        descendants,
        fields: definition.stream.ingest.wired.fields,
      });

      if (existingDefinition) {
        const existingChildren = existingDefinition?.stream.ingest.routing.map(
          (child) => child.name
        );

        const nextChildren = definition.stream.ingest.routing.map((child) => child.name);

        const removedChildren = difference(existingChildren, nextChildren);

        if (removedChildren.length) {
          throw new MalformedChildren('Cannot remove children from a stream via updates');
        }
      }

      for (const child of definition.stream.ingest.routing) {
        if (descendantsById[child.name]) {
          continue;
        }
        await this.validateAndUpsertStream({
          definition: {
            name: child.name,
            stream: {
              ingest: {
                processing: [],
                routing: [],
                wired: {
                  fields: {},
                },
              },
            },
          },
        });
      }
    }

    const result = !!existingDefinition ? ('updated' as const) : ('created' as const);

    await this.syncStreamObjects({
      definition,
    });

    await this.updateStoredStream(definition);

    return {
      result,
      definition,
      parentDefinition,
    };
  }

  async forkStream({
    parent,
    name,
    condition,
  }: {
    parent: string;
    name: string;
    condition: Condition;
  }): Promise<ForkStreamResponse> {
    const parentDefinition = await this.getStream(parent);

    if (!isWiredStream(parentDefinition)) {
      throw new MalformedStreamId('Cannot fork a stream that is not managed');
    }

    const childDefinition: WiredStreamDefinition = {
      name,
      stream: { ingest: { processing: [], routing: [], wired: { fields: {} } } },
    };

    // check whether root stream has a child of the given name already
    if (
      parentDefinition.stream.ingest.routing.some((child) => child.name === childDefinition.name)
    ) {
      throw new MalformedStreamId(
        `The stream with ID (${name}) already exists as a child of the parent stream`
      );
    }
    if (!isChildOf(parentDefinition, childDefinition)) {
      throw new MalformedStreamId(
        `The ID (${name}) from the new stream must start with the parent's id (${parentDefinition.name}), followed by a dot and a name`
      );
    }

    // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready

    const { parentDefinition: updatedParentDefinition } = await this.validateAndUpsertStream({
      definition: childDefinition,
    });

    await this.updateStreamRouting({
      definition: updatedParentDefinition!,
      routing: parentDefinition.stream.ingest.routing.concat({
        name,
        condition,
      }),
    });

    return { acknowledged: true, result: 'created' };
  }

  async getStream(name: string): Promise<StreamDefinition> {
    const definition = await Promise.all([
      this.dependencies.storageClient.get({ id: name }),
      checkAccess({ id: name, scopedClusterClient: this.dependencies.scopedClusterClient }).then(
        (privileges) => {
          if (!privileges.read) {
            throw new DefinitionNotFound(`Stream definition for ${name} not found`);
          }
        }
      ),
    ])
      .then(([response]) => {
        const source = response._source;
        assertsSchema(streamDefinitionSchema, source);
        return source;
      })
      .catch(async (error) => {
        if (is404(error)) {
          const dataStream = await this.getDataStream(name);
          return await this.getDataStreamAsIngestStream(dataStream);
        }
        throw error;
      });

    return definition;
  }

  async getDataStream(name: string): Promise<IndicesDataStream> {
    return this.dependencies.scopedClusterClient.asCurrentUser.indices
      .getDataStream({ name })
      .then((response) => {
        const dataStream = response.data_streams[0];
        if (!dataStream) {
          throw new Error('Data stream not found');
        }
        return dataStream;
      });
  }

  private async getDataStreamAsIngestStream(
    dataStream: IndicesDataStream
  ): Promise<IngestStreamDefinition> {
    const definition: IngestStreamDefinition = {
      name: dataStream.name,
      stream: {
        ingest: {
          routing: [],
          processing: [],
        },
      },
    };

    definition.elasticsearch_assets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient: this.dependencies.scopedClusterClient,
    });

    return definition;
  }

  async existsStream(name: string): Promise<boolean> {
    const exists = await this.getStream(name)
      .then(() => true)
      .catch((error) => {
        if (is404(error)) {
          return false;
        }
        throw error;
      });

    return exists;
  }

  async listStreams(): Promise<StreamDefinition[]> {
    const [managedStreams, unmanagedStreams] = await Promise.all([
      this.getManagedStreams(),
      this.getUnmanagedDataStreams(),
    ]);

    const allDefinitionsById = new Map<string, StreamDefinition>(
      managedStreams.map((stream) => [stream.name, stream])
    );

    unmanagedStreams.forEach((stream) => {
      if (!allDefinitionsById.get(stream.name)) {
        allDefinitionsById.set(stream.name, stream);
      }
    });

    return Array.from(allDefinitionsById.values());
  }

  private async getUnmanagedDataStreams(): Promise<IngestStreamDefinition[]> {
    const response =
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream();

    return response.data_streams
      .filter((dataStream) => dataStream.template.endsWith('@stream') === false)
      .map((dataStream) => ({
        name: dataStream.name,
        stream: {
          ingest: {
            processing: [],
            routing: [],
          },
        },
      }));
  }

  private async getManagedStreams({ query }: { query?: QueryDslQueryContainer } = {}): Promise<
    StreamDefinition[]
  > {
    const { scopedClusterClient, storageClient } = this.dependencies;

    const streamsSearchResponse = await storageClient.search({
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      query,
    });

    const streams = streamsSearchResponse.hits.hits.flatMap((hit) => {
      const source = hit._source;
      assertsSchema(streamDefinitionSchema, source);
      return source;
    });

    const privileges = await checkAccessBulk({
      ids: streams.map((stream) => stream.name),
      scopedClusterClient,
    });

    return streams.filter((stream) => {
      return privileges[stream.name]?.read === true;
    });
  }

  private async deleteStreamFromDefinition(definition: StreamDefinition): Promise<void> {
    const { assetClient, logger, scopedClusterClient } = this.dependencies;

    if (!isWiredStream(definition)) {
      await deleteUnmanagedStreamObjects({
        scopedClusterClient,
        id: definition.name,
        logger,
        assetClient,
      });
    } else {
      const parentId = getParentId(definition.name);

      // need to update parent first to cut off documents streaming down
      if (parentId) {
        const parentDefinition = (await this.getStream(parentId)) as WiredStreamDefinition;

        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.stream.ingest.routing.filter(
            (child) => child.name !== definition.name
          ),
        });
      }

      for (const child of definition.stream.ingest.routing) {
        await this.deleteStream(child.name);
      }

      await deleteStreamObjects({ scopedClusterClient, id: definition.name, logger, assetClient });
    }

    await this.dependencies.storageClient.delete({ id: definition.name });
  }

  private async updateStreamRouting({
    definition,
    routing,
  }: {
    definition: WiredStreamDefinition;
    routing: WiredStreamDefinition['stream']['ingest']['routing'];
  }) {
    const update = cloneDeep(definition);
    update.stream.ingest.routing = routing;

    await this.updateStoredStream(update);

    await this.syncStreamObjects({
      definition: update,
    });
  }

  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const definition = await this.getStream(name).catch((error) => {
      if (is404(error)) {
        return undefined;
      }
      throw error;
    });

    if (!definition) {
      return { acknowledged: true, result: 'noop' };
    }

    const parentId = getParentId(name);
    if (isWiredStream(definition) && !parentId) {
      throw new MalformedStreamId('Cannot delete root stream');
    }

    await this.deleteStreamFromDefinition(definition);

    return { acknowledged: true, result: 'deleted' };
  }

  private async updateStoredStream(
    definition: Omit<
      StreamDefinition,
      'dashboards' | 'elasticsearch_assets' | 'inherited_fields' | 'lifecycle'
    >
  ) {
    return this.dependencies.storageClient.index({
      id: definition.name,
      document: omit(
        definition,
        'elasticsearch_assets',
        'dashboards',
        'inherited_fields',
        'lifecycle'
      ),
    });
  }

  async getRootStream(type: 'logs') {
    return this.getStream(getRootStreamName(type));
  }

  async getAncestors(name: string): Promise<WiredStreamDefinition[]> {
    const ancestorIds = getAncestors(name);

    return this.getManagedStreams({
      query: {
        bool: {
          filter: [{ terms: { name: ancestorIds } }],
        },
      },
    }).then((streams) => streams.filter(isWiredStream));
  }

  async getDescendants(name: string): Promise<WiredStreamDefinition[]> {
    return this.getManagedStreams({
      query: {
        bool: {
          filter: [
            {
              prefix: {
                name,
              },
            },
          ],
          must_not: [
            {
              term: {
                name,
              },
            },
          ],
        },
      },
    }).then((streams) => streams.filter(isWiredStream));
  }
}
