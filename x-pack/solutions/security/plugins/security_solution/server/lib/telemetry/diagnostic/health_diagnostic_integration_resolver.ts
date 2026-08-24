/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import {
  QueryType,
  type HealthDiagnosticQuery,
  type IndexQuery,
  type ApiQuery,
  type ApiExecutableQuery,
  type ExecutableQuery,
  type SkippedQuery,
  type ResolvedQuery,
  type IntegrationResolution,
} from './health_diagnostic_service.types';

export interface IntegrationResolver {
  resolve(queries: HealthDiagnosticQuery[]): Promise<ResolvedQuery[]>;
}

export class IntegrationResolverImpl implements IntegrationResolver {
  constructor(private readonly packageService: PackageService, private readonly logger: Logger) {}

  async resolve(queries: HealthDiagnosticQuery[]): Promise<ResolvedQuery[]> {
    const needsFleet = queries.some(
      (q) =>
        'kind' in q &&
        (q.kind === 'index' || q.kind === 'api') &&
        (q as IndexQuery | ApiQuery).integrations !== undefined &&
        ((q as IndexQuery | ApiQuery).integrations ?? []).length > 0
    );
    let installedPackages: InstalledPackage[] = [];
    let fleetUnavailable = false;

    if (needsFleet) {
      try {
        installedPackages = await this.fetchInstalledPackages();
      } catch (err) {
        // just log as debug since it's not necessary to pollute logs with errors if fleet is unavailable - we'll just
        // skip integration-targeting queries and inform it accordingly in the stats
        this.logger.debug(
          'Failed to fetch installed packages from Fleet; integration-targeting queries will be skipped',
          {
            error: err.message,
          } as LogMeta
        );
        fleetUnavailable = true;
      }
    }

    const resolved = await Promise.all(
      queries.map(async (query): Promise<ResolvedQuery[]> => {
        if (!('kind' in query)) {
          return [this.resolveUnknown(query)];
        }
        if (query.kind === 'index') {
          if (query.type === QueryType.ESQL && /^[\s\r\n]*FROM/i.test(query.query)) {
            return [{ kind: 'skipped', query, reason: 'unsupported_query' } as SkippedQuery];
          }
          if (query.index) {
            return [{ kind: 'executable', query } as ExecutableQuery];
          }
          if (fleetUnavailable) {
            return [{ kind: 'skipped', query, reason: 'fleet_unavailable' } as SkippedQuery];
          }
          return this.resolveIndexWithIntegrations(query, installedPackages);
        } else if (query.kind === 'api') {
          if (fleetUnavailable && query.integrations && query.integrations.length > 0) {
            return [{ kind: 'skipped', query, reason: 'fleet_unavailable' } as SkippedQuery];
          }
          return [await this.resolveApi(query, installedPackages)];
        } else {
          return [this.resolveUnknown(query)];
        }
      })
    );
    return resolved.flat();
  }

  private resolveIndexWithIntegrations(
    query: IndexQuery,
    installedPackages: InstalledPackage[]
  ): ResolvedQuery[] {
    const { integrations: patterns, datastreamTypes: typePatterns } = query;
    if (!patterns) {
      return [];
    }
    const matched = installedPackages.filter((pkg) =>
      patterns.some((pattern) => {
        try {
          return new RegExp(`^${pattern}$`).test(pkg.name);
        } catch {
          this.logger.warn(`Invalid regex pattern in integrations field: ${pattern}`);
          return false;
        }
      })
    );

    if (matched.length === 0) {
      this.logger.debug('No matching integrations found, skipping query', {
        queryName: query.name,
      } as LogMeta);
      return [{ kind: 'skipped', query, reason: 'integration_not_installed' }];
    }

    return matched.map((pkg) => {
      const dataStreams = (pkg.data_streams ?? []).filter((ds) => {
        if (!typePatterns || typePatterns.length === 0) return true;
        return typePatterns.some((pattern) => {
          try {
            return new RegExp(`^${pattern}$`).test(ds.type);
          } catch {
            this.logger.warn(`Invalid regex pattern in datastreamTypes field: ${pattern}`);
            return false;
          }
        });
      });

      if (dataStreams.length === 0) {
        this.logger.debug('Integration matched but no datastreams passed type filter, skipping', {
          queryName: query.name,
          integration: pkg.name,
          typePatterns,
        } as LogMeta);
        return { kind: 'skipped', query, reason: 'datastreams_not_matched' } as SkippedQuery;
      }

      const indices = dataStreams.map((ds) => `${ds.type}-${ds.dataset}-*`);
      const resolution: IntegrationResolution = { name: pkg.name, version: pkg.version, indices };
      return { kind: 'executable', query, resolution } as ExecutableQuery;
    });
  }

  private resolveUnknown(query: HealthDiagnosticQuery): SkippedQuery {
    this.logger.warn('Skipping query that failed to parse', {
      queryId: (query as any).id, // eslint-disable-line @typescript-eslint/no-explicit-any
      name: query.name,
    } as LogMeta);
    return { kind: 'skipped', query, reason: 'parse_failure' };
  }

  private resolveApi(
    query: ApiQuery,
    installedPackages: InstalledPackage[]
  ): ApiExecutableQuery | SkippedQuery {
    if (!query.integrations || query.integrations.length === 0) {
      return { kind: 'executable_api', query };
    }
    const patterns = query.integrations.flatMap((p) => {
      try {
        return [new RegExp(`^${p}$`)];
      } catch {
        this.logger.warn(`Invalid regex pattern in integrations field: ${p}`);
        return [];
      }
    });
    const match = installedPackages.find((pkg) => patterns.some((re) => re.test(pkg.name)));
    if (!match) {
      this.logger.debug('No matching integration found for API query, skipping', {
        queryName: query.name,
      } as LogMeta);
      return { kind: 'skipped', query, reason: 'integration_not_installed' };
    }
    return {
      kind: 'executable_api',
      query,
      resolution: { name: match.name, version: match.version, indices: [] },
    };
  }

  private async fetchInstalledPackages(): Promise<InstalledPackage[]> {
    const all = await this.packageService.asInternalUser.getPackages();
    return all.filter((pkg) => pkg.status === 'installed') as InstalledPackage[];
  }
}

interface InstalledPackage {
  name: string;
  version: string;
  status: string;
  data_streams?: Array<{ dataset: string; type: string }>;
}
