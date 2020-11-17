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
  const browser = getService('browser');
  const queryBar = getService('queryBar');

  describe('Endpoint Event Resolver', function () {
    before(async () => {
      await pageObjects.hosts.navigateToSecurityHostsPage();
      await pageObjects.common.dismissBanner();
      const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
      const toTime = 'now';
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await browser.setWindowSize(1800, 1200);
    });
    describe('Endpoint Resolver Tree', function () {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await esArchiver.load('endpoint/resolver_tree/functions', { useCreate: true });
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver('event.dataset : endpoint.events.file');
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

      it('Check Related Events for event.file Node', async () => {
        const expectedData = [
          '17 authentication',
          '1 registry',
          '17 session',
          '8 file',
          '1 registry',
        ];
        await pageObjects.hosts.runNodeEvents(expectedData);
      });
    });

    describe('Resolver Tree events', function () {
      const expectedData = [
        '17 authentication',
        '1 registry',
        '17 session',
        '80 registry',
        '8 network',
        '60 registry',
      ];
      before(async () => {
        await esArchiver.load('empty_kibana');
        await esArchiver.load('endpoint/resolver_tree/events', { useCreate: true });
        await queryBar.setQuery('');
        await queryBar.submitQuery();
      });
      after(async () => {
        await pageObjects.hosts.deleteDataStreams();
      });

      it('Check Related Events for event.process Node', async () => {
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver(
          'event.dataset : endpoint.events.process'
        );
        await pageObjects.hosts.runNodeEvents(expectedData);
      });

      it('Check Related Events for event.security Node', async () => {
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver(
          'event.dataset : endpoint.events.security'
        );
        await pageObjects.hosts.runNodeEvents(expectedData);
      });

      it('Check Related Events for event.registry Node', async () => {
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver(
          'event.dataset : endpoint.events.registry'
        );
        await pageObjects.hosts.runNodeEvents(expectedData);
      });

      it('Check Related Events for event.network Node', async () => {
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver(
          'event.dataset : endpoint.events.network'
        );
        await pageObjects.hosts.runNodeEvents(expectedData);
      });

      it('Check Related Events for event.library Node', async () => {
        await esArchiver.load('empty_kibana');
        await esArchiver.load('endpoint/resolver_tree/library_events', { useCreate: true });
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        const expectedLibraryData = ['329 network', '1 library', '1 library'];
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver(
          'event.dataset : endpoint.events.library'
        );
        await pageObjects.hosts.runNodeEvents(expectedLibraryData);
      });

      it('Check Related Events for event.alert Node', async () => {
        await esArchiver.load('empty_kibana');
        await esArchiver.load('endpoint/resolver_tree/alert_events', { useCreate: true });
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        const expectedAlertData = [
          '1 library',
          '157 file',
          '520 registry',
          '3 file',
          '5 library',
          '5 library',
        ];
        await pageObjects.hosts.navigateToEventsPanel();
        await pageObjects.hosts.executeQueryAndOpenResolver('event.dataset : endpoint.alerts');
        await (await testSubjects.find('resolver:graph-controls:zoom-out')).click();
        await browser.setWindowSize(2100, 1500);
        for (let i = 0; i < 2; i++) {
          await (await testSubjects.find('resolver:graph-controls:east-button')).click();
        }
        await pageObjects.hosts.runNodeEvents(expectedAlertData);
      });
    });
  });
}
