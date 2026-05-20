/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { BOOTSTRAP_EASE_RULES_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import { INITIALIZE_SECURITY_SOLUTION_URL } from '@kbn/security-solution-plugin/common/api/initialization';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const bootstrapEaseRules = (roleAuthc: RoleCredentials, internalHeaders: InternalRequestHeader) =>
    supertestWithoutAuth
      .post(BOOTSTRAP_EASE_RULES_URL)
      .set(roleAuthc.apiKeyHeader)
      .set(internalHeaders)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1');

  const initPrebuiltRulesPackage = (
    roleAuthc: RoleCredentials,
    internalHeaders: InternalRequestHeader
  ) =>
    supertestWithoutAuth
      .post(INITIALIZE_SECURITY_SOLUTION_URL)
      .set(roleAuthc.apiKeyHeader)
      .set(internalHeaders)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .send({ flows: ['init-prebuilt-rules'] });

  // Uses soc_manager and t1_analyst as proxies for _search_ai_lake_soc_manager
  // and _search_ai_lake_analyst respectively, because the FTR samlAuth provider
  // does not yet support tier-specific roles (search_ai_lake).
  // See: src/platform/packages/shared/kbn-ftr-common-functional-services/services/saml_auth/serverless/auth_provider.ts
  describe('@serverless Bootstrap EASE Rules', () => {
    describe('with a role that has RULES_API_ALL privilege (soc_manager)', () => {
      let roleAuthc: RoleCredentials;
      let internalHeaders: InternalRequestHeader;

      before(async () => {
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('soc_manager');
        internalHeaders = samlAuth.getInternalRequestHeader();

        // Install prebuilt rules package first (required for promotion rules)
        await initPrebuiltRulesPackage(roleAuthc, internalHeaders).expect(200);
      });

      after(async () => {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns a valid response with rule bootstrap results', async () => {
        const { body } = await bootstrapEaseRules(roleAuthc, internalHeaders).expect(200);

        expect(body).toMatchObject({
          total: expect.any(Number),
          installed: expect.any(Number),
          updated: expect.any(Number),
          deleted: expect.any(Number),
          skipped: expect.any(Number),
          errors: expect.any(Array),
        });
      });

      it('is idempotent — calling it twice does not produce errors', async () => {
        await bootstrapEaseRules(roleAuthc, internalHeaders).expect(200);

        const { body } = await bootstrapEaseRules(roleAuthc, internalHeaders).expect(200);

        expect(body.errors).toEqual([]);
      });
    });

    describe('with a role that lacks RULES_API_ALL privilege (t1_analyst)', () => {
      let roleAuthc: RoleCredentials;
      let internalHeaders: InternalRequestHeader;

      before(async () => {
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('t1_analyst');
        internalHeaders = samlAuth.getInternalRequestHeader();
      });

      after(async () => {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns 403 forbidden', async () => {
        await bootstrapEaseRules(roleAuthc, internalHeaders).expect(403);
      });
    });
  });
}
