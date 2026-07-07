/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import {
  API_VERSIONS,
  DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
  DETECTION_ENGINE_ATTACKS_SEARCH_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getSimpleAttackAlertsQuery } from '../../../unified_alerts/utils/queries';

const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';
const ADHOC_ATTACK_INDEX = `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`;

// Purpose-built docs so the cascade can be verified deterministically: an ad-hoc
// attack alert whose related alert ids reference a known detection alert.
const CASCADE_DETECTION_ALERT_ID = 'ftr-cascade-detection-alert-assignees';
const CASCADE_ADHOC_ATTACK_ID = 'ftr-cascade-adhoc-attack-assignees';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('@ess @serverless @skipInServerlessMKI Set Attacks Assignees', () => {
    const setAssignees = (body: Record<string, unknown>) =>
      supertest
        .post(DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send(body);

    const getAttackHits = async (ids?: string[]) => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send(ids === undefined ? getSimpleAttackAlertsQuery() : { ids })
        .expect(200);
      return body.hits.hits as Array<{ _id: string; _source: Record<string, unknown> }>;
    };

    const getDetectionAlertAssignees = async (id: string): Promise<string[]> => {
      const result = await es.get<Record<string, unknown>>({ index: DETECTION_ALERTS_INDEX, id });
      const assignees = result._source?.[ALERT_WORKFLOW_ASSIGNEE_IDS];
      return Array.isArray(assignees) ? (assignees as string[]) : [];
    };

    before(async () => {
      await es.index({
        index: DETECTION_ALERTS_INDEX,
        id: CASCADE_DETECTION_ALERT_ID,
        refresh: true,
        document: {
          [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        },
      });
      await es.index({
        index: ADHOC_ATTACK_INDEX,
        id: CASCADE_ADHOC_ATTACK_ID,
        refresh: true,
        document: {
          [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
          'kibana.alert.rule.rule_type_id': 'attack-discovery',
          [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: [CASCADE_DETECTION_ALERT_ID],
        },
      });
    });

    after(async () => {
      await es.deleteByQuery({
        index: [DETECTION_ALERTS_INDEX, ADHOC_ATTACK_INDEX],
        refresh: true,
        ignore_unavailable: true,
        query: { ids: { values: [CASCADE_DETECTION_ALERT_ID, CASCADE_ADHOC_ATTACK_ID] } },
      });
    });

    it('adds assignees to attack alerts', async () => {
      const [attack] = await getAttackHits();

      const { body } = await setAssignees({
        ids: [attack._id],
        assignees: { add: ['user1', 'user2'], remove: [] },
      }).expect(200);
      expect(body.updated).toBeGreaterThan(0);

      const [updated] = await getAttackHits([attack._id]);
      const assignees = updated._source[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[];
      expect(assignees).toContain('user1');
      expect(assignees).toContain('user2');
    });

    it('removes assignees from attack alerts', async () => {
      const [attack] = await getAttackHits();

      await setAssignees({
        ids: [attack._id],
        assignees: { add: ['user-to-remove'], remove: [] },
      }).expect(200);

      await setAssignees({
        ids: [attack._id],
        assignees: { add: [], remove: ['user-to-remove'] },
      }).expect(200);

      const [updated] = await getAttackHits([attack._id]);
      const assignees = (updated._source[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[]) || [];
      expect(assignees).not.toContain('user-to-remove');
    });

    it('adds assignees to an ad-hoc attack alert', async () => {
      await setAssignees({
        ids: [CASCADE_ADHOC_ATTACK_ID],
        assignees: { add: ['user1'], remove: [] },
      }).expect(200);

      const [updated] = await getAttackHits([CASCADE_ADHOC_ATTACK_ID]);
      const assignees = updated._source[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[];
      expect(assignees).toContain('user1');
    });

    it('cascades assignees to related detection alerts when update_related_alerts is true', async () => {
      await setAssignees({
        ids: [CASCADE_ADHOC_ATTACK_ID],
        assignees: { add: ['cascade-user'], remove: [] },
        update_related_alerts: true,
      }).expect(200);

      const [attack] = await getAttackHits([CASCADE_ADHOC_ATTACK_ID]);
      const attackAssignees = attack._source[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[];
      expect(attackAssignees).toContain('cascade-user');
      expect(await getDetectionAlertAssignees(CASCADE_DETECTION_ALERT_ID)).toContain(
        'cascade-user'
      );
    });

    it('does not touch related detection alerts when update_related_alerts is false', async () => {
      await es.update({
        index: DETECTION_ALERTS_INDEX,
        id: CASCADE_DETECTION_ALERT_ID,
        refresh: true,
        doc: { [ALERT_WORKFLOW_ASSIGNEE_IDS]: [] },
      });

      await setAssignees({
        ids: [CASCADE_ADHOC_ATTACK_ID],
        assignees: { add: ['no-cascade-user'], remove: [] },
      }).expect(200);

      expect(await getDetectionAlertAssignees(CASCADE_DETECTION_ALERT_ID)).toEqual([]);
    });

    it('silently filters unknown attack ids without failing', async () => {
      const [attack] = await getAttackHits();

      const { body } = await setAssignees({
        ids: [attack._id, 'this-attack-id-does-not-exist'],
        assignees: { add: ['user1'], remove: [] },
      }).expect(200);

      expect(body.updated).toBeGreaterThan(0);
    });

    it('rejects an empty ids array with a 400', async () => {
      await setAssignees({
        ids: [],
        assignees: { add: ['user1'], remove: [] },
      }).expect(400);
    });

    it('rejects duplicate assignees in add and remove with a 400', async () => {
      const [attack] = await getAttackHits();

      await setAssignees({
        ids: [attack._id],
        assignees: { add: ['user1'], remove: ['user1'] },
      }).expect(400);
    });
  });
};
