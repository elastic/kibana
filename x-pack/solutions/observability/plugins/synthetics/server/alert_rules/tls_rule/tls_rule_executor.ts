/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { TLSRuleInspect } from '../../../common/runtime_types/alert_rules/common';
import { FINAL_SUMMARY_FILTER } from '../../../common/constants/client_defaults';
import { formatFilterString } from '../common';
import { SyntheticsServerSetup } from '../../types';
import { getSyntheticsCerts } from '../../queries/get_certs';
import { savedObjectsAdapter } from '../../saved_objects';
import { DYNAMIC_SETTINGS_DEFAULTS, SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import {
  CertResult,
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  Ping,
} from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { SyntheticsEsClient } from '../../lib';
import { queryFilterMonitors } from '../status_rule/queries/filter_monitors';
import { parseArrayFilters, parseLocationFilter } from '../../routes/common';

export class TLSRuleExecutor {
  previousStartedAt: Date | null;
  params: TLSRuleParams;
  esClient: SyntheticsEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
  logger: Logger;
  spaceId: string;
  ruleName: string;

  constructor(
    previousStartedAt: Date | null,
    p: TLSRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient,
    spaceId: string,
    ruleName: string
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new SyntheticsEsClient(this.soClient, scopedClient, {
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.logger = server.logger;
    this.spaceId = spaceId;
    this.ruleName = ruleName;
  }

  debug(message: string) {
    this.logger.debug(`[TLS Rule Executor][${this.ruleName}] ${message}`);
  }

  async getMonitors() {
    const HTTP_OR_TCP = `${monitorAttributes}.${ConfigKey.MONITOR_TYPE}: http or ${monitorAttributes}.${ConfigKey.MONITOR_TYPE}: tcp`;

    const baseFilter = `${monitorAttributes}.${AlertConfigKey.TLS_ENABLED}: true and (${HTTP_OR_TCP})`;

    const configIds = await queryFilterMonitors({
      spaceId: this.spaceId,
      esClient: this.esClient,
      ruleParams: this.params,
    });

    if (this.params.kqlQuery && isEmpty(configIds)) {
      this.debug(`No monitor found with the given KQL query ${this.params.kqlQuery}`);
      return processMonitors([]);
    }

    const locationIds = await parseLocationFilter(
      {
        savedObjectsClient: this.soClient,
        server: this.server,
        syntheticsMonitorClient: this.syntheticsMonitorClient,
      },
      this.params.locations
    );

    const { filtersStr } = parseArrayFilters({
      configIds,
      filter: baseFilter,
      tags: this.params?.tags,
      locations: locationIds,
      monitorTypes: this.params?.monitorTypes,
      monitorQueryIds: this.params?.monitorIds,
      projects: this.params?.projects,
    });

    this.monitors = await getAllMonitors({
      filter: filtersStr,
      soClient: this.soClient,
    });

    this.debug(
      `Found ${this.monitors.length} monitors for params ${JSON.stringify(
        this.params
      )} | parsed location filter is ${JSON.stringify(locationIds)} `
    );

    const {
      allIds,
      enabledMonitorQueryIds,
      monitorLocationIds,
      monitorLocationsMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = processMonitors(this.monitors);

    return {
      enabledMonitorQueryIds,
      monitorLocationIds,
      allIds,
      monitorLocationsMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    };
  }

  async getExpiredCertificates() {
    const { enabledMonitorQueryIds } = await this.getMonitors();

    const dynamicSettings = await savedObjectsAdapter.getSyntheticsDynamicSettings(this.soClient);

    const expiryThreshold =
      this.params.certExpirationThreshold ??
      dynamicSettings?.certExpirationThreshold ??
      DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold;

    const ageThreshold =
      this.params.certAgeThreshold ??
      dynamicSettings?.certAgeThreshold ??
      DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold;

    const absoluteExpirationThreshold = moment().add(expiryThreshold, 'd').valueOf();
    const absoluteAgeThreshold = moment().subtract(ageThreshold, 'd').valueOf();

    if (enabledMonitorQueryIds.length === 0) {
      return {
        latestPings: [],
        certs: [],
        total: 0,
        foundCerts: false,
        expiryThreshold,
        ageThreshold,
        absoluteExpirationThreshold,
        absoluteAgeThreshold,
      };
    }

    let filters: QueryDslQueryContainer | undefined;

    if (this.params.search) {
      filters = await formatFilterString(this.esClient, undefined, this.params.search);
    }

    const { certs, total }: CertResult = await getSyntheticsCerts({
      syntheticsEsClient: this.esClient,
      pageIndex: 0,
      size: 1000,
      notValidAfter: `now+${expiryThreshold}d`,
      notValidBefore: `now-${ageThreshold}d`,
      sortBy: 'common_name',
      direction: 'desc',
      filters,
      monitorIds: enabledMonitorQueryIds,
    });

    this.debug(
      `Found ${certs.length} certificates: ` + certs.map((cert) => cert.sha256).join(', ')
    );

    const latestPings = await this.getLatestPingsForMonitors(certs);

    const foundCerts = total > 0;

    return {
      latestPings,
      foundCerts,
      total,
      expiryThreshold,
      ageThreshold,
      absoluteExpirationThreshold,
      absoluteAgeThreshold,
      certs: this.filterOutResolvedCerts(certs, latestPings),
    };
  }

  filterOutResolvedCerts(certs: CertResult['certs'], latestPings: TLSLatestPing[]) {
    const latestPingsMap = new Map<string, TLSLatestPing>();
    latestPings.forEach((ping) => {
      latestPingsMap.set(ping.config_id!, ping);
    });
    return certs.filter((cert) => {
      const lPing = latestPingsMap.get(cert.configId);
      if (!lPing) {
        return true;
      }
      return moment(lPing['@timestamp']).isBefore(cert['@timestamp']);
    });
  }
  async getLatestPingsForMonitors(certs: CertResult['certs']) {
    if (certs.length === 0) {
      return [];
    }
    const configIds = certs.map((cert) => cert.configId);
    const certIds = certs.map((cert) => cert.sha256);
    const { body } = await this.esClient.search({
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1d',
                    lt: 'now',
                  },
                },
              },
              {
                terms: {
                  config_id: configIds,
                },
              },
              FINAL_SUMMARY_FILTER,
            ],
            must_not: {
              bool: {
                filter: [
                  {
                    terms: {
                      'tls.server.hash.sha256': certIds,
                    },
                  },
                ],
              },
            },
          },
        },
        collapse: {
          field: 'config_id',
        },
        _source: ['@timestamp', 'monitor', 'url', 'config_id', 'tls'],
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      },
    });

    return body.hits.hits.map((hit) => hit._source as TLSLatestPing);
  }
  getRuleThresholdOverview = async (): Promise<TLSRuleInspect> => {
    await this.getMonitors();
    return {
      monitors: this.monitors.map((monitor) => ({
        id: monitor.id,
        name: monitor.attributes.name,
        type: monitor.attributes.type,
      })),
    } as TLSRuleInspect; // The returned object is cast to TLSRuleInspect because the AlertOverviewStatus is not included. The AlertOverviewStatus is probably not used in the frontend, we should check if it is still needed
  };
}

export type TLSLatestPing = Pick<Ping, '@timestamp' | 'monitor' | 'url' | 'tls' | 'config_id'>;
