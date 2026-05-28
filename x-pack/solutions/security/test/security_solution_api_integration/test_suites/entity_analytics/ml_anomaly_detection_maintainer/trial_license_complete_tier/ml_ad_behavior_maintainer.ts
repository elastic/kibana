/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { ML_AD_MAINTAINER_ID } from '@kbn/security-solution-plugin/server/lib/entity_analytics/maintainers/behaviors/ml_anomaly_detection/constants';
import type { EnrichedAnomalyRecord } from '@kbn/security-solution-plugin/server/lib/entity_analytics/maintainers/behaviors/ml_anomaly_detection/types';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils, entityMaintainerRouteHelpersFactory } from '../../utils';
import {
  CAROL_EUID,
  DAVID_EUID,
  WIN_APP01_EUID,
  NO_BEHAVIORS_EUID,
  entityTestData,
  sourceTestData,
  anomalyTestData,
} from './test_data';
const ML_AD_DETAILS_INDEX = '.entity_analytics.ml-ad-jobs-latest-default';
const ML_ANOMALIES_SHARED_INDEX = '.ml-anomalies-shared';
const ANOMALY_RECORD_IDS = [
  'pad_windows_rare_region_name_by_user_ea_record_1779192000000_3600_0_-103491946261268334286430206369177126287_17',
  'auth_high_count_logon_events_ea_record_1777427100000_900_0_0_0',
  'suspicious_login_activity_ea_record_1777083300000_900_0_104569967308362299912281918639174079753_9',
  'suspicious_login_activity_ea_record_1777356900000_900_0_104569967308362299912281918639174079753_9',
] as const;

const SOURCE_EVENTS_INDEX = 'logs-windows.forwarded-default';
// event.id values from the _source of each indexed document, used for cleanup.
// Data streams require create op (no custom _id), so we query by event.id instead.
const SOURCE_EVENT_IDS = [
  'd2685f7931f5f3342d880ec6ec4baead',
  '3031bc1254221f26becaa73bd21ac896',
  '2d5fbc9035d1dcf0d5de7953816a6917',
  'e63b940bdfa5e3c3fa50d64c0fa20f74',
  'a67c1cdba9fc464eeda82b3be8c76bd0',
  '6f3e5ebd761122f0b84e9715d3245249',
  'af81324cd04fc9da86d73eb2894686ba',
  'b4426372197998c4c478d9eba61b39fb',
  '57bba5329f1a94973097820353a88510',
  '9c5ded8fb51546bf177774bd13ffd4ab',
  'ddde87de74716c395daecd1eb17da9da',
  '1e37d58e392741e66f25a039923e77e5',
] as const;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const entityStoreUtils = EntityStoreUtils(getService);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);
  const LATEST_ALIAS = getEntitiesAlias(ENTITY_LATEST, 'default');

  const cleanUp = async () => {
    await entityStoreUtils.cleanEngines();
    await es.indices
      .delete({ index: ML_ANOMALIES_SHARED_INDEX, ignore_unavailable: true })
      .catch(() => {});
    await es.indices
      .delete({ index: ML_AD_DETAILS_INDEX, ignore_unavailable: true })
      .catch(() => {});
  };

  const setupADJobs = async () => {
    let agentPolicyId = '';
    let packagePolicyId = '';

    // Install privileged access detection integration to create the necessary ML job and anomaly index for the maintainer to process anomalies and enrich entity documents with anomaly information.
    log.debug(`Setting up agent policy for PAD integration...`);
    const agentPolicyResponse = await supertest
      .post('/api/fleet/agent_policies?sys_monitoring=true')
      .set('kbn-xsrf', 'true')
      .send({
        name: 'Agent policy 1',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics', 'traces'],
        inactivity_timeout: 1209600,
        is_protected: false,
      })
      .expect(200);

    agentPolicyId = agentPolicyResponse.body.item.id;

    log.debug(`Setting up package policy for PAD integration...`);
    const packagePolicyResponse = await supertest
      .post('/api/fleet/package_policies')
      .set('kbn-xsrf', 'true')
      .send({
        policy_ids: [agentPolicyId],
        package: { name: 'pad', version: '2.1.0' },
        name: 'pad-1',
        description: '',
        namespace: '',
        inputs: {},
      })
      .expect(200);

    packagePolicyId = packagePolicyResponse.body.item.id;

    const startMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Create the PAD ML jobs. Best-effort: the module may not be available in all
    // environments (e.g. serverless), but job IDs are resolved from disk manifests so
    // the maintainer will still process anomaly records even without live ML jobs.
    log.debug(`Setting up PAD ML jobs...`);
    await supertest
      .post('/internal/ml/modules/setup/pad-ml')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '1')
      .send({
        prefix: '',
        groups: ['security', 'ftr'],
        indexPatternName: 'logs-*',
        useDedicatedIndex: false,
        startDatafeed: true,
        start: startMs,
      })
      .expect(200);

    // Create the Security: Authentication ML jobs
    log.debug(`Setting up Security: Authentication ML jobs...`);
    await supertest
      .post('/internal/ml/modules/setup/security_auth')
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({
        prefix: '',
        groups: ['security', 'authentication', 'ftr'],
        indexPatternName: 'logs-*',
        useDedicatedIndex: false,
        startDatafeed: true,
        start: startMs,
      })
      .expect(200);

    return { agentPolicyId, packagePolicyId };
  };

  const indexTestData = async () => {
    // Index some entities
    // 1 user entity with 2 anomaly records of different job IDs
    // 1 user entity with 1 anomaly record
    // 1 host entity with 2 anomaly records of the same job ID
    log.debug(`Indexing test entities...`);
    const resp1 = await es.bulk({
      operations: entityTestData.flatMap((data) => [
        { index: { _index: LATEST_ALIAS, _id: hashEuid(data.entity.id) } },
        data,
      ]),
      refresh: true,
    });
    log.debug(`Indexed test entities with response: ${JSON.stringify(resp1)}`);

    // Index source events that determine baseline behavior
    log.debug(`Indexing test source events...`);
    const sourceData = sourceTestData();
    const resp2 = await es.bulk({
      operations: sourceData.flatMap((data) => [{ create: { _index: SOURCE_EVENTS_INDEX } }, data]),
      refresh: true,
    });
    log.debug(`Indexed test source events with response: ${JSON.stringify(resp2)}`);

    // Index anomaly records
    log.debug(`Indexing test anomaly records...`);
    const anomalyData = anomalyTestData();
    const resp3 = await es.bulk({
      operations: anomalyData.flatMap(({ _id, ...data }) => [
        { index: { _index: ML_ANOMALIES_SHARED_INDEX, _id } },
        data,
      ]),
      refresh: true,
    });
    log.debug(`Indexed test anomaly records with response: ${JSON.stringify(resp3)}`);
  };

  describe('@ess @serverless ML Anomaly Detection Behavior Maintainer', function () {
    before(async () => {
      await cleanUp();
      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['user', 'host'],
        waitForEntities: false,
      });
    });

    after(async () => {
      await cleanUp();
    });

    describe('maintainer registration', () => {
      it('should be registered and started after entity store install', async () => {
        await retry.waitForWithTimeout(
          `ML AD behavior maintainer "${ML_AD_MAINTAINER_ID}" to be started`,
          60_000,
          async () => {
            const response = await maintainerRoutes.getMaintainers(200, [ML_AD_MAINTAINER_ID]);
            const maintainer = response.body.maintainers.find(
              (m: { id: string }) => m.id === ML_AD_MAINTAINER_ID
            );
            return (
              maintainer != null &&
              typeof maintainer.taskStatus === 'string' &&
              maintainer.taskStatus.toLowerCase() === 'started'
            );
          }
        );
      });
    });

    context('with test anomaly data', () => {
      let agentPolicyId = '';
      let packagePolicyId = '';

      before(async () => {
        // Wait for any TM auto-run to complete so we don't race with stop.
        // Interval is 1d so once nextRunAt is in the future, TM won't re-run.
        await retry.waitForWithTimeout(
          `ML AD behavior maintainer to settle before data setup`,
          60_000,
          async () => {
            const response = await maintainerRoutes.getMaintainers(200, [ML_AD_MAINTAINER_ID]);
            const maintainer = response.body.maintainers.find(
              (m: { id: string }) => m.id === ML_AD_MAINTAINER_ID
            );
            if (!maintainer) return false;
            const nextRunAt = (maintainer as { nextRunAt?: string | null }).nextRunAt;
            return nextRunAt != null && new Date(nextRunAt).getTime() > Date.now();
          }
        );

        // Set a low anomaly score threshold to ensure the test records are included in results.
        await kibanaServer.uiSettings.update({ 'securitySolution:defaultAnomalyScore': 1 });

        // Install PAD and Security Authentication ML jobs
        const result = await setupADJobs();
        agentPolicyId = result.agentPolicyId;
        packagePolicyId = result.packagePolicyId;

        // Index test data
        await indexTestData();

        // Manually trigger the maintainer to process the test data immediately
        log.debug(`Triggering ML AD behavior maintainer to process test data...`);
        await maintainerRoutes.runMaintainerSync(ML_AD_MAINTAINER_ID);
      });

      after(async () => {
        // reset the anomaly score threshold
        await kibanaServer.uiSettings.update({ 'securitySolution:defaultAnomalyScore': 50 });

        // clean up integrations and ML jobs
        if (packagePolicyId) {
          log.debug(`Deleting test package policy with ID ${packagePolicyId}...`);
          await supertest
            .post('/api/fleet/package_policies/delete')
            .set('kbn-xsrf', 'true')
            .send({ packagePolicyIds: [packagePolicyId] })
            .expect(200);
        }

        if (agentPolicyId) {
          log.debug(`Deleting test agent policy with ID ${agentPolicyId}...`);
          await supertest
            .post('/api/fleet/agent_policies/delete')
            .set('kbn-xsrf', 'true')
            .send({ agentPolicyId })
            .expect(200);
        }

        log.debug(`Deleting ML jobs...`);
        const { jobs } = await es.ml.getJobs({ job_id: '*' });
        await Promise.all(
          jobs
            .filter((j) => j.groups?.some((g) => ['ftr'].includes(g)))
            .map((j) => es.ml.deleteJob({ job_id: j.job_id, force: true }).catch(() => {}))
        );

        log.debug(`Cleaning up test data from indices...`);
        await es.bulk({
          operations: [
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(CAROL_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(DAVID_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(WIN_APP01_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(NO_BEHAVIORS_EUID) } },
          ],
          refresh: true,
        });

        log.debug(`Deleting test source events...`);
        await es.deleteByQuery({
          index: SOURCE_EVENTS_INDEX,
          query: { terms: { 'event.id': SOURCE_EVENT_IDS as unknown as string[] } },
          refresh: true,
        });

        log.debug(`Deleting test anomaly records...`);
        await es.deleteByQuery({
          index: ML_ANOMALIES_SHARED_INDEX,
          query: { ids: { values: ANOMALY_RECORD_IDS as unknown as string[] } },
          refresh: true,
        });
      });

      it('should update entity store document with anomaly job IDs', async () => {
        const response = await es.search({
          index: LATEST_ALIAS,
          query: {
            terms: {
              'entity.id': [CAROL_EUID, DAVID_EUID, WIN_APP01_EUID, NO_BEHAVIORS_EUID],
            },
          },
        });

        const getEntityWithId = (euid: string) =>
          response.hits.hits.find((hit) => hit._id === hashEuid(euid))?._source as
            | Entity
            | undefined;

        const carolEntity = getEntityWithId(CAROL_EUID);
        expect(carolEntity).toBeDefined();
        const carolAnomalyJobIds = carolEntity?.entity?.behaviors?.anomaly_job_ids;
        expect(Array.isArray(carolAnomalyJobIds)).toBe(true);
        expect(carolAnomalyJobIds?.length).toBe(2);
        expect(carolAnomalyJobIds?.includes('pad_windows_rare_region_name_by_user_ea')).toBe(true);
        expect(carolAnomalyJobIds?.includes('auth_high_count_logon_events_ea')).toBe(true);

        const davidEntity = getEntityWithId(DAVID_EUID);
        expect(davidEntity).toBeDefined();
        const davidAnomalyJobIds = davidEntity?.entity?.behaviors?.anomaly_job_ids;
        expect(Array.isArray(davidAnomalyJobIds)).toBe(true);
        expect(davidAnomalyJobIds?.length).toBe(1);
        expect(davidAnomalyJobIds?.includes('suspicious_login_activity_ea')).toBe(true);

        const winApp01Entity = getEntityWithId(WIN_APP01_EUID);
        expect(winApp01Entity).toBeDefined();
        const winApp01AnomalyJobIds = winApp01Entity?.entity?.behaviors?.anomaly_job_ids;
        expect(Array.isArray(winApp01AnomalyJobIds)).toBe(true);
        expect(winApp01AnomalyJobIds?.length).toBe(1);
        expect(winApp01AnomalyJobIds?.includes('suspicious_login_activity_ea')).toBe(true);

        const noBehaviorsEntity = getEntityWithId(NO_BEHAVIORS_EUID);
        expect(noBehaviorsEntity).toBeDefined();
        expect(noBehaviorsEntity?.entity?.behaviors?.anomaly_job_ids).toBeUndefined();
      });

      it('should create a details index entry with anomaly information', async () => {
        await es.indices.refresh({ index: ML_AD_DETAILS_INDEX });
        const response = await es.search<EnrichedAnomalyRecord>({
          index: ML_AD_DETAILS_INDEX,
          query: {
            terms: {
              'entity.id': [CAROL_EUID, DAVID_EUID, WIN_APP01_EUID, NO_BEHAVIORS_EUID],
            },
          },
        });

        const getDocumentsForEntity = (euid: string) =>
          response.hits.hits
            .filter((hit) => hit?._source?.entity?.id === euid)
            .map((hit) => hit._source as EnrichedAnomalyRecord);

        const carolDetails = getDocumentsForEntity(CAROL_EUID);
        expect(carolDetails.length).toBe(2);

        const carolAnomaly1 = carolDetails.find(
          (d) => d.anomaly.job_id === 'auth_high_count_logon_events_ea'
        );
        expect(carolAnomaly1).toBeDefined();
        expect(carolAnomaly1?.baseline?.length).toBe(1);
        expect(carolAnomaly1?.baseline?.[0]?.value).toBe('');
        expect(carolAnomaly1?.baseline?.[0]?.top_hits?.length).toBe(3);

        const carolAnomaly2 = carolDetails.find(
          (d) => d.anomaly.job_id === 'pad_windows_rare_region_name_by_user_ea'
        );
        expect(carolAnomaly2).toBeDefined();
        expect(carolAnomaly2?.baseline?.length).toBe(1);
        expect(carolAnomaly2?.baseline?.[0]?.value).toBe('New York');
        expect(carolAnomaly2?.baseline?.[0]?.top_hits?.length).toBe(3);

        const davidDetails = getDocumentsForEntity(DAVID_EUID);
        expect(davidDetails.length).toBe(1);

        const davidAnomaly = davidDetails.find(
          (d) => d.anomaly.job_id === 'suspicious_login_activity_ea'
        );
        expect(davidAnomaly).toBeDefined();
        expect(davidAnomaly?.baseline?.length).toBe(1);
        expect(davidAnomaly?.baseline?.[0]?.value).toBe('');
        expect(davidAnomaly?.baseline?.[0]?.top_hits?.length).toBe(3);

        const winApp01Details = getDocumentsForEntity(WIN_APP01_EUID);
        expect(winApp01Details.length).toBe(2);
        const winApp01Anomalies = winApp01Details.filter(
          (d) => d.anomaly.job_id === 'suspicious_login_activity_ea'
        );
        expect(winApp01Anomalies.length).toBe(2);
        expect(winApp01Anomalies[0]?.baseline?.length).toBe(1);
        expect(winApp01Anomalies[0]?.baseline?.[0]?.value).toBe('');
        expect(winApp01Anomalies[0]?.baseline?.[0]?.top_hits?.length).toBe(3);
        expect(winApp01Anomalies[1]?.baseline?.length).toBe(1);
        expect(winApp01Anomalies[1]?.baseline?.[0]?.value).toBe('');
        expect(winApp01Anomalies[1]?.baseline?.[0]?.top_hits?.length).toBe(3);

        const noBehaviorsDetails = getDocumentsForEntity(NO_BEHAVIORS_EUID);
        expect(noBehaviorsDetails.length).toBe(0);
      });
    });
  });
};
