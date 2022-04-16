/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const screenshots = getService('screenshots');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('Screenshotting Example', function () {
    before(async () => {
      this.tags('ciGroup13');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await PageObjects.common.navigateToApp('screenshottingExample');

      await testSubjects.setValue(
        'expression',
        `kibana
          | kibana_context
          | esaggs
              index={indexPatternLoad id='logstash-*'}
              aggs={aggCount id="1" enabled=true schema="metric"}
              aggs={aggMax id="1" enabled=true schema="metric" field="bytes"}
              aggs={aggTerms id="2" enabled=true schema="segment" field="response.raw" size=4 order="desc" orderBy="1"}
          | metricVis metric={visdimension 0}
        `
      );
      await testSubjects.click('run');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('should capture a screenshot ', async () => {
      const image = await testSubjects.find('image');
      const difference = await screenshots.compareAgainstBaseline(
        'screenshotting_example_image',
        updateBaselines,
        image
      );

      expect(difference).to.be.lessThan(0.1);
    });

    it('should return memory metrics', async () => {
      const memory = await testSubjects.find('memory');
      const text = await memory.getVisibleText();

      expect(text).to.match(/\d+\.\d+ MB/);
    });

    it('should return CPU metrics', async () => {
      const memory = await testSubjects.find('cpu');
      const text = await memory.getVisibleText();

      expect(text).to.match(/\d+\.\d+%/);
    });

    it('should show an error message', async () => {
      await testSubjects.setValue('expression', 'something');
      await testSubjects.click('run');

      const error = await testSubjects.find('error');
      const text = await error.getVisibleText();

      expect(text).to.contain('Function something could not be found.');
    });
  });
}
