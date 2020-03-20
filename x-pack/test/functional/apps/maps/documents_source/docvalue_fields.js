/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');

  describe('docvalue_fields', () => {
    before(async () => {
      await PageObjects.maps.loadSavedMap('document example');
    });

    async function getResponse() {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      await testSubjects.click('inspectorRequestDetailResponse');
      const responseBody = await testSubjects.getVisibleText('inspectorResponseBody');
      await inspector.close();
      return JSON.parse(responseBody);
    }

    it('should only fetch geo_point field and nothing else when source does not have data driven styling', async () => {
      await PageObjects.maps.loadSavedMap('document example');
      const response = await getResponse();
      const firstHit = response.hits.hits[0];
      expect(Object.keys(firstHit).join(',')).to.equal('_index,_id,_score,fields');
      expect(Object.keys(firstHit.fields).join(',')).to.equal('geo.coordinates');
    });

    it('should only fetch geo_point field and data driven styling fields', async () => {
      await PageObjects.maps.loadSavedMap('document example with data driven styles');
      const response = await getResponse();
      const firstHit = response.hits.hits[0];
      expect(Object.keys(firstHit).join(',')).to.equal('_index,_id,_score,fields');
      expect(Object.keys(firstHit.fields).join(',')).to.equal('geo.coordinates,bytes,hour_of_day');
    });

    it('should format date fields as epoch_millis when data driven styling is applied to a date field', async () => {
      await PageObjects.maps.loadSavedMap('document example with data driven styles on date field');
      const response = await getResponse();
      const firstHit = response.hits.hits[0];
      expect(Object.keys(firstHit).join(',')).to.equal('_index,_id,_score,fields');
      expect(Object.keys(firstHit.fields).join(',')).to.equal('geo.coordinates,bytes,@timestamp');
      expect(firstHit.fields['@timestamp']).to.be.an('array');
      expect(firstHit.fields['@timestamp'][0]).to.equal('1442709321445');
    });
  });
}
