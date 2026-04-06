/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '@kbn/security-solution-plugin/common/constants';
import {
  encodeFindRulesWithFacetsCursor,
  FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
  MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  updateUsername,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  const findRulesWithFacets = (query: Record<string, unknown>) =>
    supertest
      .get(DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .query(query);

  describe('@ess @serverless @skipInServerlessMKI find_rules_with_facets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('returns an empty page when no rules exist', async () => {
      const { body } = await findRulesWithFacets({}).expect(200);
      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('returns rules with the same shape as classic _find for a simple rule', async () => {
      await createRule(supertest, log, getSimpleRule());
      const { body } = await findRulesWithFacets({}).expect(200);
      expect(body.total).to.be(1);
      expect(body.page).to.be(1);
      expect(body.perPage).to.be(20);
      expect(body.data).to.have.length(1);
      const stripped = removeServerGeneratedProperties(body.data[0]);
      const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());
      expect(stripped).to.eql(expectedRule);
    });

    it('filters with KQL and intersects legacy search', async () => {
      await createRule(supertest, log, getSimpleRule('facets-kql-search', true));
      const { body } = await findRulesWithFacets({
        filter: 'alert.attributes.enabled: true',
        search: { term: 'Simple', mode: 'legacy' },
      }).expect(200);
      expect(body.total).to.be(1);
    });

    it('returns facet counts when include_counts is set', async () => {
      await createRule(supertest, log, getSimpleRule());
      const { body } = await findRulesWithFacets({
        include_counts: ['enabled'],
      }).expect(200);
      expect(body.total).to.be(1);
      expect(body.counts).to.be.an('object');
      expect(body.counts.enabled).to.be.an('object');
      const enabledBuckets = body.counts.enabled as Record<string, number>;
      expect(Object.keys(enabledBuckets).length).to.be.greaterThan(0);
    });

    it('accepts sort tokens', async () => {
      await createRule(supertest, log, getSimpleRule());
      const { body } = await findRulesWithFacets({
        sort: ['name:desc'],
      }).expect(200);
      expect(body.total).to.be(1);
    });

    it('returns 400 for invalid KQL filter', async () => {
      const { body } = await findRulesWithFacets({
        filter: 'alert.attributes.name: (',
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect((body.message as string[]).some((m) => m.includes('invalid KQL filter'))).to.be(true);
    });

    it('returns 400 for unsupported sort field in facet sort syntax', async () => {
      const { body } = await findRulesWithFacets({
        sort: ['not_a_supported_field:asc'],
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect((body.message as string[]).some((m) => m.includes('unsupported sort field'))).to.be(
        true
      );
    });

    it('returns 400 when cursor cannot be decoded', async () => {
      const { body } = await findRulesWithFacets({
        cursor: 'not-valid-cursor-payload',
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(String(body.message).toLowerCase()).to.contain('cursor');
    });

    it('returns 400 when cursor is provided without sort', async () => {
      const cursor = encodeFindRulesWithFacetsCursor({
        v: FIND_RULES_WITH_FACETS_CURSOR_SCHEMA_VERSION,
        searchAfter: ['nonsense-sort-token'],
      });
      const { body } = await findRulesWithFacets({
        cursor,
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(String(body.message)).to.contain('cursor requires sort');
    });

    it('returns 400 when search.term exceeds max length', async () => {
      const { body } = await findRulesWithFacets({
        search: { term: 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH + 1) },
      }).expect(400);
      const status = body.status_code ?? body.statusCode;
      expect(status).to.be(400);
      const messageText = Array.isArray(body.message)
        ? body.message.join(' ')
        : String(body.message);
      expect(messageText).to.match(/search\.term/i);
      expect(messageText.toLowerCase()).to.contain('length');
    });
  });
};
