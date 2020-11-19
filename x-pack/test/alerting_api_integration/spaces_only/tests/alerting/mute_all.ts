/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createMuteTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('mute_all', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    it('should handle mute alert request appropriately', async () => {
      const { body: createdAlert } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData({ enabled: false }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert', 'alerts');

      await alertUtils.muteAll(createdAlert.id);

      const { body: updatedAlert } = await supertestWithoutAuth
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      expect(updatedAlert.muteAll).to.eql(true);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest: supertestWithoutAuth,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });
  });
}
