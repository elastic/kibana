/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('monitoring app - stack functional integration - suite', () => {
    const browser = getService('browser');
    const PageObjects = getPageObjects(['security', 'monitoring', 'common']);
    const testSubjects = getService('testSubjects');
    const clusterOverview = getService('monitoringClusterOverview');
    const find = getService('find');

    before(async () => {
      await browser.setWindowSize(1200, 1200);
      await PageObjects.common.navigateToApp('monitoring', { insertTimestamp: false });
      await clusterOverview.acceptAlertsModal();
    });
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('monitoring', { insertTimestamp: false });
      await find.clickByLinkText('elasticsearch');
      // this is a workaround for https://github.com/elastic/kibana/issues/130029
    });
    it('Elasticsearch should have at least 1 document', async () => {
      // Looking at various ES metrics in the ES overview page
      await testSubjects.click('esOverview');
      const docCountText = await testSubjects.getVisibleText('documentCount');
      //the slice is due to the fact that the data is as a string with the description in front. example: "Documents Count \n 1241"
      const docCount = parseInt(docCountText.slice(10), 10);
      expect(docCount).to.be.greaterThan(0);
    });
    it('Elasticsearch should have at least 1 index', async () => {
      await testSubjects.click('esOverview');
      const indCountText = await testSubjects.getVisibleText('indicesCount');
      const indCount = parseInt(indCountText.slice(8), 10);
      expect(indCount).to.be.greaterThan(0);
    });
    it('Kibana should have 1 instance', async () => {
      // Looking at various Kibana metrics in the Kibana overview page
      await testSubjects.click('kbnOverview');
      const instances = await testSubjects.getVisibleText('instances');
      expect(instances).to.eql('Instances\n1');
    });
    it('Kibana should have at least 1 request', async () => {
      await testSubjects.click('kbnOverview');
      const conCountText = await testSubjects.getVisibleText('requests');
      const conCount = parseInt(conCountText.slice(9), 10);
      expect(conCount).to.be.greaterThan(0);
    });
    it('Logstash should have 1 node', async () => {
      // Looking at various Logstash metrics in the Logstash overview page
      await testSubjects.click('lsOverview');
      const nodes = await testSubjects.getVisibleText('node_count');
      expect(nodes).to.eql('Nodes\n1');
    });
    it('Logstash should have at least 1 event received', async () => {
      await testSubjects.click('lsOverview');
      const eventsCountText = await testSubjects.getVisibleText('events_in_total');
      const eventsCount = parseInt(eventsCountText.slice(16, -1), 10);
      expect(eventsCount).to.be.greaterThan(0);
    });
    it('Beats should have the correct number of total beats', async () => {
      //Checking the total number of Beats reporting against how many beats we have configured in the integration test
      await testSubjects.click('beatsOverview');
      const totalCountText = await testSubjects.getVisibleText('totalBeats');
      const beatsCount = parseInt(totalCountText.slice(12), 10);
      const beatsList = process.env.BEATS;
      expect(beatsCount).to.eql(beatsList.replace('elastic-agent ', '').trim().split(/\s+/).length);
    });
    const installedBeats = process.env.BEATS;
    installedBeats
      .replace('elastic-agent ', '')
      .trim()
      .split(/\s+/)
      .forEach(function (beat) {
        it(beat + ' should be in the list of beats in the header', async () => {
          //Checking the total number of Beats reporting against how many beats we have configured in the integration test
          await testSubjects.click('beatsOverview');
          await testSubjects.click('beatsListingPage');
          await testSubjects.click('beatLink-' + beat);
          const eventsTotalText = await testSubjects.getVisibleText('eventsTotal');
          const eventsTotal = parseInt(eventsTotalText.slice(13), 10);
          expect(eventsTotal).to.be.greaterThan(0);
        });
      });
  });
};
