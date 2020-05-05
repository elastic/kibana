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
      await testSubjects.existOrFail('superDatePickerShowDatesButton', { timeout: 20000 });
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await testSubjects.existOrFail('alertListPage');
      await testSubjects.click('alertTypeCellLink');
      await testSubjects.existOrFail('alertDetailFlyout');
      await testSubjects.click('overviewResolverTab');
      await testSubjects.existOrFail('resolverEmbeddable', { timeout: 20000 });
      await browser.setWindowSize(2400, 1800);
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
        await testSubjects.click('zoom-out');
        const Nodes = await testSubjects.findAll('resolverNode');
        expect(tableData.length - 1).to.eql(Nodes.length);
        count++;
      });
      for (let i = 0; i < count; i++) {
        await testSubjects.click('zoom-in');
      }
    });

    it('compare resolver Nodes and Table data', async () => {
      const $: string[] = [];
      const tableData = await pageObjects.endpointAlerts.getEndpointAlertResolverTableData(
        'resolverEmbeddable',
        'tr'
      );
      await testSubjects.click('zoom-out');
      const Nodes = await testSubjects.findAll('euiButton__text');
      for (const value of Nodes) {
        $.push(await value._webElement.getText());
      }
      for (let i = 0; i < $.length; i++) {
        expect(tableData[i + 1][0]).to.eql($[i]);
      }
      await testSubjects.click('zoom-in');
    });

    it('resolver Nodes navigation Up', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('north-button');
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].top)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.equal(
          parseFloat(NewNodeDataStyle[i].left)
        );
      }
      await testSubjects.click('center-button');
    });

    it('resolver Nodes navigation Down', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('south-button');

      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.equal(
          parseFloat(NewNodeDataStyle[i].left)
        );
      }
      await testSubjects.click('center-button');
    });

    it('resolver Nodes navigation Right', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('west-button');
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(OriginalNodeDataStyle[i].left)).to.lessThan(
          parseFloat(NewNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await testSubjects.click('center-button');
    });

    it('resolver Nodes navigation  Left', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('east-button');

      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < OriginalNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.equal(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await testSubjects.click('center-button');
    });

    it('resolver Nodes navigation Center', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('east-button');
      await testSubjects.click('south-button');

      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      for (let i = 0; i < NewNodeDataStyle.length; i++) {
        expect(parseFloat(NewNodeDataStyle[i].left)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].left)
        );
        expect(parseFloat(NewNodeDataStyle[i].top)).to.lessThan(
          parseFloat(OriginalNodeDataStyle[i].top)
        );
      }
      await (await testSubjects.find('center-button')).click();
      const CenterNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );

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
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('zoom-in');
      const NewNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
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
        await testSubjects.click('zoom-out');
      }
    });

    it('resolver Nodes navigation zoom out', async () => {
      const OriginalNodeDataStyle = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
      await testSubjects.click('zoom-out');
      const NewNodeDataStyle1 = await pageObjects.endpointAlerts.parseStyles(
        'resolverNode',
        'style'
      );
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
      await testSubjects.click('zoom-in');
    });

    after(async () => {
      await browser.setWindowSize(1600, 1000);
      await testSubjects.click('euiFlyoutCloseButton');
      await pageObjects.common.sleep(2000);
      await esArchiver.unload('endpoint/resolver_tree/api_feature');
    });
  });
}
