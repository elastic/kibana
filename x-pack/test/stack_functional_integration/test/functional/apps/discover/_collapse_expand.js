/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'settings', 'discover']);
  const log = getService('log');
  const screenshot = getService('screenshots');

  describe('discover tab', async () => {
    before(async () => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      log.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    describe('field data', function() {
      it('should initially be expanded', async () => {
        screenshot.take('Discover-sidebar-expanded');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('### expanded sidebar width = ' + width);
        expect(width > 180).to.be(true);
      });

      it('should collapse when clicked', async () => {
        await PageObjects.discover.toggleSidebarCollapse();
        screenshot.take('Discover-sidebar-collapsed');
        log.debug('### PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();

        log.debug('### collapsed sidebar width = ' + width);
        expect(width < 20).to.be(true);
      });

      it('should expand when clicked', async () => {
        await PageObjects.discover.toggleSidebarCollapse();
        log.debug('PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('expanded sidebar width = ' + width);
        expect(width > 180).to.be(true);
      });
    });
  });
}
