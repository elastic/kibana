/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChangeHistoryFieldsToMask,
  GetChangeHistoryOptions,
  GetHistoryResult,
} from '@kbn/change-history';
import { ChangeHistoryClient } from '@kbn/change-history';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
  UserProfileServiceStart,
} from '@kbn/core/server';
import type {
  UserActivityActionId,
  UserActivityServiceStart,
} from '@kbn/core-user-activity-server';

export const CHANGE_HISTORY_MODULE = 'featureFlags';
/** Feature flags are global, so their history is always recorded in the default space. */
export const CHANGE_HISTORY_SPACE_ID = 'default';

export type AuditDataset = 'flags' | 'apps' | 'environments';
const DATASETS: readonly AuditDataset[] = ['flags', 'apps', 'environments'];

export const AUDIT_OBJECT_TYPES = {
  flag: 'feature_flag',
  app: 'feature_flag_app',
  environment: 'feature_flag_environment',
  credential: 'feature_flag_credential',
} as const;

export type AuditObjectType = (typeof AUDIT_OBJECT_TYPES)[keyof typeof AUDIT_OBJECT_TYPES];

export type AuditOperation = 'create' | 'update' | 'delete';

export const AUDIT_EVENT_TYPES = {
  create: 'creation',
  update: 'change',
  delete: 'deletion',
} as const satisfies Record<AuditOperation, AuditEvent['eventType']>;

export interface AuditEvent {
  action: UserActivityActionId;
  eventType: 'creation' | 'change' | 'deletion';
  dataset: AuditDataset;
  object: { type: AuditObjectType; id: string; name: string; tags?: string[] };
  /** The object after the change; for deletions, its last state. */
  snapshot: Record<string, unknown>;
  /** The object's `revision`, so history stays ordered regardless of clock skew. */
  sequence?: number;
  message: string;
  fieldsToRedact?: ChangeHistoryFieldsToMask;
  /** Only record change history, for changes cascaded from another user action. */
  skipUserActivity?: boolean;
}

interface AuditServiceStartDeps {
  esClient: ElasticsearchClient;
  security: SecurityServiceStart;
  userProfile: UserProfileServiceStart;
  userActivity: UserActivityServiceStart;
}

/**
 * Records every change twice: in `@kbn/change-history` (the object's snapshot, queried by
 * the flag history API) and in Core's user activity log (who did what).
 */
export class AuditService {
  private readonly logger: Logger;
  private readonly clients: Record<AuditDataset, ChangeHistoryClient>;
  private deps?: AuditServiceStartDeps;

  constructor(logger: Logger, kibanaVersion: string) {
    this.logger = logger.get('audit');
    this.clients = Object.fromEntries(
      DATASETS.map((dataset) => [
        dataset,
        new ChangeHistoryClient({
          module: CHANGE_HISTORY_MODULE,
          dataset,
          logger: this.logger,
          kibanaVersion,
        }),
      ])
    ) as Record<AuditDataset, ChangeHistoryClient>;
  }

  public async start(deps: AuditServiceStartDeps): Promise<void> {
    this.deps = deps;
    await Promise.all(
      DATASETS.map((dataset) =>
        this.clients[dataset]
          .initialize(deps.esClient, { userProfileService: deps.userProfile })
          .catch((error) => {
            this.logger.error(
              `Unable to initialize change history for [${CHANGE_HISTORY_MODULE}, ${dataset}]: ${error.message}`
            );
          })
      )
    );
  }

  public async record(request: KibanaRequest, event: AuditEvent): Promise<void> {
    const deps = this.getDeps();

    if (!event.skipUserActivity) {
      deps.userActivity.trackUserAction({
        message: event.message,
        event: { action: event.action, type: [event.eventType], outcome: 'success' },
        object: {
          id: event.object.id,
          name: event.object.name,
          type: event.object.type,
          tags: event.object.tags ?? [],
        },
      });
    }

    const client = this.clients[event.dataset];
    if (!client.isInitialized()) {
      this.logger.warn(`Change history is not available; not recording [${event.action}].`);
      return;
    }

    const user = deps.security.authc.getCurrentUser(request);
    try {
      await client.log(
        {
          objectType: event.object.type,
          objectId: event.object.id,
          sequence: event.sequence,
          snapshot: event.snapshot,
        },
        {
          action: event.action,
          username: user?.username ?? '',
          userProfileId: user?.profile_uid,
          spaceId: CHANGE_HISTORY_SPACE_ID,
          data: { event: { type: event.eventType } },
          fieldsToRedact: event.fieldsToRedact,
        }
      );
    } catch (error) {
      // The primary write already succeeded; a missing history entry must not fail the request.
      this.logger.error(`Unable to record change history for [${event.action}]: ${error.message}`);
    }
  }

  public async getHistory(
    dataset: AuditDataset,
    objectType: AuditObjectType,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult> {
    const client = this.clients[dataset];
    if (!client.isInitialized()) {
      return { total: 0, items: [] };
    }
    return client.getHistory(CHANGE_HISTORY_SPACE_ID, objectType, objectId, opts);
  }

  private getDeps(): AuditServiceStartDeps {
    if (!this.deps) {
      throw new Error('AuditService used before start()');
    }
    return this.deps;
  }
}
