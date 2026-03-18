/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type {
  HealthDiagnosticQuery,
  HealthDiagnosticQueryV1,
  HealthDiagnosticQueryV2,
  ExecutableQuery,
  SkippedQuery,
  ResolvedQuery,
  IntegrationResolution,
} from './health_diagnostic_service.types';

export interface IntegrationResolver {
  resolve(queries: HealthDiagnosticQuery[]): Promise<ResolvedQuery[]>;
}

export class IntegrationResolverImpl implements IntegrationResolver {
  constructor(private readonly packageService: PackageService, private readonly logger: Logger) {}

  async resolve(queries: HealthDiagnosticQuery[]): Promise<ResolvedQuery[]> {
    const hasV2 = queries.some((q) => 'version' in q && q.version === 2);
    const installedPackages = hasV2 ? await this.fetchInstalledPackages() : [];

    return queries.flatMap((query) => {
      if ('version' in query && query.version === 1) {
        return [this.resolveV1(query)];
      } else if ('version' in query && query.version === 2) {
        return this.resolveV2(query, installedPackages);
      } else {
        return [this.resolveUnknown(query)];
      }
    });
  }

  private resolveV1(query: HealthDiagnosticQueryV1): ExecutableQuery {
    return { kind: 'executable', query };
  }

  private resolveV2(
    query: HealthDiagnosticQueryV2,
    installedPackages: InstalledPackage[]
  ): ResolvedQuery[] {
    const { integrations: patterns, datastreamTypes: typePatterns } = query;
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
        return { kind: 'skipped', query, reason: 'integration_not_installed' } as SkippedQuery;
      }

      const indices = dataStreams.map((ds) => `${ds.type}-${ds.dataset}-*`);
      const resolution: IntegrationResolution = { name: pkg.name, version: pkg.version, indices };
      return { kind: 'executable', query, resolution } as ExecutableQuery;
    });
  }

  private resolveUnknown(query: HealthDiagnosticQuery): SkippedQuery {
    this.logger.warn('Skipping query with unrecognised version', {
      queryId: (query as any).id, // eslint-disable-line @typescript-eslint/no-explicit-any
      name: query.name,
      version: (query as any).version, // eslint-disable-line @typescript-eslint/no-explicit-any
    } as LogMeta);
    return { kind: 'skipped', query, reason: 'unknown_version' };
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
