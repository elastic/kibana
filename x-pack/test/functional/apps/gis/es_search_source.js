/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis']);

  describe('elasticsearch document layer', () => {
    before(async () => {
      await PageObjects.gis.loadSavedMap('logstash events');
    });

    after(async () => {
      await PageObjects.gis.closeInspector();
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        await PageObjects.gis.openInspectorRequestsView();
        const requestStats = await PageObjects.gis.getInspectorTableData();
        const hits = PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('2048');
      });
    });
  });
}
