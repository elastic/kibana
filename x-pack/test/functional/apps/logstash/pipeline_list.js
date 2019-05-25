/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';

export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const random = getService('random');
  const pipelineList = getService('pipelineList');
  const pipelineEditor = getService('pipelineEditor');
  const PageObjects = getPageObjects(['logstash']);

  describe('pipeline list route', () => {
    let originalWindowSize;

    before(async () => {
      originalWindowSize = await browser.getWindowSize();
      await browser.setWindowSize(1600, 1000);
      await esArchiver.load('logstash/example_pipelines');
      await PageObjects.logstash.gotoPipelineList();
    });

    after(async () => {
      await esArchiver.unload('logstash/example_pipelines');
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    it('shows example pipelines', async () => {
      const rows = await pipelineList.readRows();
      const rowsWithoutTime = rows.map(row => omit(row, 'lastModified'));

      for (const time of rows.map(row => row.lastModified)) {
        // last modified is a relative time string. Check for 'ago' suffix
        expect(time)
          .to.be.a('string')
          .match(/ ago$/);
      }

      const expectedRows = [
        {
          selected: false,
          id: 'tweets_and_beats',
          description: 'ingest tweets and beats',
          username: 'elastic',
        },
      ];

      for (let emptyPipelineId = 1; emptyPipelineId <= 19; ++emptyPipelineId) {
        expectedRows.push({
          selected: false,
          id: `empty_pipeline_${emptyPipelineId}`,
          description: 'an empty pipeline',
          username: 'elastic',
        });
      }

      expect(rowsWithoutTime).to.eql(expectedRows);
    });

    describe('select all checkbox', () => {
      it('toggles selection for all rows', async () => {
        // select all
        await pipelineList.clickSelectAll();

        for (const row of await pipelineList.readRows()) {
          expect(row).to.have.property('selected', true);
        }

        // unselect all
        await pipelineList.clickSelectAll();

        for (const row of await pipelineList.readRows()) {
          expect(row).to.have.property('selected', false);
        }
      });
    });

    describe('add button', () => {
      it('links to the empty pipeline editor', async () => {
        await pipelineList.clickAdd();
        await pipelineEditor.assertExists();
        await pipelineEditor.assertDefaultInputs();
      });

      after(async () => {
        await PageObjects.logstash.gotoPipelineList();
      });
    });

    describe('delete button', () => {
      it('is missing when no rows are selected', async () => {
        await pipelineList.deselectAllRows();
        await pipelineList.assertDeleteButtonMissing();
      });

      it('is enabled when all rows are selected', async () => {
        await pipelineList.clickSelectAll();
        await pipelineList.assertDeleteButton({ enabled: true });
      });

      it('is enabled when a random row is selected', async () => {
        await pipelineList.deselectAllRows();
        await pipelineList.selectRandomRow();
        await pipelineList.assertDeleteButton({ enabled: true });
      });
    });

    describe('filter', () => {
      it('filters the pipeline list', async () => {
        await pipelineList.setFilter('tweets');
        const rows = await pipelineList.readRows();

        expect(rows).to.have.length(1);
        expect(rows[0]).to.have.property('id', 'tweets_and_beats');
      });
    });

    describe('row links', () => {
      it('opens the selected row in the editor', async () => {
        await pipelineList.setFilter('tweets_and_beats');
        await pipelineList.clickFirstRowId();
        await pipelineEditor.assertExists();
        await pipelineEditor.assertEditorId('tweets_and_beats');
      });

      after(async () => {
        await PageObjects.logstash.gotoPipelineList();
      });
    });

    describe('next page button', () => {
      it('is enabled', async () => {
        await pipelineList.assertNextPageButton({ enabled: true });
      });

      it('takes user to the second page', async () => {
        await pipelineList.clickNextPage();
        const rows = await pipelineList.readRows();
        const rowsWithoutTime = rows.map(row => omit(row, 'lastModified'));

        for (const time of rows.map(row => row.lastModified)) {
          // last modified is a relative time string. Check for 'ago' suffix
          expect(time)
            .to.be.a('string')
            .match(/ ago$/);
        }

        expect(rowsWithoutTime).to.eql([
          {
            selected: false,
            id: 'empty_pipeline_20',
            description: 'an empty pipeline',
            username: 'elastic',
          },
          {
            selected: false,
            id: 'empty_pipeline_21',
            description: 'an empty pipeline',
            username: 'elastic',
          },
        ]);
      });
    });

    describe('clone button', () => {
      it('links to the pipeline editor with cloned pipeline details', async () => {
        // First, create a random pipeline
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

        // Then, try to clone it
        await pipelineList.assertExists();

        await pipelineList.setFilter(id);
        await pipelineList.clickCloneLink(id);

        // Check that pipeline edit view is shown with cloned pipeline details
        await pipelineEditor.assertInputs({
          id: '',
          description,
          pipeline,
          workers,
          batchSize,
          queueType,
          queueMaxBytesNumber,
          queueMaxBytesUnits,
          queueCheckpointWrites,
        });
      });

      after(async () => {
        await PageObjects.logstash.gotoPipelineList();
      });
    });
  });
}
