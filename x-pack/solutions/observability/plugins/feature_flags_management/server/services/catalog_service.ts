/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { UserActivityActionId } from '@kbn/core-user-activity-server';
import { conflictError } from '../errors';
import type {
  DefinitionAttributes,
  DefinitionsRepository,
  StoredEntity,
} from '../storage/definitions_repository';
import { definitionId } from '../storage/definitions_repository';
import type { AuditDataset, AuditObjectType, AuditOperation, AuditService } from './audit_service';
import { AUDIT_EVENT_TYPES, AUDIT_OBJECT_TYPES } from './audit_service';
import type { CredentialsService } from './credentials_service';
import { toApp, toEnvironment, toSnapshot } from './mappers';

export type CatalogType = 'environment' | 'app';

interface CatalogDefinition<T extends CatalogType> {
  type: T;
  label: string;
  dataset: AuditDataset;
  objectType: AuditObjectType;
  actions: Record<AuditOperation, UserActivityActionId>;
  /** Flag field that references this entity; a referenced entity cannot be deleted. */
  flagReferenceField: string;
  /** Credential field that references this entity; those credentials go with it. */
  credentialReferenceField: string;
  toApi: (entity: StoredEntity<T>) => CatalogItem<T>;
}

export type CatalogItem<T extends CatalogType> = ReturnType<
  T extends 'environment' ? typeof toEnvironment : typeof toApp
>;

export const ENVIRONMENTS_CATALOG: CatalogDefinition<'environment'> = {
  type: 'environment',
  label: 'environment',
  dataset: 'environments',
  objectType: AUDIT_OBJECT_TYPES.environment,
  actions: {
    create: 'feature_flag_environment_create',
    update: 'feature_flag_environment_update',
    delete: 'feature_flag_environment_delete',
  },
  flagReferenceField: 'flag.environment',
  credentialReferenceField: 'credential.environment',
  toApi: toEnvironment,
};

export const APPS_CATALOG: CatalogDefinition<'app'> = {
  type: 'app',
  label: 'app',
  dataset: 'apps',
  objectType: AUDIT_OBJECT_TYPES.app,
  actions: {
    create: 'feature_flag_app_create',
    update: 'feature_flag_app_update',
    delete: 'feature_flag_app_delete',
  },
  flagReferenceField: 'flag.apps',
  credentialReferenceField: 'credential.app',
  toApi: toApp,
};

interface CatalogServiceDeps {
  repository: DefinitionsRepository;
  audit: AuditService;
  credentials: CredentialsService;
}

/** CRUD for environments and apps, which share the same shape and reference rules. */
export class CatalogService<T extends CatalogType> {
  constructor(
    private readonly definition: CatalogDefinition<T>,
    private readonly deps: CatalogServiceDeps
  ) {}

  public async list({ page, perPage }: { page: number; perPage: number }) {
    const { items, total } = await this.deps.repository.search(this.definition.type, {
      from: (page - 1) * perPage,
      size: perPage,
    });
    return { items: items.map(this.definition.toApi), total, page, per_page: perPage };
  }

  public async get(key: string): Promise<CatalogItem<T>> {
    const entity = await this.deps.repository.getOrThrow(this.definition.type, this.id(key));
    return this.definition.toApi(entity);
  }

  public async create(
    request: KibanaRequest,
    attributes: DefinitionAttributes[T]
  ): Promise<CatalogItem<T>> {
    const entity = await this.deps.repository.create(
      this.definition.type,
      this.id(attributes.key),
      attributes
    );
    await this.audit(request, 'create', entity);
    return this.definition.toApi(entity);
  }

  public async update(
    request: KibanaRequest,
    key: string,
    { name, description, version }: { name: string; description?: string; version?: string }
  ): Promise<CatalogItem<T>> {
    const attributes = { key, name, description } as DefinitionAttributes[T];
    const entity = await this.deps.repository.update(
      this.definition.type,
      this.id(key),
      attributes,
      {
        version,
      }
    );
    await this.audit(request, 'update', entity);
    return this.definition.toApi(entity);
  }

  /** Blocked while a flag references the entity; otherwise its credentials are deleted too. */
  public async delete(request: KibanaRequest, key: string, { version }: { version?: string }) {
    const { repository, credentials } = this.deps;
    const { type, label, flagReferenceField, credentialReferenceField } = this.definition;

    const referencingFlags = await repository.count('flag', {
      term: { [flagReferenceField]: key },
    });
    if (referencingFlags > 0) {
      throw conflictError(
        `The ${label} [${key}] is used by ${referencingFlags} flag(s). Remove it from those flags first.`
      );
    }

    const entity = await repository.delete(type, this.id(key), { version });
    await this.audit(request, 'delete', entity);
    await credentials.deleteMatching(request, { term: { [credentialReferenceField]: key } });
  }

  private id(key: string) {
    return definitionId(this.definition.type, key);
  }

  private async audit(request: KibanaRequest, operation: AuditOperation, entity: StoredEntity<T>) {
    const { label, dataset, objectType, actions } = this.definition;
    const { key, name } = entity.attributes;
    const verb = { create: 'created', update: 'updated', delete: 'deleted' }[operation];
    await this.deps.audit.record(request, {
      action: actions[operation],
      eventType: AUDIT_EVENT_TYPES[operation],
      dataset,
      object: { type: objectType, id: key, name },
      snapshot: toSnapshot(this.definition.toApi(entity)),
      sequence: entity.revision,
      message: `User ${verb} feature flag ${label} "${name}" (id: ${key}).`,
    });
  }
}
