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

  describe('Endpoint Alert Resolver', function () {
    this.tags(['ciGroup7']);

    before(async () => {
      await esArchiver.load('endpoint/resolver_tree/api_feature', { useCreate: true });
      await pageObjects.hosts.navigateToSecurityHostsPage();
      await pageObjects.common.sleep(4000);
      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'now';
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await (await testSubjects.find('draggable-content-host.name')).click();
      await testSubjects.existOrFail('header-page-title');
      await (await testSubjects.find('navigation-events')).click();
      await testSubjects.existOrFail('events-viewer-panel');
      await pageObjects.common.sleep(4000);
      await (await testSubjects.findAll('investigate-in-resolver-button'))[0].click();
      await pageObjects.common.sleep(4000);
    });

    it('check that Resolver and Data table is loaded', async () => {
      await testSubjects.existOrFail('resolver:graph');
      await testSubjects.existOrFail('tableHeaderCell_name_0');
      await testSubjects.existOrFail('tableHeaderCell_timestamp_1');
    });

    it('resolver Table and Node data same length', async () => {
      const $1: string[] = [];
      const $: string[] = [];

      const tableData1 = await testSubjects.findAll('resolver:node-list:item');
      for (const value of tableData1) {
        const text = await value._webElement.getText();
        $1.push(text.split('\n')[0]);
      }
      await testSubjects.click('resolver:graph-controls:zoom-out');
      const Nodes = await testSubjects.findAll('euiButton__text');
      for (const value of Nodes) {
        $.push(await value._webElement.getText());
      }
      expect($.length).to.eql($1.length);
    });

    it('compare resolver Nodes and Table data', async () => {
      const $: string[] = [];
      const $1: string[] = [];

      const tableData = await testSubjects.findAll('resolver:node-list:item');
      for (const value of tableData) {
        const text = await value._webElement.getText();
        $1.push(text.split('\n')[0]);
      }

      await testSubjects.click('resolver:graph-controls:zoom-out');
      const Nodes = await testSubjects.findAll('euiButton__text');
      for (const value of Nodes) {
        $.push(await value._webElement.getText());
      }
      for (let i = 0; i < $.length; i++) {
        expect($1[i]).to.eql($[i]);
      }

      await testSubjects.click('resolver:graph-controls:zoom-in');
    });

    it('resolver Nodes navigation Up', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await (await testSubjects.find('resolver:graph-controls:north-button')).click();

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:south-button');

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:east-button');

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:west-button');
      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:east-button');
      await testSubjects.click('resolver:graph-controls:south-button');

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('resolver:graph-controls:center-button')).click();
      const CenterNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');

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
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:zoom-in');

      const NewNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
        await testSubjects.click('resolver:graph-controls:zoom-out');
      }
    });

    it('resolver Nodes navigation zoom out', async () => {
      const OriginalNodeDataStyle = await pageObjects.hosts.parseStyles('resolver:node', 'style');
      await testSubjects.click('resolver:graph-controls:zoom-out');
      const NewNodeDataStyle1 = await pageObjects.hosts.parseStyles('resolver:node', 'style');
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
      await testSubjects.click('resolver:graph-controls:zoom-in');
    });

    after(async () => {
      await esArchiver.unload('endpoint/resolver_tree/api_feature');
    });
  });
}
