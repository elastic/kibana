/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WATCHLISTS_PREBUILT_INSTALL_URL,
  getPrivilegedUserWatchlistSavedObjectId,
} from '@kbn/security-solution-plugin/common/entity_analytics/watchlists/constants';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

/** Saved-object id of the prebuilt "Privileged Users" watchlist in the default space. */
export const PRIVILEGED_USER_WATCHLIST_ID = getPrivilegedUserWatchlistSavedObjectId('default');

/**
 * These mirror the real Okta integration's data-stream names (see
 * `entity_sources/infra/constants.ts`'s `STREAM_INDEX_PATTERNS`/`oktaLastFullSyncMarkersIndex`).
 */
export const OKTA_USER_INDEX = 'logs-entityanalytics_okta.user-default';
export const OKTA_FULL_SYNC_MARKER_INDEX = 'logs-entityanalytics_okta.entity-default';

export const IntegrationSourceUtils = (getService: FtrProviderContext['getService']) => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');

  /**
   * Ensures the prebuilt "Privileged Users" watchlist exists, with its `okta` integration
   * source carrying the role-based `queryRule`
   */
  const installPrebuiltWatchlists = async () => {
    await supertest
      .post(WATCHLISTS_PREBUILT_INSTALL_URL)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .expect(200);
  };

  const createOktaIndices = async () => {
    await es.indices.createDataStream({ name: OKTA_USER_INDEX });
    await es.indices.createDataStream({ name: OKTA_FULL_SYNC_MARKER_INDEX });
  };

  const deleteOktaIndices = async () => {
    for (const name of [OKTA_USER_INDEX, OKTA_FULL_SYNC_MARKER_INDEX]) {
      await es.indices.deleteDataStream({ name }, { ignore: [404] }).catch((err) => {
        log.error(`Error deleting data stream ${name}: ${err}`);
      });
    }
  };

  /**
   * Writes Okta user documents. `event.kind: 'asset'` + `event.module: 'entityanalytics_okta'`
   * is what the entity store's built-in `user` definition uses to both derive `entity.namespace = 'okta'`
   */
  const addOktaUsers = async (
    users: Array<{ email: string; roles: string[] }>,
    timestamp?: string
  ) => {
    const ts = timestamp ?? new Date().toISOString();
    const tsEarlier = new Date(new Date(ts).getTime() - 1000).toISOString();
    const ops = users.flatMap(({ email, roles }) =>
      [ts, tsEarlier].flatMap((docTs) => [
        { create: {} },
        {
          '@timestamp': docTs,
          event: { kind: 'asset', module: 'entityanalytics_okta' },
          user: { email, roles },
        },
      ])
    );
    await es.bulk({ index: OKTA_USER_INDEX, body: ops, refresh: true });
  };

  const markFullSyncCompleted = async (timestamp?: string) => {
    // Data streams only accept `create` writes, not the default `index` op.
    await es.index({
      index: OKTA_FULL_SYNC_MARKER_INDEX,
      op_type: 'create',
      refresh: true,
      document: {
        '@timestamp': timestamp ?? new Date().toISOString(),
        event: { action: 'completed' },
      },
    });
  };

  return {
    installPrebuiltWatchlists,
    createOktaIndices,
    deleteOktaIndices,
    addOktaUsers,
    markFullSyncCompleted,
  };
};

/** The EUID update detection computes for an Okta-sourced user — see `addOktaUsers`'s docstring. */
export const oktaEuid = (email: string) => `user:${email}@okta`;
