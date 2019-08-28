/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// import { indexBy } from 'lodash';
export default function ({ getService, getPageObjects }) {

  const PageObjects = getPageObjects(['settings', 'common', 'graph', 'header']);
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');


  describe.skip('graph', function () { // eslint-disable-line jest/no-disabled-tests
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('load graph/secrepo data');
      await esArchiver.loadIfNeeded('graph/secrepo');
      await esArchiver.load('empty_kibana');
      log.debug('create secrepo index pattern');
      await PageObjects.settings.createIndexPattern('secrepo', '@timestamp');
      log.debug('navigateTo graph');
      await PageObjects.common.navigateToApp('graph');
    });

    const graphName = 'my Graph workspace name ' + new Date().getTime();

    const expectedText = [ 'blog',
      '/wordpress/wp-admin/',
      '202.136.75.194',
      '82.173.74.216',
      '187.131.21.37',
      'wp',
      '107.152.98.141',
      'login.php',
      '181.113.155.46',
      'admin',
      'wordpress',
      '/test/wp-admin/',
      'test',
      '/wp-login.php',
      '/blog/wp-admin/'
    ];


    // the line width with abotu 15 decimal places of accuracy looks like it will cause problems
    const expectedLineStyle = [ 'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:4.90799126435544px',
      'stroke-width:2.0042343137225673px',
      'stroke-width:5.645417023048188px',
      'stroke-width:2px',
      'stroke-width:10px',
      'stroke-width:2.377140951428095px',
      'stroke-width:2.073923530343478px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px',
      'stroke-width:2px'
    ];

    async function buildGraph() {
      log.debug('select index pattern secrepo*');
      await PageObjects.graph.selectIndexPattern('secrepo*');
      // select fields url.parts, url, params and src
      await PageObjects.graph.addField('url.parts');
      await PageObjects.graph.addField('url');
      await PageObjects.graph.addField('params');
      await PageObjects.graph.addField('src');
      await PageObjects.graph.query('admin');
      await PageObjects.common.sleep(8000);
    }

    it('should show correct data circle text', async function () {
      await buildGraph();
      const circlesText = await PageObjects.graph.getGraphCircleText();
      log.debug('circle count = ' + circlesText.length);
      log.debug('circle values = ' + circlesText);
      expect(circlesText.length).to.equal(expectedText.length);
      expect(circlesText).to.eql(expectedText);
    });

    it('should show correct number of connecting lines', async function () {
      const lineStyle = await PageObjects.graph.getGraphConnectingLines();
      log.debug('line count = ' + lineStyle.length);
      log.debug('line style = ' + lineStyle);
      expect(lineStyle.length).to.eql(expectedLineStyle.length);
      expect(lineStyle).to.eql(expectedLineStyle);
    });

    it('should save Graph workspace', async function () {
      const graphExists = await PageObjects.graph.saveGraph(graphName);
      expect(graphExists).to.eql(true);
    });

    // open the same graph workspace again and make sure the results are the same
    it.skip('should open Graph workspace', async function () {
      await PageObjects.graph.openGraph(graphName);
      const circlesText = await PageObjects.graph.getGraphCircleText();
      log.debug('circle count = ' + circlesText.length);
      log.debug('circle values = ' + circlesText);
      expect(circlesText.length).to.equal(expectedText.length);
    });

    it.skip('should delete graph', async function () {
      const alertText = await PageObjects.graph.deleteGraph(graphName);
      log.debug('alertText = ' + alertText);
    });


    it('should show venn when clicking a line', async function () {

      await retry.tryForTime(120000, async function () {
        // This test can fail after 60000ms defined as mochaOpts.timeout in
        // kibana/src/functional_test_runner/lib/config/schema.js
        log.debug('build the same graph until we can click the line with stroke-width:2.0042343137225673px');
        await PageObjects.graph.newGraph();
        await buildGraph();
        log.debug('click the line with stroke-width:2.0042343137225673px');
        await PageObjects.graph.clickGraphConnectingLine('stroke-width:2.0042343137225673px');
      });

      const vennTerm1 = await PageObjects.graph.getVennTerm1();
      log.debug('vennTerm1 = ' + vennTerm1);

      const vennTerm2 = await PageObjects.graph.getVennTerm2();
      log.debug('vennTerm2 = ' + vennTerm2);

      const smallVennTerm1 = await PageObjects.graph.getSmallVennTerm1();
      log.debug('smallVennTerm1 = ' + smallVennTerm1);

      const smallVennTerm12 = await PageObjects.graph.getSmallVennTerm12();
      log.debug('smallVennTerm12 = ' + smallVennTerm12);

      const smallVennTerm2 = await PageObjects.graph.getSmallVennTerm2();
      log.debug('smallVennTerm2 = ' + smallVennTerm2);

      const vennEllipse1 = await PageObjects.graph.getVennEllipse1();
      log.debug('JSON.stringify(vennEllipse1) = ' + JSON.stringify(vennEllipse1));

      const vennEllipse2 = await PageObjects.graph.getVennEllipse2();
      log.debug('JSON.stringify(vennEllipse2) = ' + JSON.stringify(vennEllipse2));

      expect(vennTerm1).to.be('/blog/wp-admin/');
      expect(vennTerm2).to.be('admin');
      expect(smallVennTerm1).to.be('5');
      expect(smallVennTerm12).to.be(' (5) ');
      expect(smallVennTerm2).to.be('21');
      expect(vennEllipse1).to.eql({ 'cx': '3.8470077339232853', 'cy': '2.5854414729132054', 'rx': '1.2615662610100802' });
      expect(vennEllipse2).to.eql({ 'cx': '5.170882945826411', 'cy': '2.5854414729132054', 'rx': '2.5854414729132054' });
    });


  });
}
