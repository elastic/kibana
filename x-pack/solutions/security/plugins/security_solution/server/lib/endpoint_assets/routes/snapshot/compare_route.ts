/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../../../common/endpoint_assets';
import type {
  SnapshotCompareResponse,
  AssetComparison,
  FieldDiff,
} from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

/**
 * Priority fields for comparison - security-critical fields that are always compared
 */
const PRIORITY_FIELDS = [
  'endpoint.posture.score',
  'endpoint.posture.level',
  'endpoint.posture.firewall_enabled',
  'endpoint.posture.disk_encryption',
  'endpoint.posture.secure_boot',
  'endpoint.privileges.admin_count',
  'endpoint.privileges.elevated_risk',
  'endpoint.unknown_knowns.total_dormant_risks',
  'endpoint.unknown_knowns.risk_level',
  'endpoint.software.installed_count',
  'endpoint.software.services_count',
  'endpoint.network.listening_ports_count',
];

/**
 * Get nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Compare two values and determine the change type
 */
function compareValues(
  valueA: unknown,
  valueB: unknown
): { hasChange: boolean; changeType: 'added' | 'removed' | 'modified' } | null {
  const aIsEmpty = valueA === undefined || valueA === null;
  const bIsEmpty = valueB === undefined || valueB === null;

  if (aIsEmpty && bIsEmpty) {
    return null; // No change, both empty
  }

  if (aIsEmpty && !bIsEmpty) {
    return { hasChange: true, changeType: 'added' };
  }

  if (!aIsEmpty && bIsEmpty) {
    return { hasChange: true, changeType: 'removed' };
  }

  // Both have values - compare them
  const areEqual = JSON.stringify(valueA) === JSON.stringify(valueB);
  if (areEqual) {
    return null; // No change
  }

  return { hasChange: true, changeType: 'modified' };
}

/**
 * Compare two entity documents and extract field-level diffs
 */
function compareDocuments(
  docA: Record<string, unknown> | undefined,
  docB: Record<string, unknown> | undefined,
  showOnlyChanges: boolean
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  // Compare priority fields
  for (const fieldPath of PRIORITY_FIELDS) {
    const valueA = docA ? getNestedValue(docA, fieldPath) : undefined;
    const valueB = docB ? getNestedValue(docB, fieldPath) : undefined;

    const comparison = compareValues(valueA, valueB);

    if (comparison !== null) {
      diffs.push({
        field_path: fieldPath,
        value_a: valueA,
        value_b: valueB,
        change_type: comparison.changeType,
      });
    } else if (!showOnlyChanges && (valueA !== undefined || valueB !== undefined)) {
      // Include unchanged fields in full view mode if they have values
      diffs.push({
        field_path: fieldPath,
        value_a: valueA,
        value_b: valueB,
        change_type: 'modified', // Use 'modified' as placeholder for unchanged
      });
    }
  }

  return diffs;
}

export const registerSnapshotCompareRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SNAPSHOT_COMPARE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              date_a: schema.string({
                validate: (value) => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    return 'Invalid date format. Expected YYYY-MM-DD';
                  }
                },
              }),
              date_b: schema.string({
                validate: (value) => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    return 'Invalid date format. Expected YYYY-MM-DD';
                  }
                },
              }),
              host_id: schema.maybe(schema.string()),
              show_only_changes: schema.boolean({ defaultValue: true }),
              namespace: schema.string({ defaultValue: 'default' }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const {
            date_a: dateA,
            date_b: dateB,
            host_id: hostId,
            show_only_changes: showOnlyChanges,
            namespace,
          } = request.query;

          // Build index names for the two dates
          const indexA = `.entities.v1.history.${dateA}.security_host_${namespace}`;
          const indexB = `.entities.v1.history.${dateB}.security_host_${namespace}`;

          // Build query filter for specific host if provided
          const hostFilter = hostId ? [{ term: { 'host.id': hostId } }] : [];

          // Query both snapshots in parallel
          const [resultA, resultB] = await Promise.all([
            esClient
              .search({
                index: indexA,
                size: 10000,
                _source: true,
                query: hostFilter.length > 0 ? { bool: { filter: hostFilter } } : { match_all: {} },
              })
              .catch((err) => {
                // Index may not exist for the date
                if (err.meta?.statusCode === 404) {
                  return { hits: { hits: [] } };
                }
                throw err;
              }),
            esClient
              .search({
                index: indexB,
                size: 10000,
                _source: true,
                query: hostFilter.length > 0 ? { bool: { filter: hostFilter } } : { match_all: {} },
              })
              .catch((err) => {
                // Index may not exist for the date
                if (err.meta?.statusCode === 404) {
                  return { hits: { hits: [] } };
                }
                throw err;
              }),
          ]);

          // Build maps by host.name (entity identity field)
          const mapA = new Map<string, Record<string, unknown>>();
          const mapB = new Map<string, Record<string, unknown>>();

          for (const hit of resultA.hits.hits) {
            const source = hit._source as Record<string, unknown>;
            const host = source.host as Record<string, unknown> | undefined;
            const hostName = host?.name as string | undefined;
            if (hostName) {
              mapA.set(hostName, source);
            }
          }

          for (const hit of resultB.hits.hits) {
            const source = hit._source as Record<string, unknown>;
            const host = source.host as Record<string, unknown> | undefined;
            const hostName = host?.name as string | undefined;
            if (hostName) {
              mapB.set(hostName, source);
            }
          }

          // Find all unique host names
          const allHostNames = new Set([...mapA.keys(), ...mapB.keys()]);

          // Build comparisons
          const comparisons: AssetComparison[] = [];
          let assetsWithChanges = 0;
          let assetsAdded = 0;
          let assetsRemoved = 0;

          for (const hostName of allHostNames) {
            const docA = mapA.get(hostName);
            const docB = mapB.get(hostName);

            const existsInA = docA !== undefined;
            const existsInB = docB !== undefined;

            // Determine asset status
            if (!existsInA && existsInB) {
              assetsAdded++;
            } else if (existsInA && !existsInB) {
              assetsRemoved++;
            }

            // Get host.id from whichever document exists
            const hostDoc = (docB?.host || docA?.host) as Record<string, unknown> | undefined;
            const hostIdValue = hostDoc?.id as string | undefined;

            // Compare documents
            const diffs = compareDocuments(docA, docB, showOnlyChanges);
            const changedDiffs = diffs.filter((d) => {
              const valuesDiffer = JSON.stringify(d.value_a) !== JSON.stringify(d.value_b);
              return valuesDiffer;
            });
            const hasChanges = changedDiffs.length > 0 || !existsInA || !existsInB;

            if (hasChanges) {
              assetsWithChanges++;
            }

            // Filter based on showOnlyChanges
            if (showOnlyChanges && !hasChanges) {
              continue;
            }

            comparisons.push({
              host_id: hostIdValue ?? hostName,
              host_name: hostName,
              exists_in_a: existsInA,
              exists_in_b: existsInB,
              has_changes: hasChanges,
              change_count: changedDiffs.length,
              diffs: showOnlyChanges ? changedDiffs : diffs,
              document_a: docA,
              document_b: docB,
            });
          }

          // Sort comparisons: changed first, then by change count descending
          comparisons.sort((a, b) => {
            if (a.has_changes && !b.has_changes) return -1;
            if (!a.has_changes && b.has_changes) return 1;
            return b.change_count - a.change_count;
          });

          const compareResponse: SnapshotCompareResponse = {
            date_a: dateA,
            date_b: dateB,
            total_assets: allHostNames.size,
            assets_with_changes: assetsWithChanges,
            assets_added: assetsAdded,
            assets_removed: assetsRemoved,
            comparisons,
          };

          return response.ok({
            body: compareResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error comparing Entity Store snapshots: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
