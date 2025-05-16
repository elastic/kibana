/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

import type { RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';
import {
  getOutputDetailsSample,
  getSampleDetailsAsNdjson,
} from '../../../../../../common/api/detection_engine/rule_management/mocks';
import type { InvestigationFields } from '../../../../../../common/api/detection_engine';
import { createPromiseFromRuleImportStream } from './create_promise_from_rule_import_stream';

export const getOutputSample = (): Partial<RuleToImport> => ({
  rule_id: 'rule-1',
  output_index: '.siem-signals',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  index: ['index-1'],
  name: 'some-name',
  severity: 'low',
  interval: '5m',
  type: 'query',
});

export const getSampleAsNdjson = (sample: Partial<RuleToImport>): string => {
  return `${JSON.stringify(sample)}\n`;
};

describe('createPromiseFromRuleImportStream', () => {
  test('transforms an ndjson stream into a stream of rule objects', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });

    expect(result).toEqual([
      {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
      {
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
    ]);
  });

  test('throws an error when the number of rules in the stream is equal to the limit', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push('\n');
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });

    await expect(
      createPromiseFromRuleImportStream({ stream: ndJsonStream, objectLimit: 2 })
    ).rejects.toThrowError("Can't import more than 2 rules");
  });

  test('throws an error when the number of rules in the stream is larger than the limit', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push('\n');
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });

    await expect(
      createPromiseFromRuleImportStream({ stream: ndJsonStream, objectLimit: 1 })
    ).rejects.toThrowError("Can't import more than 1 rules");
  });

  test('skips empty lines', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push('\n');
        this.push(getSampleAsNdjson(sample2));
        this.push('');
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });

    expect(result).toEqual([
      {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
      {
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
    ]);
  });

  test('filters the export details entry from the stream', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    const details = getOutputDetailsSample({ totalCount: 1, rulesCount: 1 });
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push(getSampleAsNdjson(sample2));
        this.push(getSampleDetailsAsNdjson(details));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });

    expect(result).toEqual([
      {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
      {
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
    ]);
  });

  test('handles non parsable JSON strings and inserts the error as part of the return array', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push('{,,,,\n');
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });

    const resultOrError = result as Error[];
    expect(resultOrError[0]).toEqual({
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    });
    expect(resultOrError[1].message).toEqual(`Expected property name or '}' in JSON at position 1`);
    expect(resultOrError[2]).toEqual({
      rule_id: 'rule-2',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    });
  });

  test('handles non-validated data', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push(`{}\n`);
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });
    const resultOrError = result as BadRequestError[];
    expect(resultOrError[0]).toEqual({
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    });
    expect(resultOrError[1].message).toContain(
      `name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', and 1 more`
    );
    expect(resultOrError[2]).toEqual({
      rule_id: 'rule-2',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    });
  });

  test('non validated data is an instanceof BadRequestError', async () => {
    const sample1 = getOutputSample();
    const sample2 = getOutputSample();
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push(`{}\n`);
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });
    const resultOrError = result as BadRequestError[];
    expect(resultOrError[1] instanceof BadRequestError).toEqual(true);
  });

  test('migrates investigation_fields', async () => {
    const sample1 = {
      ...getOutputSample(),
      investigation_fields: ['foo', 'bar'] as unknown as InvestigationFields,
    };
    const sample2 = {
      ...getOutputSample(),
      rule_id: 'rule-2',
      investigation_fields: [] as unknown as InvestigationFields,
    };
    sample2.rule_id = 'rule-2';
    const ndJsonStream = new Readable({
      read() {
        this.push(getSampleAsNdjson(sample1));
        this.push(getSampleAsNdjson(sample2));
        this.push(null);
      },
    });
    const [{ rules: result }] = await createPromiseFromRuleImportStream({
      stream: ndJsonStream,
      objectLimit: 1000,
    });
    expect(result).toEqual([
      {
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        investigation_fields: {
          field_names: ['foo', 'bar'],
        },
      },
      {
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
      },
    ]);
  });
});
