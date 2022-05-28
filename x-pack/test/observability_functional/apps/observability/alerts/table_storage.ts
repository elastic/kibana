/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Observability alert table state storage', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const esArchiver = getService('esArchiver');
    const testSubjects = getService('testSubjects');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');

      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('remembers column changes', async () => {
      const durationColumnButton = await testSubjects.find(
        'dataGridHeaderCellActionButton-kibana.alert.duration.us'
      );
      await durationColumnButton.click();
      const columnMenu = await testSubjects.find(
        'dataGridHeaderCellActionGroup-kibana.alert.duration.us'
      );
      const removeButton = await columnMenu.findByCssSelector('[title="Remove column"]');
      await removeButton.click();

      await observability.alerts.common.navigateToTimeWithData();

      const durationColumnExists = await testSubjects.exists(
        'dataGridHeaderCellActionButton-kibana.alert.duration.us'
      );

      expect(durationColumnExists).to.be(false);
    });

    it('remembers sorting changes', async () => {
      const timestampColumnButton = await testSubjects.find(
        'dataGridHeaderCellActionButton-@timestamp'
      );
      await timestampColumnButton.click();
      const columnMenu = await testSubjects.find('dataGridHeaderCellActionGroup-@timestamp');
      const sortButton = await columnMenu.findByCssSelector('[title="Sort Old-New"]');
      await sortButton.click();

      await observability.alerts.common.navigateToTimeWithData();

      const timestampColumnHeading = await testSubjects.find('dataGridHeaderCell-@timestamp');
      expect(await timestampColumnHeading.getAttribute('aria-sort')).to.be('ascending');
    });
  });
};
