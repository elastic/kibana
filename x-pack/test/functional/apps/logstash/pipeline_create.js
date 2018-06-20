/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const random = getService('random');
  const pipelineList = getService('pipelineList');
  const pipelineEditor = getService('pipelineEditor');
  const PageObjects = getPageObjects(['logstash']);

  describe('pipeline create new', () => {
    let originalWindowSize;

    before(async () => {
      originalWindowSize = await remote.getWindowSize();
      await remote.setWindowSize(1600, 1000);
      await esArchiver.load('logstash/empty');
    });

    after(async () => {
      await esArchiver.unload('logstash/empty');
      await remote.setWindowSize(originalWindowSize.width, originalWindowSize.height);
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
          id, description, pipeline,
          workers, batchSize,
          queueType, queueMaxBytesNumber, queueMaxBytesUnits, queueCheckpointWrites
        });

        await pipelineEditor.clickSave();
        await pipelineList.assertExists();
        const rows = await pipelineList.getRowsFromTable();
        const newRow = rows.find(row => row.id === id);

        expect(newRow)
          .to.have.property('description', description);
      });
    });

    describe('cancel button', () => {
      it('discards the pipeline and redirects to the list', async () => {
        await PageObjects.logstash.gotoPipelineList();
        const originalRows = await pipelineList.getRowsFromTable();

        await PageObjects.logstash.gotoNewPipelineEditor();
        await pipelineEditor.clickCancel();

        await pipelineList.assertExists();
        const currentRows = await pipelineList.getRowsFromTable();
        expect(originalRows).to.eql(currentRows);
      });
    });

    describe('delete button', () => {
      it('is not visible', async () => {
        await PageObjects.logstash.gotoNewPipelineEditor();
        await pipelineEditor.assertNoDeleteButton();
      });
    });

    describe('pipeline editor syntax highlighting', () => {
      const COMMENT = 'singleLineComment';
      const PIPELINE_SECTION = 'pipelineSection';
      const BRACE = 'brace';
      const PLUGIN = 'plugin';
      const CONTROL = 'control';
      const ATTRIBUTE = 'attribute';
      const OPERATOR = 'operator';
      const QUOTE = 'quote';
      const ARRAY = 'array';
      const HASH = 'hash';
      const HASH_ENTRY_NAME = 'hashEntryName';
      const BAREWORD = 'bareword';
      const NUMBER = 'number';
      const defaultFilterClasses = ['ace_indent-guide'];

      before(async () => {
        await PageObjects.logstash.gotoNewPipelineEditor();
      });

      const assertHighlightTokens = async (pattern, expectedHighlights, filterClasses) => {
        await pipelineEditor.setPatternInput(pattern);
        await pipelineEditor.assertPatterInputSyntaxHighlighting(expectedHighlights, filterClasses);
      };

      it('applies single-line comment highlights outside of pipeline section', async () => {
        const pattern = '# this is a comment';

        const expectedHighlights = [
          { token: COMMENT, content: '# this is a comment' }
        ];

        await assertHighlightTokens(pattern, expectedHighlights);
      });

      it('applies single-line comment highlights inside pipeline section', async () => {
        const pattern =
          `input {
            # this is a comment
          }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: COMMENT, content: '# this is a comment' },
          { token: BRACE, content: '}' }
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies single-line comment highlights inside attribute scopes', async () => {
        const pattern =
          `input { file # plugin declaration
            { # plugin body
            }
          } `;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: COMMENT, content: '# plugin declaration' },
          { token: BRACE, content: '{' },
          { token: COMMENT, content: '# plugin body' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies single-line comment highlights inside hash scope', async () => {
        const pattern =
          `input { file { path => { # hash comment
          } } }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: HASH, content: '{' },
          { token: COMMENT, content: '# hash comment' },
          { token: HASH, content: '}' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies single-line comment highlights inside array scope', async () => {
        const pattern = `input { file { path => [ # array comment
          ] } }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: ARRAY, content: '[' },
          { token: COMMENT, content: '# array comment' },
          { token: ARRAY, content: ']' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies single-line comment highlights inside branch conditions', async () => {
        const pattern = `filter { if
          # comment inside condition
          val in [1, 2] { } }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'filter' },
          { token: BRACE, content: '{' },
          { token: CONTROL, content: 'if' },
          { token: COMMENT, content: '# comment inside condition' },
          { token: BAREWORD, content: 'val' },
          { token: OPERATOR, content: 'in' },
          { token: ARRAY, content: '[' },
          { token: NUMBER, content: '1' },
          { token: OPERATOR, content: ',' },
          { token: NUMBER, content: '2' },
          { token: ARRAY, content: ']' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies pipelineSection classes', async () => {
        const pipelinePattern = 'input { } filter { } output { }';
        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
          { token: PIPELINE_SECTION, content: 'filter' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
          { token: PIPELINE_SECTION, content: 'output' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pipelinePattern, expectedHighlights);
      });

      it('applies plugin and attribute highlight classes', async () => {
        const pattern = 'input { file { path => \'thePath\' } }';
        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: QUOTE, content: '\'thePath\'' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights);
      });

      it('applies highlights for array, number, single/double quote, bareword, nested array, and nested hash', async () => {
        const pattern = `input { file { path => [ "first", 'second', 123.45, [ bareword ], { hash => "value" } ] } } `;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: ARRAY, content: '[' },
          { token: QUOTE, content: '"first"' },
          { token: OPERATOR, content: ',' },
          { token: QUOTE, content: `'second'` },
          { token: OPERATOR, content: ',' },
          { token: NUMBER, content: '123.45' },
          { token: OPERATOR, content: ',' },
          { token: ARRAY, content: '[' },
          { token: BAREWORD, content: 'bareword' },
          { token: ARRAY, content: ']' },
          { token: OPERATOR, content: ',' },
          { token: HASH, content: '{' },
          { token: HASH_ENTRY_NAME, content: 'hash' },
          { token: OPERATOR, content: '=>' },
          { token: QUOTE, content: '"value"' },
          { token: HASH, content: '}' },
          { token: ARRAY, content: ']' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights);
      });

      it('applies hash highlights for string, bareword, number', async () => {
        const pattern = `input { file { path => { first => 'firstValue' 'second' => secondBareword numVal => 123.45 } } } `;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: HASH, content: '{' },
          { token: HASH_ENTRY_NAME, content: 'first' },
          { token: OPERATOR, content: '=>' },
          { token: QUOTE, content: `'firstValue'` },
          { token: QUOTE, content: `'second'` },
          { token: OPERATOR, content: '=>' },
          { token: BAREWORD, content: 'secondBareword' },
          { token: HASH_ENTRY_NAME, content: 'numVal' },
          { token: OPERATOR, content: '=>' },
          { token: NUMBER, content: '123.45' },
          { token: HASH, content: '}' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights);
      });

      it('applies hash highlights for array and hash', async () => {
        const pattern = `input {  file { path => { "array" => [ 1, 2 ] 'nestedHash' => { nestedHashVal => 123.45 } } } } `;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: PLUGIN, content: 'file' },
          { token: BRACE, content: '{' },
          { token: ATTRIBUTE, content: 'path' },
          { token: OPERATOR, content: '=>' },
          { token: HASH, content: '{' },
          { token: QUOTE, content: `"array"` },
          { token: OPERATOR, content: '=>' },
          { token: ARRAY, content: '[' },
          { token: NUMBER, content: '1' },
          { token: OPERATOR, content: ',' },
          { token: NUMBER, content: '2' },
          { token: ARRAY, content: ']' },
          { token: QUOTE, content: `'nestedHash'` },
          { token: OPERATOR, content: '=>' },
          { token: HASH, content: '{' },
          { token: HASH_ENTRY_NAME, content: 'nestedHashVal' },
          { token: OPERATOR, content: '=>' },
          { token: NUMBER, content: '123.45' },
          { token: HASH, content: '}' },
          { token: HASH, content: '}' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights);
      });

      it('applies boolean highlighting in branch conditions', async () => {
        const pattern = `filter { if and or nand xor == != <= >= < > =~ !~ { } }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'filter' },
          { token: BRACE, content: '{' },
          { token: CONTROL, content: 'if' },
          { token: OPERATOR, content: 'and' },
          { token: OPERATOR, content: 'or' },
          { token: OPERATOR, content: 'nand' },
          { token: OPERATOR, content: 'xor' },
          { token: OPERATOR, content: '==' },
          { token: OPERATOR, content: '!=' },
          { token: OPERATOR, content: '<=' },
          { token: OPERATOR, content: '>=' },
          { token: OPERATOR, content: '<' },
          { token: OPERATOR, content: '>' },
          { token: OPERATOR, content: '=~' },
          { token: OPERATOR, content: '!~' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });

      it('applies branch condition highlighting', async () => {
        const pattern = `input { if (condition == condition) and [tag] in ['tags', "moreTags"]
          or [tag] not in ['tag'] { } }`;

        const expectedHighlights = [
          { token: PIPELINE_SECTION, content: 'input' },
          { token: BRACE, content: '{' },
          { token: CONTROL, content: 'if' },
          { token: OPERATOR, content: '(' },
          { token: BAREWORD, content: 'condition' },
          { token: OPERATOR, content: '==' },
          { token: BAREWORD, content: 'condition' },
          { token: OPERATOR, content: ')' },
          { token: OPERATOR, content: 'and' },
          { token: ARRAY, content: '[' },
          { token: BAREWORD, content: 'tag' },
          { token: ARRAY, content: ']' },
          { token: OPERATOR, content: 'in' },
          { token: ARRAY, content: '[' },
          { token: QUOTE, content: `'tags'` },
          { token: OPERATOR, content: ',' },
          { token: QUOTE, content: `"moreTags"` },
          { token: ARRAY, content: ']' },
          { token: OPERATOR, content: 'or' },
          { token: ARRAY, content: '[' },
          { token: BAREWORD, content: 'tag' },
          { token: ARRAY, content: ']' },
          { token: OPERATOR, content: 'not in' },
          { token: ARRAY, content: '[' },
          { token: QUOTE, content: `'tag'` },
          { token: ARRAY, content: ']' },
          { token: BRACE, content: '{' },
          { token: BRACE, content: '}' },
          { token: BRACE, content: '}' },
        ];

        await assertHighlightTokens(pattern, expectedHighlights, defaultFilterClasses);
      });
    });
  });
}
