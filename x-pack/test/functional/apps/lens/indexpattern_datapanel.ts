/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header', 'common']);
  const find = getService('find');

  describe('indexpattern_datapanel', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('lens');
    });

    it('should list the index pattern fields', async () => {
      const fields = await find.allByCssSelector('[data-test-subj="lnsFieldListPanelField"]');
      const fieldText = await Promise.all(fields.map(field => field.getVisibleText()));
      expect(fieldText).to.eql([
        '_score',
        '@timestamp',
        'bytes',
        'id',
        'machine.ram',
        'memory',
        'meta.user.lastname',
        'phpmemory',
        'relatedContent.article:modified_time',
        'relatedContent.article:published_time',
        'utc_time',
      ]);
    });
  });
}
