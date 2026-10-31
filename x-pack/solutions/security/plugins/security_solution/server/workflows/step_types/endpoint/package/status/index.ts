/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { truncate } from 'lodash';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  EPM_API_ROUTES,
  FLEET_ENDPOINT_PACKAGE,
  type GetInfoResponse,
} from '@kbn/fleet-plugin/common';
import type {
  CatNodesResponse,
  IndicesGetSettingsResponse,
  IngestGetPipelineResponse,
  TransformGetTransformResponse,
  TransformGetTransformStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { z } from '@kbn/zod/v4';
import { WARNING_TRANSFORM_STATES } from '../../../../../../common/constants';
import {
  metadataIndexPattern,
  METADATA_TRANSFORMS_PATTERN,
  METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
} from '../../../../../../common/endpoint/constants';
import { isEndpointPackageStale } from '../../../../../../common/endpoint/utils/is_endpoint_package_stale';
import {
  ELLIPSIS,
  MAX_INPUT_STRING_CHARS,
} from '../../../../../../common/workflows/step_types/common/budget';
import {
  MAX_PACKAGE_INDICES,
  MAX_PACKAGE_PIPELINES,
  MAX_PACKAGE_TRANSFORMS,
  getEndpointPackageStatusInputSchema,
  type getEndpointPackageStatusOutputSchema,
  getEndpointPackageStatusStepCommonDefinition,
} from '../../../../../../common/workflows/step_types/endpoint/package';
import { isUnauthorized, readErrorDetails } from '../../common/read_error';
import { parseNonNegativeTruncatedInteger } from '../../common/number';

type PackageStatusOutput = z.infer<typeof getEndpointPackageStatusOutputSchema>;
type Configurations = NonNullable<PackageStatusOutput['configurations']>;

const ENDPOINT_PACKAGE = FLEET_ENDPOINT_PACKAGE;
const METRICS_METADATA_INDEX_PATTERN = 'metrics-endpoint.metadata*';
const TRANSFORM_DEFAULT_FILE = 'default.json';

const PART_PACKAGE_FRESHNESS = 'package_freshness';
const PART_PACKAGE_CONFIGURATIONS = 'package_configurations';
const PART_PACKAGE_DEFAULT_SETTINGS = 'package_default_settings';

interface ReadSuccess<T> {
  ok: true;
  value: T;
}

interface ReadFailure {
  ok: false;
  unauthorized: boolean;
  status?: number;
}

type ReadResult<T> = ReadSuccess<T> | ReadFailure;

interface TransformDetail {
  id: string;
  state?: string;
  reason?: string;
  healthStatus?: string;
  documentsProcessed?: number;
  frequency?: string;
  syncDelay?: string;
  maxPageSearchSize?: number;
  default?: {
    frequency?: string;
    syncDelay?: string;
    maxPageSearchSize?: number;
  };
}

interface DefaultTransformSettings {
  names: string[];
  configs: Map<string, unknown>;
}

const boundedString = (value: unknown): string =>
  truncate(String(value), { length: MAX_INPUT_STRING_CHARS, omission: ELLIPSIS });

const readTransformSettings = (
  config: unknown
): { frequency?: string; syncDelay?: string; maxPageSearchSize?: number } => {
  const source = (typeof config === 'object' && config !== null ? config : {}) as {
    frequency?: unknown;
    sync?: { time?: { delay?: unknown } };
    settings?: { max_page_search_size?: unknown };
  };
  const delay = source.sync?.time?.delay;
  const maxPageSearchSize = parseNonNegativeTruncatedInteger(source.settings?.max_page_search_size);
  return {
    ...(source.frequency !== undefined ? { frequency: boundedString(source.frequency) } : {}),
    ...(delay !== undefined ? { syncDelay: boundedString(delay) } : {}),
    ...(maxPageSearchSize !== undefined ? { maxPageSearchSize } : {}),
  };
};

const buildTransforms = (
  configRead: ReadResult<TransformGetTransformResponse>,
  statsRead: ReadResult<TransformGetTransformStatsResponse>,
  defaults: DefaultTransformSettings
): { transforms: TransformDetail[]; succeeded: boolean } => {
  const byId = new Map<string, TransformDetail>();
  let succeeded = false;

  if (configRead.ok) {
    succeeded = true;
    for (const transform of configRead.value.transforms ?? []) {
      const settings = readTransformSettings(transform);
      byId.set(transform.id, {
        id: transform.id,
        ...(settings.frequency !== undefined ? { frequency: settings.frequency } : {}),
        ...(settings.syncDelay !== undefined ? { syncDelay: settings.syncDelay } : {}),
        ...(settings.maxPageSearchSize !== undefined
          ? { maxPageSearchSize: settings.maxPageSearchSize }
          : {}),
      });
    }
  }

  if (statsRead.ok) {
    succeeded = true;
    for (const transform of statsRead.value.transforms ?? []) {
      const existing = byId.get(transform.id) ?? { id: transform.id };
      const documentsProcessed = parseNonNegativeTruncatedInteger(
        transform.stats?.documents_processed
      );
      byId.set(transform.id, {
        ...existing,
        ...(transform.state !== undefined ? { state: boundedString(transform.state) } : {}),
        ...(transform.reason !== undefined ? { reason: boundedString(transform.reason) } : {}),
        ...(transform.health?.status !== undefined
          ? { healthStatus: boundedString(transform.health.status) }
          : {}),
        ...(documentsProcessed !== undefined ? { documentsProcessed } : {}),
      });
    }
  }

  for (const detail of byId.values()) {
    const name = defaults.names
      .filter((candidate) => detail.id.includes(candidate))
      .sort((a, b) => b.length - a.length)[0];
    if (name !== undefined) {
      const settings = readTransformSettings(defaults.configs.get(name));
      detail.default = {
        ...(settings.frequency !== undefined ? { frequency: settings.frequency } : {}),
        ...(settings.syncDelay !== undefined ? { syncDelay: settings.syncDelay } : {}),
        ...(settings.maxPageSearchSize !== undefined
          ? { maxPageSearchSize: settings.maxPageSearchSize }
          : {}),
      };
    }
  }

  return { transforms: [...byId.values()], succeeded };
};

const toTransformOutput = (
  detail: TransformDetail
): NonNullable<Configurations['transforms']>[number] => {
  const defaults = detail.default;
  return {
    id: boundedString(detail.id),
    ...(detail.state !== undefined ? { state: detail.state } : {}),
    ...(detail.reason !== undefined ? { reason: detail.reason } : {}),
    ...(detail.healthStatus !== undefined ? { health: { status: detail.healthStatus } } : {}),
    ...(detail.documentsProcessed !== undefined
      ? { stats: { documents_processed: detail.documentsProcessed } }
      : {}),
    ...(detail.frequency !== undefined ? { frequency: detail.frequency } : {}),
    ...(detail.syncDelay !== undefined ? { sync: { time: { delay: detail.syncDelay } } } : {}),
    ...(detail.maxPageSearchSize !== undefined
      ? { settings: { max_page_search_size: detail.maxPageSearchSize } }
      : {}),
    ...(defaults !== undefined
      ? {
          default: {
            ...(defaults.frequency !== undefined ? { frequency: defaults.frequency } : {}),
            ...(defaults.syncDelay !== undefined
              ? { sync: { time: { delay: defaults.syncDelay } } }
              : {}),
            ...(defaults.maxPageSearchSize !== undefined
              ? { settings: { max_page_search_size: defaults.maxPageSearchSize } }
              : {}),
          },
        }
      : {}),
    failing: detail.state !== undefined && WARNING_TRANSFORM_STATES.has(detail.state),
  };
};

const toIndexSettingsOutput = (
  indexes: IndicesGetSettingsResponse
): NonNullable<Configurations['indices']> =>
  Object.entries(indexes).map(([index, value]) => {
    const indexSettings = (
      value as {
        settings?: {
          index?: Record<string, unknown> & { lifecycle?: { name?: unknown } };
        };
      }
    )?.settings?.index;
    const lifecycleName = indexSettings?.lifecycle?.name;
    return {
      index: boundedString(index),
      ...(indexSettings !== undefined
        ? {
            settings: {
              index: {
                ...(indexSettings.number_of_shards !== undefined
                  ? { number_of_shards: boundedString(indexSettings.number_of_shards) }
                  : {}),
                ...(indexSettings.number_of_replicas !== undefined
                  ? { number_of_replicas: boundedString(indexSettings.number_of_replicas) }
                  : {}),
                ...(indexSettings.refresh_interval !== undefined
                  ? { refresh_interval: boundedString(indexSettings.refresh_interval) }
                  : {}),
                ...(indexSettings.default_pipeline !== undefined
                  ? { default_pipeline: boundedString(indexSettings.default_pipeline) }
                  : {}),
                ...(indexSettings.final_pipeline !== undefined
                  ? { final_pipeline: boundedString(indexSettings.final_pipeline) }
                  : {}),
                ...(lifecycleName !== undefined
                  ? { lifecycle: { name: boundedString(lifecycleName) } }
                  : {}),
              },
            },
          }
        : {}),
    };
  });

const toPipelinesOutput = (
  pipelines: IngestGetPipelineResponse
): NonNullable<Configurations['pipelines']> =>
  Object.keys(pipelines).map((id) => ({ id: boundedString(id) }));

const toNodesOutput = (nodes: CatNodesResponse): NonNullable<Configurations['nodes']> => {
  const roles: Record<string, number> = {};
  for (const node of nodes) {
    const role = node['node.role'];
    if (typeof role === 'string') {
      for (const letter of role) {
        if (/[a-z]/.test(letter)) {
          roles[letter] = (roles[letter] ?? 0) + 1;
        }
      }
    }
  }
  return { count: nodes.length, roles };
};

const listLimit = <T>(values: T[], max: number): { values: T[]; total?: number } =>
  values.length > max ? { values: values.slice(0, max), total: values.length } : { values };

const parseTransformDefaults = (body: unknown): unknown => {
  if (typeof body !== 'string') {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const collectTransformFiles = (item: unknown): string[] => {
  const assets = (
    item as { assets?: { elasticsearch?: { transform?: Array<{ path?: unknown }> } } } | undefined
  )?.assets;
  const transformAssets = assets?.elasticsearch?.transform ?? [];
  return transformAssets
    .map((asset) => asset?.path)
    .filter((path): path is string => typeof path === 'string' && path.includes('/'))
    .filter((path) => path.endsWith(`/${TRANSFORM_DEFAULT_FILE}`))
    .map((path) => path.slice(path.indexOf('/') + 1))
    .filter((path) => path.length > 0);
};

export const getEndpointPackageStatusStepDefinition = createServerStepDefinition({
  ...getEndpointPackageStatusStepCommonDefinition,
  handler: async (context) => {
    const { include_configurations: includeConfigurations } =
      getEndpointPackageStatusInputSchema.parse(context.input);

    const unauthorized = new Set<string>();
    const unavailable = new Set<string>();
    const markFailure = (part: string, unauthorizedFailure: boolean): void => {
      if (unauthorizedFailure) {
        unauthorized.add(part);
      } else {
        unavailable.add(part);
      }
    };

    const readKibanaApi = async <T>(
      path: string,
      headers?: Record<string, string>
    ): Promise<ReadResult<T>> => {
      try {
        const { body } = await context.contextManager.callKibanaApi<T>({
          method: 'GET',
          path,
          ...(headers ? { headers } : {}),
        });
        return { ok: true, value: body };
      } catch (error) {
        return {
          ok: false,
          unauthorized: isUnauthorized(error),
          status: readErrorDetails(error).statusCode,
        };
      }
    };

    const readEs = async <T>(
      read: (client: ElasticsearchClient) => Promise<T>
    ): Promise<ReadResult<T>> => {
      try {
        return { ok: true, value: await read(context.contextManager.getScopedEsClient()) };
      } catch (error) {
        return {
          ok: false,
          unauthorized: isUnauthorized(error),
          status: readErrorDetails(error).statusCode,
        };
      }
    };

    const packageRead = await readKibanaApi<GetInfoResponse>(
      EPM_API_ROUTES.INFO_WITHOUT_VERSION_PATTERN.replace('{pkgName}', ENDPOINT_PACKAGE)
    );
    if (!packageRead.ok) {
      markFailure(PART_PACKAGE_FRESHNESS, packageRead.unauthorized);
    }
    const packageItem = packageRead.ok ? packageRead.value?.item : undefined;

    const output: PackageStatusOutput = {
      package: packageItem
        ? {
            name: boundedString(packageItem.name),
            version: boundedString(packageItem.version),
            latestVersion: boundedString(packageItem.latestVersion ?? ''),
            ...(packageItem.installationInfo
              ? {
                  installationInfo: {
                    version: boundedString(packageItem.installationInfo.version ?? ''),
                    install_status: boundedString(
                      packageItem.installationInfo.install_status ?? ''
                    ),
                  },
                }
              : {}),
          }
        : null,
      unauthorized: [],
      unavailable: [],
    };

    if (packageRead.ok) {
      output.stale = isEndpointPackageStale(
        packageItem?.installationInfo?.version ?? null,
        packageItem?.latestVersion ?? null
      );
    }

    if (includeConfigurations) {
      const statsRead = await readKibanaApi<TransformGetTransformStatsResponse>(
        METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
        { 'elastic-api-version': '1' }
      );
      if (!statsRead.ok) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, statsRead.unauthorized);
      }

      const configRead = await readEs((client) =>
        client.transform.getTransform({ transform_id: METADATA_TRANSFORMS_PATTERN })
      );
      if (!configRead.ok) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, configRead.unauthorized);
      }

      const defaultSettings: DefaultTransformSettings = { names: [], configs: new Map() };
      if (!packageRead.ok) {
        markFailure(PART_PACKAGE_DEFAULT_SETTINGS, packageRead.unauthorized);
      } else {
        const version = packageItem?.installationInfo?.version ?? packageItem?.version;
        const transformFiles = collectTransformFiles(packageItem);
        let failure: boolean | undefined;
        for (const relativePath of transformFiles) {
          if (version !== undefined) {
            const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
            const filePath = `${EPM_API_ROUTES.INFO_PATTERN.replace(
              '{pkgName}',
              ENDPOINT_PACKAGE
            ).replace('{pkgVersion}', encodeURIComponent(version))}/${encodedPath}`;
            const fileRead = await readKibanaApi<unknown>(filePath);
            if (fileRead.ok) {
              const name = relativePath.split('/').slice(-2)[0];
              defaultSettings.names.push(name);
              defaultSettings.configs.set(name, parseTransformDefaults(fileRead.value));
            } else {
              failure = failure === true || fileRead.unauthorized;
            }
          }
        }
        if (version === undefined) {
          markFailure(PART_PACKAGE_DEFAULT_SETTINGS, false);
        } else if (failure !== undefined) {
          markFailure(PART_PACKAGE_DEFAULT_SETTINGS, failure);
        }
      }

      const { transforms, succeeded: transformsSucceeded } = buildTransforms(
        configRead,
        statsRead,
        defaultSettings
      );

      const indicesRead = await readEs((client) =>
        client.indices.getSettings({ index: METRICS_METADATA_INDEX_PATTERN })
      );
      if (!indicesRead.ok) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, indicesRead.unauthorized);
      }

      const pipelinesRead = await readEs((client) =>
        client.ingest.getPipeline({ id: metadataIndexPattern })
      );
      if (!pipelinesRead.ok && pipelinesRead.status !== 404) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, pipelinesRead.unauthorized);
      }

      const nodesRead = await readEs<unknown>((client) =>
        client.cat.nodes({ format: 'json', h: 'node.role' })
      );
      if (!nodesRead.ok) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, nodesRead.unauthorized);
      } else if (!Array.isArray(nodesRead.value)) {
        markFailure(PART_PACKAGE_CONFIGURATIONS, false);
      }

      const configurations: Configurations = {};

      if (transformsSucceeded) {
        const limited = listLimit(transforms.map(toTransformOutput), MAX_PACKAGE_TRANSFORMS);
        configurations.transforms = limited.values;
        if (limited.total !== undefined) {
          configurations.transforms_total = limited.total;
        }
      }

      if (indicesRead.ok) {
        const limited = listLimit(toIndexSettingsOutput(indicesRead.value), MAX_PACKAGE_INDICES);
        configurations.indices = limited.values;
        if (limited.total !== undefined) {
          configurations.indices_total = limited.total;
        }
      }

      if (pipelinesRead.ok) {
        const limited = listLimit(toPipelinesOutput(pipelinesRead.value), MAX_PACKAGE_PIPELINES);
        configurations.pipelines = limited.values;
        if (limited.total !== undefined) {
          configurations.pipelines_total = limited.total;
        }
      } else if (pipelinesRead.status === 404) {
        configurations.pipelines = [];
      }

      if (nodesRead.ok && Array.isArray(nodesRead.value)) {
        configurations.nodes = toNodesOutput(nodesRead.value);
      }

      if (Object.keys(configurations).length > 0) {
        output.configurations = configurations;
      }
    }

    output.unauthorized = [...unauthorized];
    output.unavailable = [...unavailable];

    return { output };
  },
});
