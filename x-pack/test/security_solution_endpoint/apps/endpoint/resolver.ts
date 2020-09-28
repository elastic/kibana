/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker', 'hosts', 'settings']);
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');

  // FLAKY: https://github.com/elastic/kibana/issues/78375
  describe.skip('Endpoint Event Resolver', function () {
    before(async () => {
      await esArchiver.load('endpoint/resolver_tree', { useCreate: true });
      await pageObjects.hosts.navigateToSecurityHostsPage();
      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'now';
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await queryBar.setQuery('event.dataset : endpoint.events.file');
      await queryBar.submitQuery();
      await (await testSubjects.find('draggable-content-host.name')).click();
      await testSubjects.existOrFail('header-page-title');
      await (await testSubjects.find('navigation-events')).click();
      await testSubjects.existOrFail('events-viewer-panel');
      await testSubjects.exists('investigate-in-resolver-button', { timeout: 4000 });
      await (await testSubjects.findAll('investigate-in-resolver-button'))[0].click();
    });

    after(async () => {
      await pageObjects.hosts.deleteDataStreams();
    });

    it('check that Resolver and Data table is loaded', async () => {
      await testSubjects.existOrFail('resolver:graph');
      await testSubjects.existOrFail('tableHeaderCell_name_0');
      await testSubjects.existOrFail('tableHeaderCell_timestamp_1');
    });

    it('compare resolver Nodes Table data and Data length', async () => {
      const nodeData: string[] = [];
      const TableData: string[] = [];

      const Table = await testSubjects.findAll('resolver:node-list:node-link:title');
      for (const value of Table) {
        const text = await value._webElement.getText();
        TableData.push(text.split('\n')[0]);
      }
      await (await testSubjects.find('resolver:graph-controls:zoom-out')).click();
      const Nodes = await testSubjects.findAll('resolver:node:primary-button');
      for (const value of Nodes) {
        nodeData.push(await value._webElement.getText());
      }
      for (let i = 0; i < nodeData.length; i++) {
        expect(TableData[i]).to.eql(nodeData[i]);
      }
      expect(nodeData.length).to.eql(TableData.length);
      await (await testSubjects.find('resolver:graph-controls:zoom-in')).click();
    });

    it('resolver Nodes navigation Up', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:north-button')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 0; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].top)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.equal(
          parseFloat(NewNodeDataStyle[i].left)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
    });

    it('resolver Nodes navigation Down', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:south-button')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.equal(
          parseFloat(NewNodeDataStyle[i].left)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
    });

    it('resolver Nodes navigation Left', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:east-button')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 0; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
    });

    it('resolver Nodes navigation Right', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await testSubjects.click('resolver:graph-controls:west-button');
      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
    });

    it('resolver Nodes navigation Center', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:east-button')).click();
      await (await testSubjects.find('resolver:graph-controls:south-button')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
      const CenterNodeDataStyle = await pageObjects.hosts.parseStyles();

      for (let i = 0; i < CenterNodeDataStyle.length; i++) {
        expect(parseFloat(CenterNodeDataStyle[i].left)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(CenterNodeDataStyle[i].top)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
    });

    it('resolver Nodes navigation zoom in', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:zoom-in')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles();
      for (let i = 1; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].width)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].width)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].height)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].height)
        );
        await (await testSubjects.find('resolver:graph-controls:zoom-out')).click();
      }
    });

    it('resolver Nodes navigation zoom out', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles();
      await (await testSubjects.find('resolver:graph-controls:zoom-out')).click();
      const NewNodeDataStyle1 = await pageObjects.hosts.parseStyles();
      for (let i = 1; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.lessThan(
          parseFloat(NewNodeDataStyle1[i].left)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].top)).to.lessThan(
          parseFloat(NewNodeDataStyle1[i].top)
        );
        expect(parseFloat(NewNodeDataStyle1[i].width)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].width)
        );
        expect(parseFloat(NewNodeDataStyle1[i].height)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].height)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:zoom-in')).click();
    });
  });
}
