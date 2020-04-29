/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker', 'endpointAlerts']);
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('Endpoint Alert Resolver', function() {
    this.tags(['ciGroup7']);
    before(async () => {
      const fromTime = 'Sep 22, 2019 @ 20:31:44.000';
      const toTime = 'Now';
      await esArchiver.load('endpoint/resolver_tree/api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/alerts');
      // await pageObjects.common.sleep(4000);
      await retry.try(async function() {
        await testSubjects.existOrFail('superDatePickerShowDatesButton');
      });
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await testSubjects.existOrFail('alertListPage');
      await (await testSubjects.find('alertTypeCellLink')).click();
      await testSubjects.existOrFail('alertDetailFlyout');
      await (await testSubjects.find('overviewResolverTab')).click();
      await pageObjects.endpointAlerts.waitForTableToHaveData('resolverEmbeddable');
    });

    it('resolver column Process Name exits', async () => {
      await testSubjects.existOrFail('tableHeaderCell_name_0');
    });

    it('resolver column Timestamp exits', async () => {
      await testSubjects.existOrFail('tableHeaderCell_timestamp_1');
    });

    it('resolver Table and Node data same length', async () => {
      let count = 1;
      const tableData = await pageObjects.endpointAlerts.getEndpointAlertResolverTableData(
        'resolverEmbeddable',
        'tr'
      );
      await retry.try(async function() {
        await (await testSubjects.find('zoom-out')).click();
        const Nodes = await testSubjects.findAll('resolverNode');
        expect(tableData.length - 1).to.eql(Nodes.length);
        count++;
      });

      for (let i = 0; i < count; i++) {
        await (await testSubjects.find('zoom-in')).click();
      }
    });

    it('compare resolver Nodes and Table data', async () => {
      const $: string[] = [];
      let count = 1;
      const tableData = await pageObjects.endpointAlerts.getEndpointAlertResolverTableData(
        'resolverEmbeddable',
        'tr'
      );

      await retry.try(async function() {
        await (await testSubjects.find('zoom-out')).click();
        const Nodes = await testSubjects.findAll('resolverNode');
        expect(tableData.length - 1).to.eql(Nodes.length);
        for (const value of Nodes) {
          $.push(await value._webElement.getText());
        }
        count++;
      });

      for (let i = 0; i < $.length; i++) {
        expect(tableData[i + 1][0]).to.eql($[i].split('\n')[1]);
      }
      for (let i = 0; i < count; i++) {
        await (await testSubjects.find('zoom-in')).click();
      }
    });

    it('resolver Nodes navigation Up', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('north-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NodeData);
      for (let i = 0; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].top)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Down', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('south-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NodeData);
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Left', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('west-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NodeData);
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].left)
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Right', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('east-button')).click();

      const NodeData1 = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NodeData1);
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Center', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('east-button')).click();
      await (await testSubjects.find('south-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NodeData);
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('center-button')).click();

      const CenterNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const CenterNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(CenterNodeData);

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
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);

      await (await testSubjects.find('zoom-in')).click();
      await browser.setWindowSize(2400, 1800);
      const NewNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(NewNodeData);

      for (let i = 1; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].left)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].top)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].width)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].width)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].height)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].height)
        );
        await (await testSubjects.find('zoom-out')).click();
      }
    });

    it('resolver Nodes navigation zoom out', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(OriginalNodeData);
      await (await testSubjects.find('zoom-out')).click();
      const NewNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      const NewNodeDataStyle1 = await pageObjects.endpointAlerts.parseStyles(NewNodeData);

      for (let i = 1; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle1[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle1[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
        expect(parseFloat(NewNodeDataStyle1[i].width)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].width)
        );
        expect(parseFloat(NewNodeDataStyle1[i].height)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].height)
        );
      }
      await (await testSubjects.find('zoom-in')).click();
    });

    after(async () => {
      await (await testSubjects.find('euiFlyoutCloseButton')).click();
      await pageObjects.common.sleep(2000);
      await esArchiver.unload('endpoint/resolver_tree/api_feature');
    });
  });
}
