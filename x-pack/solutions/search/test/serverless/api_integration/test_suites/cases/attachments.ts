/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL, COMMENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import type { RoleCredentials } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';

const CASE_ID = 'not-a-real-case';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  describe('attachments', () => {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('viewer');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('403 when trying to create an attachment', async () => {
      await supertestWithoutAuth
        .post(`${CASES_URL}/${CASE_ID}/attachments`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          type: COMMENT_ATTACHMENT_TYPE,
          data: { content: 'This is a cool comment' },
          owner: 'cases',
        })
        .expect(403);
    });

    it('403 when trying to create a comment', async () => {
      await supertestWithoutAuth
        .post(`${CASES_URL}/${CASE_ID}/comments`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({ type: AttachmentType.user, comment: 'This is a cool comment', owner: 'cases' })
        .expect(403);
    });
  });
};
