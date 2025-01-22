/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
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
  getAncestors,
  getParentId,
  isChildOf,
  isDescendantOf,
  isIngestStream,
  isRootStream,
  isWiredStream,
  streamDefinitionSchema,
} from '@kbn/streams-schema';
import { cloneDeep, keyBy, omit, orderBy } from 'lodash';
import { isDSNS, parseStreamName } from '@kbn/streams-schema/src/helpers/stream_name';
import { AssetClient } from './assets/asset_client';
import { DefinitionNotFound, SecurityException } from './errors';
import { MalformedStreamId } from './errors/malformed_stream_id';
import {
  syncIngestStreamDefinitionObjects,
  syncWiredStreamDefinitionObjects,
} from './helpers/sync';
import { validateAncestorFields, validateDescendantFields } from './helpers/validate_fields';
import {
  validateAncestorChain,
  validateRootStreamChanges,
  validateStreamChildrenChanges,
  validateStreamTypeChanges,
  validateUnwiredStreamChildren,
} from './helpers/validate_stream';
import { rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import {
  checkAccess,
  checkAccessBulk,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
  getUnmanagedElasticsearchAssets,
} from './stream_crud';
import { MalformedStream } from './errors/malformed_stream';

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

const LOGS_ROOT_STREAM_NAME = 'logs';

function isElasticsearch404(error: unknown): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

function isDefinitionNotFoundError(error: unknown): error is DefinitionNotFound {
  return error instanceof DefinitionNotFound;
}

export class StreamsClient {
  constructor(
    private readonly dependencies: {
      scopedClusterClient: IScopedClusterClient;
      assetClient: AssetClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
      isServerless: boolean;
    }
  ) {}

  /**
   * Streams is considered enabled when:
   * - the logs root stream exists
   * - it is a wired stream (as opposed to an ingest stream)
   */
  async isStreamsEnabled(): Promise<boolean> {
    const rootLogsStreamExists = await this.getStream(LOGS_ROOT_STREAM_NAME)
      .then((definition) => isWiredStream(definition))
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return rootLogsStreamExists;
  }

  /**
   * Enabling streams means creating the logs root stream.
   * If it is already enabled, it is a noop.
   */
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

  /**
   * Disabling streams means deleting the logs root stream
   * AND its descendants, including any Elasticsearch objects,
   * such as data streams. That means it deletes all data
   * belonging to wired streams.
   *
   * It does NOT delete ingest streams.
   */
  async disableStreams(): Promise<DisableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();
    if (!isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    const definition = await this.getStream(LOGS_ROOT_STREAM_NAME);

    await this.deleteStreamFromDefinition(definition);

    const unwiredStreams = (await this.getStreamDefinitions()).filter(
      (stream) => !isWiredStream(stream)
    );
    await Promise.all(unwiredStreams.map((stream) => this.ejectUnwiredStream(stream)));

    return { acknowledged: true, result: 'deleted' };
  }

  /**
   * Resyncing streams means re-installing all Elasticsearch
   * objects (index and component templates, pipelines, and
   * assets), using the stream definitions as the source of
   * truth.
   *
   * Streams are re-synced in a specific order:
   * the leaf nodes are synced first, then its parents, etc.
   * Thiis prevents us from routing to data streams that do
   * not exist yet.
   */
  async resyncStreams(): Promise<ResyncStreamsResponse> {
    const streams = await this.getStreamDefinitions();

    const streamsWithDepth = streams.map((stream) => ({
      stream,
      depth: stream.name.match(/\./g)?.length ?? 0,
    }));

    const streamsInOrder = orderBy(streamsWithDepth, 'depth', 'desc');

    for (const { stream } of streamsInOrder) {
      await this.syncStreamObjects({
        definition: stream,
      });
    }
    return { acknowledged: true, result: 'updated' };
  }

  private async syncStreamObjects({ definition }: { definition: StreamDefinition }) {
    const { assetClient, logger, scopedClusterClient } = this.dependencies;

    if (isWiredStream(definition)) {
      await syncWiredStreamDefinitionObjects({
        definition,
        logger,
        scopedClusterClient,
        unwiredRoot: await this.getUnwiredRootForStream(definition),
        isServerless: this.dependencies.isServerless,
      });
    } else if (isIngestStream(definition)) {
      const dataStream = await this.getDataStream(definition.name);
      if (!dataStream) {
        throw new MalformedStream(`Data stream ${definition.name} could not be found`);
      }
      await syncIngestStreamDefinitionObjects({
        definition,
        scopedClusterClient,
        logger,
        dataStream,
      });
    }

    await assetClient.syncAssetList({
      entityId: definition.name,
      entityType: 'stream',
      assetType: 'dashboard',
      assetIds: definition.dashboards ?? [],
    });
  }

  /**
   * Creates or updates a stream. The routing of the parent is
   * also updated (including syncing to Elasticsearch).
   */
  async upsertStream({
    definition,
  }: {
    definition: StreamDefinition;
  }): Promise<UpsertStreamResponse> {
    const { result, parentDefinition } = await this.validateAndUpsertStream({
      definition,
    });

    if (parentDefinition) {
      const isRoutingToChild = parentDefinition.stream.ingest.routing.find(
        (item) => item.name === definition.name
      );

      if (!isRoutingToChild) {
        // If the parent is not routing to the child, we need to update the parent
        // to include the child in the routing with an empty condition, which means that no data is routed.
        // The user can set the condition later on the parent
        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.stream.ingest.routing.concat({
            name: definition.name,
          }),
        });
      }
    } else if (isWiredStream(definition)) {
      // if there is no parent, this is either the root stream, or
      // there are intermediate streams missing in the tree.
      // In the latter case, we need to create the intermediate streams first.
      const parentId = getParentId(definition.name);
      if (parentId) {
        await this.upsertStream({
          definition: {
            name: parentId,
            stream: {
              ingest: {
                processing: [],
                routing: [
                  {
                    name: definition.name,
                  },
                ],
                wired: {
                  fields: {},
                },
              },
            },
          },
        });
      }
    }

    return { acknowledged: true, result };
  }

  /**
   * `validateAndUpsertStream` does the following things:
   * - determining whether the given definition is valid
   * - creating empty streams for non-existing children
   * - synchronizes the Elasticsearch objects
   * - updating the stored stream definition document
   */
  private async validateAndUpsertStream({ definition }: { definition: StreamDefinition }): Promise<{
    result: 'created' | 'updated';
    parentDefinition?: StreamDefinition;
  }> {
    const existingDefinition = await this.getStream(definition.name).catch((error) => {
      if (isDefinitionNotFoundError(error)) {
        return undefined;
      }
      throw error;
    });

    // we need to return this to allow consumers to update the routing of the parent
    let parentDefinition: StreamDefinition | undefined;

    if (existingDefinition) {
      // Only allow wired-to-wired and ingest-to-ingest updates
      validateStreamTypeChanges(existingDefinition, definition);
    }

    if (isRootStream(definition)) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(
        (existingDefinition as undefined | WiredStreamDefinition) || rootStreamDefinition,
        definition
      );
    }

    if (!isWiredStream(definition)) {
      validateUnwiredStreamChildren(definition);
    }

    if (isWiredStream(definition)) {
      const validateWiredStreamResult = await this.validateWiredStream({
        existingDefinition: existingDefinition as WiredStreamDefinition,
        definition,
      });

      parentDefinition = validateWiredStreamResult.parentDefinition;
    }

    await this.createChildrenIfNeeded(definition);

    const result = !!existingDefinition ? ('updated' as const) : ('created' as const);

    await this.syncStreamObjects({
      definition,
    });

    await this.updateStoredStream(definition);

    return {
      result,
      parentDefinition,
    };
  }

  /**
   * Validates whether:
   * - there are no conflicting field types,
   * - the parent is not an ingest stream
   *
   * It also creates children that do not exist.
   */
  private async validateWiredStream({
    existingDefinition,
    definition,
  }: {
    existingDefinition?: WiredStreamDefinition;
    definition: WiredStreamDefinition;
  }): Promise<{ parentDefinition?: StreamDefinition }> {
    const [ancestors, descendants] = await Promise.all([
      this.getAncestors(definition),
      this.getDescendants(definition),
    ]);

    const parentId = getParentId(definition.name);

    const parentDefinition = parentId
      ? ancestors.find((parent) => parent.name === parentId)
      : undefined;

    validateAncestorChain(ancestors, definition);

    validateAncestorFields({
      ancestors,
      fields: definition.stream.ingest.wired.fields,
    });

    validateDescendantFields({
      descendants,
      fields: definition.stream.ingest.wired.fields,
    });

    if (existingDefinition) {
      validateStreamChildrenChanges(existingDefinition, definition);
    }

    return { parentDefinition };
  }

  /**
   * Validates whether:
   * - there are no conflicting field types,
   * - the parent is not an ingest stream
   *
   * It also creates children that do not exist.
   */
  private async createChildrenIfNeeded(definition: StreamDefinition) {
    const descendants = await this.getDescendants(definition);

    const descendantsById = keyBy(descendants, (stream) => stream.name);

    for (const child of definition.stream.ingest.routing) {
      if (descendantsById[child.name]) {
        continue;
      }
      if (!isChildOf(definition.name, child.name)) {
        throw new MalformedStreamId(
          `The ID (${child.name}) from the child stream must start with the parent's id (${definition.name}), followed by a dot and a name`
        );
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

  /**
   * Forks a stream into a child with a specific condition.
   * It mostly defers to `upsertStream` for its validations,
   * except for two things:
   * - it makes sure the name is valid for a child of the
   * forked stream
   * - the child does not already exist
   *
   * Additionally, it adds the specified condition to the
   * forked stream (which cannot happen via a PUT of the
   * child stream).
   */
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
    if (!isWiredStream(parentDefinition) && !isDSNS(parentDefinition.name)) {
      throw new MalformedStreamId('Only streams following the DSNS can be forked');
    }
    if (!isChildOf(parentDefinition.name, childDefinition.name)) {
      throw new MalformedStreamId(
        `The ID (${name}) from the new stream must start with the parent's id (${parentDefinition.name}), followed by a dot and a name`
      );
    }

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

  /**
   * Returns a stream definition for the given name:
   * - if a wired stream definition exists
   * - if an ingest stream definition exists
   * - if a data stream exists (creates an ingest
   * definition on the fly)
   *
   * Throws when:
   * - no definition is found
   * - the user does not have access to the stream
   */
  async getStream(name: string): Promise<StreamDefinition> {
    const definition = await Promise.all([
      this.dependencies.storageClient.get({ id: name }).then((response) => {
        const source = response._source;
        assertsSchema(streamDefinitionSchema, source);
        return source;
      }),
      checkAccess({ id: name, scopedClusterClient: this.dependencies.scopedClusterClient }).then(
        (privileges) => {
          if (!privileges.read) {
            throw new DefinitionNotFound(`Stream definition for ${name} not found`);
          }
        }
      ),
    ])
      .then(([wiredDefinition]) => {
        return wiredDefinition;
      })
      .catch(async (error) => {
        if (isElasticsearch404(error)) {
          const dataStream = await this.getDataStream(name);
          if (!dataStream) {
            throw new DefinitionNotFound(`Cannot find stream ${name}`);
          }
          return await this.getDataStreamAsIngestStream(dataStream);
        }
        throw error;
      })
      .catch(async (error) => {
        if (isElasticsearch404(error)) {
          throw new DefinitionNotFound(`Cannot find stream ${name}`);
        }
        throw error;
      });

    return definition;
  }

  async getDataStream(name: string): Promise<IndicesDataStream | undefined> {
    return this.dependencies.scopedClusterClient.asCurrentUser.indices
      .getDataStream({ name })
      .then((response) => {
        const dataStream = response.data_streams[0];
        return dataStream;
      });
  }

  /**
   * Creates an on-the-fly ingest stream definition
   * from a concrete data stream.
   */
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

  /**
   * Checks whether the stream exists (and whether the
   * user has access to it).
   */
  async existsStream(name: string): Promise<boolean> {
    const exists = await this.getStream(name)
      .then(() => true)
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return exists;
  }

  /**
   * Lists both managed and unmanaged streams
   */
  async listStreams(): Promise<StreamDefinition[]> {
    const [managedStreams, unmanagedStreams] = await Promise.all([
      this.getStreamDefinitions(),
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

  /**
   * Lists all unmanaged streams (ingest streams without a
   * stored definition).
   */
  private async getUnmanagedDataStreams(): Promise<IngestStreamDefinition[]> {
    const response =
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream();

    return response.data_streams.map((dataStream) => ({
      name: dataStream.name,
      stream: {
        ingest: {
          processing: [],
          routing: [],
        },
      },
    }));
  }

  /**
   * Lists managed streams, and verifies access to it.
   */
  private async getStreamDefinitions({ query }: { query?: QueryDslQueryContainer } = {}): Promise<
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

  /**
   * Eject an unwired stream from streams management:
   * * Delete the stream definition, but not the data
   * * Delete all wired children completely
   */
  private async ejectUnwiredStream(definition: IngestStreamDefinition) {
    for (const child of definition.stream.ingest.routing) {
      await this.deleteStream(child.name);
    }
    await this.deleteInternalStreamData(definition.name);
  }

  /**
   * Delete stream from definition. This has no access check,
   * which needs to happen in the consumer. This is to allow
   * us to delete the root stream internally.
   */
  private async deleteStreamFromDefinition(definition: StreamDefinition): Promise<void> {
    const { logger, scopedClusterClient } = this.dependencies;

    if (isWiredStream(definition)) {
      await this.removeFromParent(definition);
    }

    // delete the children first, as this will update
    // the parent as well
    for (const child of definition.stream.ingest.routing) {
      await this.deleteStream(child.name);
    }

    if (isWiredStream(definition)) {
      await deleteStreamObjects({ scopedClusterClient, id: definition.name, logger });
    } else {
      await deleteUnmanagedStreamObjects({
        scopedClusterClient,
        id: definition.name,
        logger,
      });
    }

    await this.deleteInternalStreamData(definition.name);
  }

  private async removeFromParent(definition: WiredStreamDefinition) {
    const parentId = getParentId(definition.name);

    if (parentId) {
      const parentDefinition = await this.getStream(parentId);

      await this.updateStreamRouting({
        definition: parentDefinition,
        routing: parentDefinition.stream.ingest.routing.filter(
          (child) => child.name !== definition.name
        ),
      });
    }
  }

  private async deleteInternalStreamData(name: string) {
    const { assetClient } = this.dependencies;
    await assetClient.syncAssetList({
      entityId: name,
      entityType: 'stream',
      assetType: 'dashboard',
      assetIds: [],
    });

    await this.dependencies.storageClient.delete({ id: name });
  }

  /**
   * Updates the routing of the stream, and synchronizes
   * the Elasticsearch objects. This allows us to update
   * only the routing of a parent, without triggering
   * a cascade of updates due to how `upsertStream` works.
   */
  private async updateStreamRouting({
    definition,
    routing,
  }: {
    definition: StreamDefinition;
    routing: StreamDefinition['stream']['ingest']['routing'];
  }) {
    const update = cloneDeep(definition);
    update.stream.ingest.routing = routing;

    await this.updateStoredStream(update);

    await this.syncStreamObjects({
      definition: update,
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const [definition, access] = await Promise.all([
      this.getStream(name).catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }),
      checkAccess({ id: name, scopedClusterClient: this.dependencies.scopedClusterClient }),
    ]);

    if (!access.write) {
      throw new SecurityException(`Cannot delete stream, insufficient privileges`);
    }

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

  /**
   * Returns the unwired root stream for a wired stream.
   *
   * For a stream wired to logs, this returns undefined.
   * For a stream wired to an unwired classic stream, this returns the classic stream.
   *
   * This is done by fetching all classic stream definitions that start with the first dot part of the dataset
   * and looking for the longest match (in terms of numbers of dots in the dataset).
   */
  async getUnwiredRootForStream(
    definition: WiredStreamDefinition
  ): Promise<StreamDefinition | undefined> {
    let classicRoot: StreamDefinition | undefined;
    let classicRootSegmentLength = 0;
    const streamName = parseStreamName(definition.name);
    if (streamName.type === 'dsns') {
      const streams = await this.getStreamDefinitions({
        query: {
          bool: {
            filter: [
              {
                prefix: {
                  name: `${streamName.datastreamType}-${streamName.datasetSegments[0]}`,
                },
              },
            ],
          },
        },
      });

      streams
        .filter((candidateStream) => !isWiredStream(candidateStream))
        .forEach((candidateStream) => {
          const candidateStreamName = parseStreamName(candidateStream.name);
          // The longest unwired stream with a matching prefix is the classic root
          if (
            candidateStreamName.type === 'dsns' &&
            candidateStreamName.datasetSegments.every(
              (segment, index) => segment === streamName.datasetSegments[index]
            ) &&
            candidateStreamName.datastreamType === streamName.datastreamType &&
            candidateStreamName.datastreamNamespace === streamName.datastreamNamespace &&
            candidateStreamName.datasetSegments.length > classicRootSegmentLength
          ) {
            classicRoot = candidateStream;
            classicRootSegmentLength = candidateStreamName.datasetSegments.length;
          }
        });
    }
    return classicRoot;
  }

  async getAncestors(definition: StreamDefinition): Promise<StreamDefinition[]> {
    let unwiredRoot = isWiredStream(definition)
      ? await this.getUnwiredRootForStream(definition)
      : undefined;

    const ancestorIds = getAncestors(definition.name, unwiredRoot?.name);

    const ancestors = await this.getStreamDefinitions({
      query: {
        bool: {
          filter: [{ terms: { name: ancestorIds } }],
        },
      },
    });
    const streamName = parseStreamName(definition.name);
    if (isWiredStream(definition) && streamName.type === 'dsns' && ancestors.length === 0) {
      // We have a DSNS stream, which means it is not connected to the root logs stream, but no ancestors.
      // This can happen if the classic stream for the unwired root hasn't been created yet.
      // In this case, we need to fetch unmanaged streams and check for a match there.
      const unmanagedStreams = await this.getUnmanagedDataStreams();
      unwiredRoot = unmanagedStreams.find((candidateStream) => {
        const candidateStreamName = parseStreamName(candidateStream.name);
        return (
          candidateStreamName.type === 'dsns' &&
          candidateStreamName.datastreamType === streamName.datastreamType &&
          candidateStreamName.datastreamNamespace === streamName.datastreamNamespace &&
          candidateStreamName.datasetSegments.every(
            (segment, index) => segment === streamName.datasetSegments[index]
          )
        );
      });

      if (unwiredRoot) {
        ancestors.push(unwiredRoot);
      }
    }
    return ancestors;
  }

  async getDescendants(definition: StreamDefinition): Promise<WiredStreamDefinition[]> {
    const streamName = parseStreamName(definition.name);
    const prefix =
      streamName.type === 'dsns'
        ? `${streamName.datastreamType}-${streamName.datastreamDataset}`
        : definition.name;
    return this.getStreamDefinitions({
      query: {
        bool: {
          filter: [
            {
              prefix: {
                name: prefix,
              },
            },
          ],
          must_not: [
            {
              term: {
                name: definition.name,
              },
            },
          ],
        },
      },
    }).then((streams) =>
      streams.filter(isWiredStream).filter((stream) => isDescendantOf(definition.name, stream.name))
    );
  }
}
