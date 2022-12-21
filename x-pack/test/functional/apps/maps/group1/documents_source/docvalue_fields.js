/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const security = getService('security');

  describe('docvalue_fields', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_read', 'test_logstash_reader'], {
        skipBrowserRefresh: true,
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should only fetch geo_point field and time field and nothing else when source does not have data driven styling', async () => {
      await PageObjects.maps.loadSavedMap('document example');
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      const firstHit = response.hits.hits[0];
      expect(firstHit).to.only.have.keys(['_id', '_index', '_score', 'fields']);
      expect(firstHit.fields).to.only.have.keys(['@timestamp', 'geo.coordinates']);
    });

    it('should only fetch geo_point field and data driven styling fields', async () => {
      await PageObjects.maps.loadSavedMap('document example with data driven styles');
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      const firstHit = response.hits.hits[0];
      expect(firstHit).to.only.have.keys(['_id', '_index', '_score', 'fields']);
      expect(firstHit.fields).to.only.have.keys([
        '@timestamp',
        'bytes',
        'geo.coordinates',
        'hour_of_day',
      ]);
    });

    it('should format date fields as epoch_millis when data driven styling is applied to a date field', async () => {
      await PageObjects.maps.loadSavedMap('document example with data driven styles on date field');
      const { rawResponse: response } = await PageObjects.maps.getResponse();
      const targetHit = response.hits.hits.find((hit) => {
        return hit._id === 'AU_x3_g4GFA8no6QjkSR';
      });
      expect(targetHit).not.to.be(undefined);
      expect(targetHit).to.only.have.keys(['_id', '_index', '_score', 'fields']);
      expect(targetHit.fields).to.only.have.keys(['@timestamp', 'bytes', 'geo.coordinates']);
      expect(targetHit.fields['@timestamp']).to.be.an('array');
      expect(targetHit.fields['@timestamp'][0]).to.eql('1442709321445');
    });
  });
}
