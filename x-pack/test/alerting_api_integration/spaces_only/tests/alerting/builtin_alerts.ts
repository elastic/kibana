/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
  AlertUtils,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function buildinAlertTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('alerts - builtins', () => {
    let alertUtils: AlertUtils;
    let indexRecordActionId: string;
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      const { body: createdAction } = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'built-in .index action',
          actionTypeId: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
          },
        })
        .expect(200);
      indexRecordActionId = createdAction.id;
      alertUtils = new AlertUtils({
        space: Spaces.space1,
        supertestWithoutAuth,
        indexRecordActionId,
        objectRemover,
      });
    });
    afterEach(() => objectRemover.removeAll());
    after(async () => {
      await esTestIndexTool.destroy();
      objectRemover.add(Spaces.space1.id, indexRecordActionId, 'action');
      await objectRemover.removeAll();
    });

    it('should schedule task, run builtin alert and schedule builtin action', async () => {
      const reference = alertUtils.generateReference();
      const source = 'builtin-alerts';
      const response = await alertUtils.createBuiltinAlwaysFiringAction({ source, reference });

      let errorText = null;
      if (response.statusCode !== 200) {
        errorText = response.text;
      }
      expect(errorText).to.eql(null);

      // get the count and date from the docs, sort, make sure later counts align w/ later dates
      const testRecords: any[] = await esTestIndexTool.waitForDocs(source, reference, 2);
      const countDates = testRecords.map(tr => tr._source.state);
      countDates.sort((a, b) => a.date.localeCompare(b.date));
      expect(countDates[0].date < countDates[1].date);
      expect(countDates[0].count < countDates[1].count);
    });
  });
}
