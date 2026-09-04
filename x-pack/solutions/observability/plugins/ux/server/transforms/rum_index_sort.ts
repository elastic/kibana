/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  RUM_OTEL_CUSTOM_COMPONENTS,
  RUM_OTEL_CUSTOM_PURPOSE,
  RUM_OTEL_DATA_STREAM_PATTERN,
  RUM_OTEL_INDEX_SORT_FIELD,
  RUM_OTEL_INDEX_SORT_ORDER,
  RUM_OTEL_SESSION_ID_KEYWORD,
  RUM_REPLAY_DATA_STREAM_PREFIX,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_INDEX_SORT_FIELD,
  RUM_SESSIONS_INDEX_SORT_ORDER,
  RUM_SESSIONS_MANAGED_BY,
  RUM_SESSIONS_TRANSFORM_ID,
} from '../../common/rum_sessions';
import { isEsNotFound } from './rum_transform_utils';

type SettingsMap = Record<string, unknown>;

export const asStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
};

const unwrapSettings = (root: SettingsMap): SettingsMap => {
  if (root.settings && typeof root.settings === 'object' && !Array.isArray(root.settings)) {
    return unwrapSettings(root.settings as SettingsMap);
  }
  const keys = Object.keys(root);
  if (keys.length === 1) {
    const inner = root[keys[0]];
    if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'settings' in inner) {
      return unwrapSettings(inner as SettingsMap);
    }
  }
  return root;
};

export const parseIndexSort = (settings: unknown): { field: string[]; order: string[] } => {
  if (settings == null || typeof settings !== 'object' || Array.isArray(settings)) {
    return { field: [], order: [] };
  }
  const unwrapped = unwrapSettings(settings as SettingsMap);
  const flatField = unwrapped['index.sort.field'];
  const flatOrder = unwrapped['index.sort.order'];
  if (flatField != null || flatOrder != null) {
    return { field: asStringList(flatField), order: asStringList(flatOrder) };
  }
  const index = unwrapped.index;
  if (index && typeof index === 'object' && !Array.isArray(index)) {
    const sort = (index as SettingsMap).sort;
    if (sort && typeof sort === 'object' && !Array.isArray(sort)) {
      const sortMap = sort as SettingsMap;
      return { field: asStringList(sortMap.field), order: asStringList(sortMap.order) };
    }
  }
  return { field: [], order: [] };
};

export const matchesIndexSort = (
  settings: unknown,
  field: readonly string[],
  order: readonly string[]
): boolean => {
  const actual = parseIndexSort(settings);
  return (
    actual.field.length === field.length &&
    actual.order.length === order.length &&
    actual.field.every((value, index) => value === field[index]) &&
    actual.order.every((value, index) => value === order[index])
  );
};

export const isReplayOtelStream = (name: string): boolean =>
  name.startsWith(RUM_REPLAY_DATA_STREAM_PREFIX);

export const writeIndexName = (dataStream: {
  indices?: Array<{ index_name?: string }>;
}): string | undefined => {
  const indices = dataStream.indices ?? [];
  return indices[indices.length - 1]?.index_name;
};

export const composedAttributesFromSimulate = (sim: unknown): SettingsMap | undefined => {
  const attrs = (
    sim as {
      template?: {
        mappings?: {
          properties?: {
            resource?: { properties?: { attributes?: unknown } };
          };
        };
      };
    }
  ).template?.mappings?.properties?.resource?.properties?.attributes;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    return attrs as SettingsMap;
  }
  return undefined;
};

export const hasOtelSessionIdMapping = (mappings: unknown): boolean => {
  const props = (
    mappings as {
      properties?: {
        resource?: {
          properties?: { attributes?: { properties?: SettingsMap } };
        };
      };
    }
  )?.properties?.resource?.properties?.attributes?.properties;
  return props != null && props['session.id'] != null;
};

export const withSessionIdAttributes = (attributes: SettingsMap): SettingsMap => {
  const properties = {
    ...((attributes.properties as SettingsMap | undefined) ?? {}),
  };
  if (properties['session.id'] == null) {
    properties['session.id'] = { ...RUM_OTEL_SESSION_ID_KEYWORD };
  }
  return { ...attributes, properties };
};

export const mergeOtelCustomMappings = ({
  existing,
  attributes,
}: {
  existing?: SettingsMap;
  attributes: SettingsMap;
}): SettingsMap => {
  const existingProps = (existing?.properties as SettingsMap | undefined) ?? {};
  const existingResource = (existingProps.resource as SettingsMap | undefined) ?? {};
  const existingResourceProps = (existingResource.properties as SettingsMap | undefined) ?? {};
  return {
    ...existing,
    properties: {
      ...existingProps,
      resource: {
        ...existingResource,
        properties: {
          ...existingResourceProps,
          attributes: withSessionIdAttributes(attributes),
        },
      },
    },
  };
};

export const mergeSortSettings = (
  existing: SettingsMap | undefined,
  field: readonly string[],
  order: readonly string[]
): SettingsMap => {
  const settings = { ...(existing ?? {}) };
  delete settings['index.sort.field'];
  delete settings['index.sort.order'];
  const index =
    settings.index && typeof settings.index === 'object' && !Array.isArray(settings.index)
      ? { ...(settings.index as SettingsMap) }
      : {};
  delete index.sort;
  delete index['sort.field'];
  delete index['sort.order'];
  index.sort = { field: [...field], order: [...order] };
  settings.index = index;
  return settings;
};

const sortErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const ensureSessionsDestSorted = async ({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
}): Promise<{ destRecreated: boolean }> => {
  const exists = await client.indices.exists({ index: RUM_SESSIONS_INDEX });
  if (!exists) {
    await client.indices.create({ index: RUM_SESSIONS_INDEX });
    return { destRecreated: false };
  }
  const settings = await client.indices.getSettings({
    index: RUM_SESSIONS_INDEX,
    flat_settings: true,
  });
  if (matchesIndexSort(settings, RUM_SESSIONS_INDEX_SORT_FIELD, RUM_SESSIONS_INDEX_SORT_ORDER)) {
    return { destRecreated: false };
  }
  logger?.info(
    `Recreating ${RUM_SESSIONS_INDEX} to apply index sort ${RUM_SESSIONS_INDEX_SORT_FIELD.join(
      ','
    )}`
  );
  try {
    await client.transform.stopTransform({
      transform_id: RUM_SESSIONS_TRANSFORM_ID,
      force: true,
      wait_for_completion: true,
    });
  } catch {
    // missing or already stopped
  }
  await client.indices.delete({ index: RUM_SESSIONS_INDEX });
  await client.indices.create({ index: RUM_SESSIONS_INDEX });
  return { destRecreated: true };
};

export const resetSessionsTransformAfterDestRecreate = async ({
  client,
  logger,
  destRecreated,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  destRecreated: boolean;
}): Promise<void> => {
  if (!destRecreated) {
    return;
  }
  logger?.info(`Resetting ${RUM_SESSIONS_TRANSFORM_ID} after dest recreate`);
  try {
    await client.transform.resetTransform({ transform_id: RUM_SESSIONS_TRANSFORM_ID });
  } catch (error) {
    if (!isEsNotFound(error)) {
      throw error;
    }
  }
};

const getExistingCustom = async (
  client: ElasticsearchClient,
  name: string
): Promise<
  | {
      settings?: SettingsMap;
      mappings?: SettingsMap;
      meta?: SettingsMap;
    }
  | undefined
> => {
  try {
    const current = await client.cluster.getComponentTemplate({ name });
    const component = current.component_templates[0]?.component_template;
    return {
      settings: component?.template?.settings as SettingsMap | undefined,
      mappings: component?.template?.mappings as SettingsMap | undefined,
      meta: component?._meta as SettingsMap | undefined,
    };
  } catch (error) {
    if (isEsNotFound(error)) {
      return undefined;
    }
    throw error;
  }
};

interface OtelDataStream {
  name: string;
  indices?: Array<{ index_name?: string }>;
}

export const otelSourceStreams = <T extends { name: string }>(streams: T[]): T[] =>
  streams.filter((stream) => !isReplayOtelStream(stream.name));

const listOtelDataStreams = async (client: ElasticsearchClient): Promise<OtelDataStream[]> => {
  try {
    const response = await client.indices.getDataStream({
      name: RUM_OTEL_DATA_STREAM_PATTERN,
      expand_wildcards: 'all',
    });
    return response.data_streams ?? [];
  } catch (error) {
    if (isEsNotFound(error)) {
      return [];
    }
    throw error;
  }
};

const putOtelCustomTemplate = async ({
  client,
  logger,
  name,
  simulateIndex,
  includeMappings,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  name: string;
  simulateIndex: string;
  includeMappings: boolean;
}): Promise<void> => {
  const existing = await getExistingCustom(client, name);
  const sortReady = matchesIndexSort(
    existing?.settings,
    RUM_OTEL_INDEX_SORT_FIELD,
    RUM_OTEL_INDEX_SORT_ORDER
  );
  if (sortReady && (!includeMappings || hasOtelSessionIdMapping(existing?.mappings))) {
    return;
  }
  const settings = mergeSortSettings(
    existing?.settings,
    RUM_OTEL_INDEX_SORT_FIELD,
    RUM_OTEL_INDEX_SORT_ORDER
  );
  const meta = {
    ...existing?.meta,
    managed_by: RUM_SESSIONS_MANAGED_BY,
    purpose: RUM_OTEL_CUSTOM_PURPOSE,
  };
  let mappings = existing?.mappings;
  if (includeMappings) {
    try {
      const simulated = await client.indices.simulateIndexTemplate({ name: simulateIndex });
      const attributes = composedAttributesFromSimulate(simulated);
      if (attributes) {
        mappings = mergeOtelCustomMappings({ existing: existing?.mappings, attributes });
      }
    } catch (error) {
      logger?.info(
        `simulate ${simulateIndex} failed; ${name} settings-only: ${sortErrorMessage(error)}`
      );
    }
  }
  await client.cluster.putComponentTemplate({
    name,
    template: {
      settings,
      ...(mappings ? { mappings } : {}),
    },
    _meta: meta,
  });
  logger?.info(
    includeMappings ? `Put ${name} session.id index sort` : `Put ${name} session.id sort settings`
  );
};

const rolloverUnsortedOtelWrites = async ({
  client,
  logger,
  streams,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  streams: OtelDataStream[];
}): Promise<void> => {
  for (const stream of streams) {
    const write = writeIndexName(stream);
    if (!write) {
      continue;
    }
    const settings = await client.indices.getSettings({
      index: write,
      flat_settings: true,
    });
    if (matchesIndexSort(settings, RUM_OTEL_INDEX_SORT_FIELD, RUM_OTEL_INDEX_SORT_ORDER)) {
      continue;
    }
    logger?.info(`Rolling over ${stream.name} so the write index uses session.id sort`);
    try {
      await client.indices.rollover({ alias: stream.name });
    } catch (error) {
      logger?.error(`Failed to rollover ${stream.name}: ${sortErrorMessage(error)}`);
    }
  }
};

export const ensureOtelSessionSort = async ({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
}): Promise<void> => {
  let sourceStreams: OtelDataStream[] = [];
  try {
    sourceStreams = otelSourceStreams(await listOtelDataStreams(client));
  } catch (error) {
    logger?.error(`Failed to list OTel data streams: ${sortErrorMessage(error)}`);
  }
  const includeMappings = sourceStreams.length > 0;
  for (const component of RUM_OTEL_CUSTOM_COMPONENTS) {
    try {
      await putOtelCustomTemplate({
        client,
        logger,
        name: component.name,
        simulateIndex: component.simulateIndex,
        includeMappings,
      });
    } catch (error) {
      logger?.error(`Failed to put ${component.name}: ${sortErrorMessage(error)}`);
    }
  }
  try {
    await rolloverUnsortedOtelWrites({ client, logger, streams: sourceStreams });
  } catch (error) {
    logger?.error(`Failed to rollover OTel write indices: ${sortErrorMessage(error)}`);
  }
};
