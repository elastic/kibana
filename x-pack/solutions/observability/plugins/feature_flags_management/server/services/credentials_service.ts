/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest } from '@kbn/core/server';
import type { Credential, RotateCredentialResponse } from '../../common/schemas/credentials';
import { notFoundError } from '../errors';
import { generateClientId, generateSdkKey, hashSdkKey, sdkKeyHint } from '../lib/credentials';
import type {
  DefinitionsRepository,
  StoredCredentialAttributes,
  StoredEntity,
} from '../storage/definitions_repository';
import { definitionId } from '../storage/definitions_repository';
import type { AuditOperation, AuditService } from './audit_service';
import { AUDIT_EVENT_TYPES, AUDIT_OBJECT_TYPES } from './audit_service';
import { toCredential, toSnapshot } from './mappers';

/** `sdk_key_hash` is a secret-derived value, so change history never stores it. */
const CREDENTIAL_FIELDS_TO_REDACT = { sdk_key_hash: true };

export const credentialId = (app: string, environment: string) =>
  definitionId('credential', app, environment);

interface CredentialsServiceDeps {
  repository: DefinitionsRepository;
  audit: AuditService;
}

export class CredentialsService {
  constructor(private readonly deps: CredentialsServiceDeps) {}

  public async list(app: string): Promise<Credential[]> {
    await this.deps.repository.getOrThrow('app', definitionId('app', app));
    const credentials = await this.deps.repository.findAll('credential', {
      term: { 'credential.app': app },
    });
    return credentials.map(toCredential);
  }

  /** Creates the credential if it doesn't exist yet, otherwise replaces its SDK key. */
  public async rotate(
    request: KibanaRequest,
    {
      app,
      environment,
      rotateClientId,
    }: { app: string; environment: string; rotateClientId: boolean }
  ): Promise<RotateCredentialResponse> {
    const { repository } = this.deps;
    const references = await Promise.all([
      repository.get('app', definitionId('app', app)),
      repository.get('environment', definitionId('environment', environment)),
    ]);
    if (!references[0]) {
      throw notFoundError(`The app [${app}] does not exist.`);
    }
    if (!references[1]) {
      throw notFoundError(`The environment [${environment}] does not exist.`);
    }

    const id = credentialId(app, environment);
    const existing = await repository.get('credential', id);
    const sdkKey = generateSdkKey();
    const attributes: StoredCredentialAttributes = {
      app,
      environment,
      sdk_key_hash: hashSdkKey(sdkKey),
      sdk_key_hint: sdkKeyHint(sdkKey),
      client_id: existing && !rotateClientId ? existing.attributes.client_id : generateClientId(),
    };

    const stored = existing
      ? await repository.update('credential', id, attributes, { version: existing.version })
      : await repository.create('credential', id, attributes);

    await this.audit(request, stored, existing ? 'update' : 'create');
    return { credential: toCredential(stored), sdk_key: sdkKey };
  }

  public async delete(request: KibanaRequest, app: string, environment: string): Promise<void> {
    const deleted = await this.deps.repository.delete('credential', credentialId(app, environment));
    await this.audit(request, deleted, 'delete');
  }

  /**
   * Deletes the credentials of a deleted app or environment. Each one gets a change-history
   * entry; the user activity log already has the parent deletion.
   */
  public async deleteMatching(
    request: KibanaRequest,
    query: QueryDslQueryContainer
  ): Promise<number> {
    const credentials = await this.deps.repository.findAll('credential', query);
    for (const credential of credentials) {
      const deleted = await this.deps.repository.delete('credential', credential.id);
      await this.audit(request, deleted, 'delete', { cascaded: true });
    }
    return credentials.length;
  }

  private async audit(
    request: KibanaRequest,
    entity: StoredEntity<'credential'>,
    operation: AuditOperation,
    { cascaded = false }: { cascaded?: boolean } = {}
  ) {
    const { app, environment } = entity.attributes;
    const name = `${app} in ${environment}`;
    const messages = {
      create: `User created the credentials of app "${app}" in environment "${environment}" (id: ${entity.id}).`,
      update: `User rotated the SDK key of app "${app}" in environment "${environment}" (id: ${entity.id}).`,
      delete: `User deleted the credentials of app "${app}" in environment "${environment}" (id: ${entity.id}).`,
    };
    await this.deps.audit.record(request, {
      action: `feature_flag_credential_${operation}`,
      eventType: AUDIT_EVENT_TYPES[operation],
      dataset: 'apps',
      object: { type: AUDIT_OBJECT_TYPES.credential, id: entity.id, name },
      snapshot: {
        ...toSnapshot(toCredential(entity)),
        sdk_key_hash: entity.attributes.sdk_key_hash,
      },
      sequence: entity.revision,
      message: messages[operation],
      fieldsToRedact: CREDENTIAL_FIELDS_TO_REDACT,
      skipUserActivity: cascaded,
    });
  }
}
