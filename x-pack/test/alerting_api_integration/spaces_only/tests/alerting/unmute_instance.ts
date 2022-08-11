/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createUnmuteInstanceTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('unmute_instance', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    it('should handle unmute alert instance request appropriately', async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await alertUtils.muteInstance(createdAlert.id, '1');
      await alertUtils.unmuteInstance(createdAlert.id, '1');

      const { body: updatedAlert } = await supertestWithoutAuth
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(updatedAlert.muted_alert_ids).to.eql([]);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    describe('legacy', () => {
      it('should handle unmute alert instance request appropriately', async () => {
        const { body: createdAlert } = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ enabled: false }))
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${
              createdAlert.id
            }/alert_instance/1/_mute`
          )
          .set('kbn-xsrf', 'foo')
          .expect(204);
        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${
              createdAlert.id
            }/alert_instance/1/_unmute`
          )
          .set('kbn-xsrf', 'foo')
          .expect(204);

        const { body: updatedAlert } = await supertestWithoutAuth
          .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        expect(updatedAlert.muted_alert_ids).to.eql([]);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest: supertestWithoutAuth,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
        });
      });
    });
  });
}
