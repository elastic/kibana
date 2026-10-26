/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest } from '@kbn/core/server';
import type { ValidationIssue } from '../../common/flag_validation';
import {
  findPrerequisiteCycle,
  isVariation,
  validateFlagConsistency,
} from '../../common/flag_validation';
import type {
  Flag,
  FlagDefinition,
  FlagHistoryItem,
  FlagHistoryResponse,
  ListFlagsResponse,
} from '../../common/schemas/flags';
import { flagSnapshotSchema } from '../../common/schemas/flags';
import { conflictError, validationError } from '../errors';
import type { DefinitionsRepository, StoredEntity } from '../storage/definitions_repository';
import { definitionId } from '../storage/definitions_repository';
import type { AuditOperation, AuditService } from './audit_service';
import { AUDIT_EVENT_TYPES, AUDIT_OBJECT_TYPES } from './audit_service';
import { toFlag, toFlagDefinition, toSnapshot, toStoredFlag } from './mappers';

export interface ListFlagsOptions {
  app?: string;
  environment?: string;
  tag?: string;
  search?: string;
  page: number;
  perPage: number;
}

const flagId = (key: string) => definitionId('flag', key);

const escapeWildcard = (value: string) => value.replace(/[\\*?]/g, (char) => `\\${char}`);

interface FlagsServiceDeps {
  repository: DefinitionsRepository;
  audit: AuditService;
  /** The authenticated Kibana user, used to record who created a flag. */
  getCurrentUser: (request: KibanaRequest) => { username: string; full_name?: string } | null;
}

export class FlagsService {
  constructor(private readonly deps: FlagsServiceDeps) {}

  public async list({
    app,
    environment,
    tag,
    search,
    page,
    perPage,
  }: ListFlagsOptions): Promise<ListFlagsResponse> {
    const filters: QueryDslQueryContainer[] = [];
    if (app) filters.push({ term: { 'flag.apps': app } });
    if (environment) filters.push({ term: { 'flag.environment': environment } });
    if (tag) filters.push({ term: { 'flag.tags': tag } });
    if (search) {
      const value = `*${escapeWildcard(search)}*`;
      filters.push({
        bool: {
          should: [
            { wildcard: { 'flag.key': { value, case_insensitive: true } } },
            { wildcard: { 'flag.name': { value, case_insensitive: true } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const { items, total } = await this.deps.repository.search('flag', {
      query: filters.length ? { bool: { filter: filters } } : undefined,
      from: (page - 1) * perPage,
      size: perPage,
    });
    return { items: items.map(toFlag), total, page, per_page: perPage };
  }

  public async get(key: string): Promise<Flag> {
    return toFlag(await this.deps.repository.getOrThrow('flag', flagId(key)));
  }

  public async create(request: KibanaRequest, definition: FlagDefinition): Promise<Flag> {
    await this.validate(definition, { isNew: true });
    const user = this.deps.getCurrentUser(request);
    const entity = await this.deps.repository.create(
      'flag',
      flagId(definition.key),
      toStoredFlag(
        definition,
        user
          ? { username: user.username, ...(user.full_name ? { full_name: user.full_name } : {}) }
          : undefined
      )
    );
    await this.audit(request, 'create', entity);
    return toFlag(entity);
  }

  public async update(
    request: KibanaRequest,
    key: string,
    { version, ...changes }: Omit<FlagDefinition, 'key'> & { version?: string }
  ): Promise<Flag> {
    const definition: FlagDefinition = { ...changes, key };
    await this.validate(definition, { isNew: false });
    const existing = await this.deps.repository.getOrThrow('flag', flagId(key));
    const entity = await this.deps.repository.update(
      'flag',
      flagId(key),
      toStoredFlag(definition, existing.attributes.created_by),
      {
        version,
      }
    );
    await this.audit(request, 'update', entity);
    return toFlag(entity);
  }

  /** Blocked while another flag uses this one as a prerequisite. */
  public async delete(request: KibanaRequest, key: string, { version }: { version?: string }) {
    const dependents = (await this.loadOtherFlags(key)).filter((other) =>
      Object.values(other.environments).some((ruleSet) =>
        (ruleSet.prerequisites ?? []).some((prerequisite) => prerequisite.flag === key)
      )
    );
    if (dependents.length > 0) {
      throw conflictError(
        `The flag [${key}] is a prerequisite of ${dependents
          .map((other) => `[${other.key}]`)
          .join(', ')}. Remove it from those flags first.`
      );
    }
    const entity = await this.deps.repository.delete('flag', flagId(key), { version });
    await this.audit(request, 'delete', entity);
  }

  public async history(
    key: string,
    { page, perPage }: { page: number; perPage: number }
  ): Promise<FlagHistoryResponse> {
    const { total, items } = await this.deps.audit.getHistory(
      'flags',
      AUDIT_OBJECT_TYPES.flag,
      key,
      { from: (page - 1) * perPage, size: perPage }
    );
    return {
      // Snapshots may come from other Kibana versions: skip the ones that can't be read.
      items: items.flatMap((item): FlagHistoryItem[] => {
        const snapshot = flagSnapshotSchema.safeParse(item.object.snapshot);
        if (!snapshot.success) {
          return [];
        }
        return [
          {
            id: item.event.id,
            timestamp: item['@timestamp'],
            action: item.event.action,
            event_type: item.event.type,
            user: { name: item.user.name, id: item.user.id, full_name: item.user.full_name },
            snapshot: snapshot.data,
          },
        ];
      }),
      total,
      page,
      per_page: perPage,
    };
  }

  /**
   * Checks the flag itself, that the apps and environments it uses exist, and that its
   * prerequisites (and the flags that use it as a prerequisite) stay valid and acyclic.
   */
  private async validate(flag: FlagDefinition, { isNew }: { isNew: boolean }) {
    const issues = validateFlagConsistency(flag);
    if (issues.length > 0) {
      throw validationError(`The flag [${flag.key}] is invalid.`, issues);
    }

    issues.push(...(await this.validateReferences(flag)));

    const hasPrerequisites = Object.values(flag.environments).some(
      (ruleSet) => (ruleSet.prerequisites ?? []).length > 0
    );
    // A new flag has no dependents yet, so other flags only matter if it has prerequisites.
    if (hasPrerequisites || !isNew) {
      issues.push(...validatePrerequisites(flag, await this.loadOtherFlags(flag.key)));
    }

    if (issues.length > 0) {
      throw validationError(`The flag [${flag.key}] is invalid.`, issues);
    }
  }

  private async validateReferences(flag: FlagDefinition): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const environmentKeys = Object.keys(flag.environments);
    const [apps, environments] = await Promise.all([
      this.deps.repository.mget(
        'app',
        flag.apps.map((app) => definitionId('app', app))
      ),
      this.deps.repository.mget(
        'environment',
        environmentKeys.map((environment) => definitionId('environment', environment))
      ),
    ]);
    flag.apps.forEach((app, index) => {
      if (!apps.has(definitionId('app', app))) {
        issues.push({ path: `apps.${index}`, message: `The app [${app}] does not exist.` });
      }
    });
    for (const environment of environmentKeys) {
      if (!environments.has(definitionId('environment', environment))) {
        issues.push({
          path: `environments.${environment}`,
          message: `The environment [${environment}] does not exist.`,
        });
      }
    }
    return issues;
  }

  private async loadOtherFlags(key: string): Promise<FlagDefinition[]> {
    const flags = await this.deps.repository.findAll('flag');
    return flags
      .filter((entity) => entity.attributes.key !== key)
      .map((entity) => toFlagDefinition(entity.attributes));
  }

  private async audit(
    request: KibanaRequest,
    operation: AuditOperation,
    entity: StoredEntity<'flag'>
  ) {
    const flag = toFlag(entity);
    const name = flag.name ?? flag.key;
    const verb = { create: 'created', update: 'updated', delete: 'deleted' }[operation];
    await this.deps.audit.record(request, {
      action: `feature_flag_${operation}`,
      eventType: AUDIT_EVENT_TYPES[operation],
      dataset: 'flags',
      object: { type: AUDIT_OBJECT_TYPES.flag, id: flag.key, name, tags: flag.tags },
      snapshot: toSnapshot(flag),
      sequence: entity.revision,
      message: `User ${verb} feature flag "${name}" (id: ${flag.key}).`,
    });
  }
}

type PrerequisiteCheckedFlag = Pick<FlagDefinition, 'key' | 'variations' | 'environments'>;

/**
 * Validates prerequisites in both directions, per environment:
 * - each prerequisite exists, is configured in the same environment, and `value` is one of
 *   *its* variations;
 * - every flag that uses this one as a prerequisite still finds it configured in that
 *   environment, with the value it expects;
 * - no prerequisite cycle goes through this flag.
 */
export const validatePrerequisites = (
  flag: PrerequisiteCheckedFlag,
  others: readonly PrerequisiteCheckedFlag[]
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const othersByKey = new Map(others.map((other) => [other.key, other]));

  for (const [environment, ruleSet] of Object.entries(flag.environments)) {
    (ruleSet.prerequisites ?? []).forEach((prerequisite, index) => {
      const path = `environments.${environment}.prerequisites.${index}`;
      const target = othersByKey.get(prerequisite.flag);
      if (!target) {
        issues.push({
          path: `${path}.flag`,
          message: `The prerequisite flag [${prerequisite.flag}] does not exist.`,
        });
      } else if (!target.environments[environment]) {
        issues.push({
          path: `${path}.flag`,
          message: `The prerequisite flag [${prerequisite.flag}] has no rules for environment [${environment}].`,
        });
      } else if (!isVariation(target.variations, prerequisite.value)) {
        issues.push({
          path: `${path}.value`,
          message: `${JSON.stringify(prerequisite.value)} is not one of the variations of [${
            prerequisite.flag
          }].`,
        });
      }
    });
  }

  for (const other of others) {
    for (const [environment, ruleSet] of Object.entries(other.environments)) {
      for (const prerequisite of ruleSet.prerequisites ?? []) {
        if (prerequisite.flag !== flag.key) {
          continue;
        }
        if (!flag.environments[environment]) {
          issues.push({
            path: `environments.${environment}`,
            message: `The flag [${other.key}] uses this flag as a prerequisite in environment [${environment}], so it needs rules there.`,
          });
        } else if (!isVariation(flag.variations, prerequisite.value)) {
          issues.push({
            path: 'variations',
            message: `The flag [${other.key}] expects this flag to serve ${JSON.stringify(
              prerequisite.value
            )} in environment [${environment}].`,
          });
        }
      }
    }
  }

  for (const environment of Object.keys(flag.environments)) {
    const graph = new Map<string, string[]>();
    for (const candidate of [...others, flag]) {
      const prerequisites = candidate.environments[environment]?.prerequisites ?? [];
      graph.set(
        candidate.key,
        prerequisites.map((prerequisite) => prerequisite.flag)
      );
    }
    const cycle = findPrerequisiteCycle(graph, flag.key);
    if (cycle) {
      issues.push({
        path: `environments.${environment}.prerequisites`,
        message: `Prerequisites form a cycle: ${cycle.join(' -> ')}.`,
      });
    }
  }

  return issues;
};
