/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const random = getService('random');
  const pipelineList = getService('pipelineList');
  const pipelineEditor = getService('pipelineEditor');
  const PageObjects = getPageObjects(['logstash']);
  const retry = getService('retry');

  describe('pipeline create new', () => {
    let originalWindowSize;

    before(async () => {
      originalWindowSize = await browser.getWindowSize();
      await browser.setWindowSize(1600, 1000);
      await esArchiver.load('logstash/empty');
    });

    after(async () => {
      await esArchiver.unload('logstash/empty');
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    it('starts with the default values', async () => {
      await PageObjects.logstash.gotoNewPipelineEditor();
      await pipelineEditor.assertDefaultInputs();
    });

    describe('save button', () => {
      it('creates the pipeline and redirects to the list', async () => {
        await PageObjects.logstash.gotoNewPipelineEditor();

        const id = random.id();
        const description = random.text();
        const pipeline = random.longText();
        const workers = random.int().toString();
        const batchSize = random.int(100, 200).toString();
        const queueType = 'persisted';
        const queueMaxBytesNumber = random.int(100, 1000).toString();
        const queueMaxBytesUnits = 'mb';
        const queueCheckpointWrites = random.int(1000, 2000).toString();

        await pipelineEditor.setId(id);
        await pipelineEditor.setDescription(description);
        await pipelineEditor.setPipeline(pipeline);
        await pipelineEditor.setWorkers(workers);
        await pipelineEditor.setBatchSize(batchSize);
        await pipelineEditor.setQueueType(queueType);
        await pipelineEditor.setQueueMaxBytesNumber(queueMaxBytesNumber);
        await pipelineEditor.setQueueMaxBytesUnits(queueMaxBytesUnits);
        await pipelineEditor.setQueueCheckpointWrites(queueCheckpointWrites);

        await pipelineEditor.assertInputs({
          id,
          description,
          pipeline,
          workers,
          batchSize,
          queueType,
          queueMaxBytesNumber,
          queueMaxBytesUnits,
          queueCheckpointWrites,
        });

        await pipelineEditor.clickSave();
        await pipelineList.assertExists();
        await pipelineList.setFilter(id);

        await retry.try(async () => {
          const rows = await pipelineList.readRows();
          const newRow = rows.find(row => row.id === id);

          expect(newRow).to.have.property('description', description);
        });
      });
    });

    describe('cancel button', () => {
      it('discards the pipeline and redirects to the list', async () => {
        await PageObjects.logstash.gotoPipelineList();
        await pipelineList.assertExists();
        const originalRows = await pipelineList.readRows();

        await PageObjects.logstash.gotoNewPipelineEditor();
        await pipelineEditor.clickCancel();

        await retry.try(async () => {
          await pipelineList.assertExists();
          const currentRows = await pipelineList.readRows();
          expect(originalRows).to.eql(currentRows);
        });
      });
    });

    describe('delete button', () => {
      it('is not visible', async () => {
        await PageObjects.logstash.gotoNewPipelineEditor();
        await pipelineEditor.assertNoDeleteButton();
      });
    });
  });
}
