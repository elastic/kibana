/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis']);

  describe('layer source is elasticsearch documents', () => {
    before(async () => {
      await PageObjects.gis.loadSavedWorkspace('logstash events');
    });

    after(async () => {
      await PageObjects.gis.closeInspector();
    });

    describe('inspector', () => {
      it('should register elasticsearch request in inspector', async () => {
        const hits = await PageObjects.gis.getInspectorRequestStat('Hits');
        expect(hits).to.equal('2048');
      });
    });
  });
}
