/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  describe('Observability alert table state storage', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');
    const esArchiver = getService('esArchiver');
    const testSubjects = getService('testSubjects');
    const dataGrid = getService('dataGrid');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('remembers column changes', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await dataGrid.clickHideColumn('kibana.alert.duration.us');

      await observability.alerts.common.navigateToTimeWithData();

      const durationColumnExists = await testSubjects.exists(
        'dataGridHeaderCell-kibana.alert.duration.us'
      );
      expect(durationColumnExists).to.be(false);
    });

    it('remembers sorting changes', async () => {
      await observability.alerts.common.navigateToTimeWithData();
      await dataGrid.clickDocSortAsc('kibana.alert.start');

      await observability.alerts.common.navigateToTimeWithData();

      const triggeredColumnHeading = await dataGrid.getHeaderElement('kibana.alert.start');
      expect(await triggeredColumnHeading.getAttribute('aria-sort')).to.be('ascending');
    });
  });
};
