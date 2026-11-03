/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ATTACK_DISCOVERY_ALERTS_CONTEXT } from '@kbn/discoveries/impl/attack_discovery/alert_fields';
import type { AdhocAttackDiscoveryDataClient } from '../types';

/**
 * The ad-hoc Attack Discovery alerts index for a namespace, named as rule registry names it: its
 * `additionalPrefix` (`.adhoc`), the `.alerts` prefix, the registration context and the `alerts`
 * dataset, then the namespace (e.g. `.adhoc.alerts-security.attack.discovery.alerts-default`).
 */
export const getAdhocAttackDiscoveryIndex = (namespace: string): string =>
  `.adhoc.alerts-${ATTACK_DISCOVERY_ALERTS_CONTEXT}.alerts-${namespace}`;

/**
 * The same reads and writes as rule registry's data client for the ad-hoc index, as the internal
 * user, for a task pod (which has no rule registry). Kibana owns creating the index and installing
 * its mappings (it pre-creates the default space's and rule registry's writer creates the others),
 * so, unlike rule registry's writer, this one does not install a space's index: writing before
 * Kibana has created it fails with the `index_not_found` Elasticsearch returns for the alias.
 */
export const createPodAdhocAttackDiscoveryDataClient = (
  getEsClient: () => ElasticsearchClient
): AdhocAttackDiscoveryDataClient => ({
  indexNameWithNamespace: getAdhocAttackDiscoveryIndex,
  getReader: ({ namespace } = {}) => ({
    search: async (request) =>
      (await getEsClient().search({
        ...request,
        index: namespace ? getAdhocAttackDiscoveryIndex(namespace) : '.adhoc.alerts-*',
        ignore_unavailable: true,
        seq_no_primary_term: true,
      })) as never,
  }),
  getWriter: async ({ namespace } = {}) => ({
    bulk: async (request) =>
      getEsClient().bulk(
        {
          ...request,
          require_alias: true,
          index: getAdhocAttackDiscoveryIndex(namespace || 'default'),
        },
        { meta: true }
      ),
  }),
});
