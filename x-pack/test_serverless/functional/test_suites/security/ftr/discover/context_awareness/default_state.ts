/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

const defaultEventColumns = [
  '@timestamp',
  'kibana.alert.workflow_status',
  'message',
  'event.category',
  'event.action',
  'host.name',
  'source.ip',
  'destination.ip',
  'user.name',
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const queryBar = getService('queryBar');

  describe('row leading controls', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('DataView mode', () => {
      it('should have correct list of columns', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await queryBar.setQuery('host.name: "siem-kibana"');
        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
          defaultEventColumns.join(', ')
        );
      });
    });

    describe('ES|QL mode', () => {
      it('should have correct list of columns', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
        });

        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
          defaultEventColumns.join(', ')
        );
      });
    });
  });
}
