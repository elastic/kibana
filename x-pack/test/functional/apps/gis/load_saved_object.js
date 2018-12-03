/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis', 'header']);

  describe('load gis-map saved objects', () => {
    before(async () => {
      await PageObjects.gis.loadSavedMap('logstash events');
    });

    after(async () => {
      await PageObjects.gis.closeInspector();
    });

    describe('mapState', () => {
      it('should update Kibana time to time defined in mapState', async () => {
        const prettyPrint = await PageObjects.header.getPrettyDuration();
        expect(prettyPrint).to.equal('September 20th 2015, 00:00:00.000 to September 23rd 2015, 00:00:00.000');
      });

      // TODO verify map center and zoom

      // TODO verify map coordinate system
    });

    // TODO verify ui state like dark mode
  });
}
