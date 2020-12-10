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
    });

    describe('node related event pills', function () {
      /**
       * Verifies that the pills of a node have the correct text and link.
       *
       * @param id the node ID to verify the pills for.
       * @param expectedPills a map of expected pills for all nodes
       */
      const verifyPills = async (id: string, expectedPills: Map<string, Set<string>>) => {
        const relatedEventPills = await pageObjects.hosts.findNodePills(id);
        const pillsForNode = expectedPills.get(id);
        expect(relatedEventPills.length).to.equal(pillsForNode?.size);
        for (const pill of relatedEventPills) {
          const pillText = await pill._webElement.getText();
          // check that we have the pill text in our expected map
          expect(pillsForNode?.has(pillText)).to.equal(true);
          await pill.click();
          await pageObjects.common.sleep(100);

          const lastBreadcrumbLink = await testSubjects.find('resolver:breadcrumbs:last');
          const linkText = await lastBreadcrumbLink._webElement.getText();
          // check that the breadcrumb has the same pill text
          expect(pillText).to.equal(linkText);
        }
      };

      before(async () => {
        await esArchiver.load('empty_kibana');
        await esArchiver.load('endpoint/resolver_tree/alert_events', { useCreate: true });
      });
      after(async () => {
        await pageObjects.hosts.deleteDataStreams();
      });

      describe('endpoint.alerts filter', () => {
        before(async () => {
          await pageObjects.hosts.executeQueryAndOpenResolver('event.dataset : endpoint.alerts');
          await pageObjects.hosts.clickZoomOut();
          await browser.setWindowSize(2100, 1500);
        });

        it('has the correct pill text and links for the nodes in view', async () => {
          const expectedData: Map<string, Set<string>> = new Map([
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTc2MzYtMTMyNDc2MTQ0NDIuOTU5MTE2NjAw',
              new Set(['1 library']),
            ],
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTMxMTYtMTMyNDcyNDk0MjQuOTg4ODI4NjAw',
              new Set(['157 file', '520 registry']),
            ],
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTUwODQtMTMyNDc2MTQ0NDIuOTcyODQ3MjAw',
              new Set(),
            ],
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTg2OTYtMTMyNDc2MTQ0MjEuNjc1MzY0OTAw',
              new Set(['3 file']),
            ],
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTcyNjAtMTMyNDc2MTQ0MjIuMjQwNDI2MTAw',
              new Set(),
            ],
            [
              'MTk0YzBmOTgtNjA4My1jNWE4LTYzNjYtZjVkNzI2YWU2YmIyLTczMDAtMTMyNDc2MTQ0MjEuNjg2NzI4NTAw',
              new Set(),
            ],
          ]);

          const visibleNodeIDs = await pageObjects.hosts.findVisibleNodeIDs();

          for (const id of visibleNodeIDs) {
            // center the node in the view
            await pageObjects.hosts.clickNodeLinkInPanel(id);
            await verifyPills(id, expectedData);
          }
        });
      });
    });
  });
}
