/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
// import { EndpointDocGenerator, Event } from '../../../../../x-pack/plugins/endpoint/common/generate_data';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker', 'endpointAlerts']);
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Endpoint Alert Resolver', function() {
    this.tags(['ciGroup7']);
    before(async () => {
      const fromTime = 'Sep 22, 2019 @ 20:31:44.000';
      const toTime = 'Now';
      await esArchiver.load('endpoint/resolver_tree/api_feature');
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/alerts');
      await pageObjects.common.sleep(4000);
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await testSubjects.existOrFail('alertListPage');
      await (await testSubjects.find('alertTypeCellLink')).click();
      await testSubjects.existOrFail('alertDetailFlyout');
      await (await testSubjects.find('overviewResolverTab')).click();
      await pageObjects.common.sleep(2000);
    });

    it('loads the Alert resolver', async () => {
      await testSubjects.existOrFail('resolverEmbeddable');
    });

    it('resolver column Process Name exits', async () => {
      await testSubjects.existOrFail('tableHeaderCell_name_0');
    });

    it('resolver column Timestamp exits', async () => {
      await testSubjects.existOrFail('tableHeaderCell_timestamp_1');
    });

    it('resolver Table and Node data same length', async () => {
      const tableData = await pageObjects.endpointAlerts.getEndpointAlertResolverTableData(
        'resolverEmbeddable',
        'tr'
      );
      // const Nodes = await testSubjects.findAll('nodeLabel');
      const Nodes = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'div'
      );
      // console.log(Nodes.length);
      // console.log(tableData.length);
      expect(tableData.length - 1).to.eql(Nodes.length);
    });

    it('compare resolver Nodes and Table data', async () => {
      const Nodes = await testSubjects.findAll('resolverNode');
      const $ = [];

      for (const value of Nodes) {
        $.push(await value._webElement.getText());
      }
      const tableData = await pageObjects.endpointAlerts.getEndpointAlertResolverTableData(
        'resolverEmbeddable',
        'tr'
      );
      for (let i = 0; i < $.length; i++) {
        expect(tableData[i + 1][0]).to.eql($[i].split(' ')[0].split('\n')[0]);
      }
    });

    it('resolver Nodes navigation Up', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      await (await testSubjects.find('north-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < OriginalNodeData.length; i++) {
        expect(parseFloat(OriginalNodeData[i].split(' ')[3])).to.lessThan(
          parseFloat(NodeData[i].split(' ')[3])
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Down', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      await (await testSubjects.find('south-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NodeData.length; i++) {
        expect(parseFloat(NodeData[i].split(' ')[3])).to.lessThan(
          parseFloat(OriginalNodeData[i].split(' ')[3])
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Left', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      await (await testSubjects.find('west-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NodeData.length; i++) {
        expect(parseFloat(OriginalNodeData[i].split(' ')[1])).to.lessThan(
          parseFloat(NodeData[i].split(' ')[1])
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Right', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      await (await testSubjects.find('east-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NodeData.length; i++) {
        expect(parseFloat(NodeData[i].split(' ')[1])).to.lessThan(
          parseFloat(OriginalNodeData[i].split(' ')[1])
        );
      }
      await (await testSubjects.find('center-button')).click();
    });

    it('resolver Nodes navigation Center', async () => {
      const OriginalNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      await (await testSubjects.find('east-button')).click();
      await (await testSubjects.find('south-button')).click();

      const NodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NodeData.length; i++) {
        expect(parseFloat(NodeData[i].split(' ')[1])).to.lessThan(
          parseFloat(OriginalNodeData[i].split(' ')[1])
        );
        expect(parseFloat(NodeData[i].split(' ')[3])).to.lessThan(
          parseFloat(OriginalNodeData[i].split(' ')[3])
        );
      }
      await (await testSubjects.find('center-button')).click();

      const CenterNodeData = await pageObjects.endpointAlerts.getEndpointAlertResolverNodeData(
        'resolverNode',
        'style'
      );

      for (let i = 0; i < CenterNodeData.length; i++) {
        expect(parseFloat(CenterNodeData[i].split(' ')[1])).to.equal(
          parseFloat(OriginalNodeData[i].split(' ')[1])
        );
        expect(parseFloat(CenterNodeData[i].split(' ')[3])).to.equal(
          parseFloat(OriginalNodeData[i].split(' ')[3])
        );
      }
    });

    after(async () => {
      // await testSubjects.existOrFail('tableHeaderCell_timestamp_1');
      // await (await testSubjects.find('tableHeaderCell_timestamp_1')).click();
      // await pageObjects.common.sleep(2000);
      // await testSubjects.existOrFail('tableHeaderSortButton');
      // await (await testSubjects.find('tableHeaderSortButton')).click();
      // await pageObjects.common.sleep(2000);
      await (await testSubjects.find('euiFlyoutCloseButton')).click();
      await pageObjects.common.sleep(2000);
      await esArchiver.unload('endpoint/resolver_tree/api_feature');
    });
  });
}
