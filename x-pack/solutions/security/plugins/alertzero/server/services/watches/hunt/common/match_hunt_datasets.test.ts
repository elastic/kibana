/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import {
  HUNT_DATASET_MATCH_MIN_CONFIDENCE,
  matchDatasetsDeterministic,
  matchDatasetsWithModel,
  normalizeVendorToken,
} from './match_hunt_datasets';

const dataset = (name: string): DiscoveredDataset => {
  const dot = name.indexOf('.');
  return {
    index_pattern: `logs-${name}-*`,
    dataset: name,
    vendor: dot === -1 ? name : name.slice(0, dot),
    data_streams: [`logs-${name}-default`],
  };
};

const fortigate = dataset('fortinet.fortigate');
const okta = dataset('okta.system');
const ciscoAsa = dataset('cisco_asa');
const awsCloudtrail = dataset('aws.cloudtrail');
const datasets = [fortigate, okta, ciscoAsa, awsCloudtrail];

describe('normalizeVendorToken', () => {
  it('lower-cases and strips everything outside [a-z0-9]', () => {
    expect(normalizeVendorToken('Cisco ASA')).toBe('ciscoasa');
    expect(normalizeVendorToken('cisco_asa')).toBe('ciscoasa');
    expect(normalizeVendorToken('okta.system')).toBe('oktasystem');
    expect(normalizeVendorToken('Palo-Alto Networks!')).toBe('paloaltonetworks');
    expect(normalizeVendorToken('AWS 2')).toBe('aws2');
  });

  it('returns an empty string when nothing survives', () => {
    expect(normalizeVendorToken('---')).toBe('');
    expect(normalizeVendorToken('')).toBe('');
  });
});

describe('matchDatasetsDeterministic', () => {
  it('matches when the dataset vendor token appears in the report vendor', () => {
    expect(matchDatasetsDeterministic({ datasets, vendor: 'Fortinet' })).toEqual([fortigate]);
  });

  it('matches when the dataset vendor token appears in the report product', () => {
    expect(
      matchDatasetsDeterministic({ datasets, product: 'Okta Workforce Identity Cloud' })
    ).toEqual([okta]);
  });

  it('matches when the report vendor appears in the dataset name', () => {
    // `cisco_asa` has no '.', so its vendor token is the whole name ('ciscoasa'),
    // which is not a substring of 'cisco'. The report-vendor-in-dataset-name rule
    // fires instead: 'cisco' is a substring of 'ciscoasa'.
    expect(matchDatasetsDeterministic({ datasets, vendor: 'Cisco' })).toEqual([ciscoAsa]);
  });

  it('does not match a product against the dataset name (only the vendor is checked that way)', () => {
    expect(matchDatasetsDeterministic({ datasets, product: 'Cisco' })).toEqual([]);
  });

  it('is case and punctuation insensitive', () => {
    expect(matchDatasetsDeterministic({ datasets, vendor: 'FORTINET, Inc.' })).toEqual([fortigate]);
    expect(matchDatasetsDeterministic({ datasets, vendor: 'Okta' })).toEqual([okta]);
    expect(matchDatasetsDeterministic({ datasets, vendor: 'Amazon Web Services (AWS)' })).toEqual([
      awsCloudtrail,
    ]);
  });

  it('returns [] when neither vendor nor product is given', () => {
    expect(matchDatasetsDeterministic({ datasets })).toEqual([]);
    expect(matchDatasetsDeterministic({ datasets, vendor: '', product: '' })).toEqual([]);
  });

  it('ignores report vendor tokens shorter than three characters', () => {
    expect(matchDatasetsDeterministic({ datasets, vendor: 'ok' })).toEqual([]);
  });

  it('ignores dataset vendor tokens shorter than three characters', () => {
    const short = dataset('ab.events');
    // 'ab' is inside 'abc' but too short to count; 'abc' is not inside 'abevents'.
    expect(matchDatasetsDeterministic({ datasets: [short], vendor: 'abc' })).toEqual([]);
  });

  it('returns every dataset that matches, in input order', () => {
    const fortinetTwo = dataset('fortinet.fortimail');
    expect(
      matchDatasetsDeterministic({
        datasets: [okta, fortigate, fortinetTwo],
        vendor: 'Fortinet',
      })
    ).toEqual([fortigate, fortinetTwo]);
  });

  it('does not match a generic dataset vendor token through the report product', () => {
    const system = dataset('system.auth');
    expect(
      matchDatasetsDeterministic({
        datasets: [system, okta],
        vendor: 'Microsoft',
        product: 'Windows Operating System',
      })
    ).toEqual([]);
    // The report-vendor-in-dataset-name rule is unaffected.
    expect(matchDatasetsDeterministic({ datasets: [system], vendor: 'system' })).toEqual([system]);
  });

  it('returns [] when nothing matches', () => {
    expect(matchDatasetsDeterministic({ datasets, vendor: 'CrowdStrike' })).toEqual([]);
  });
});

describe('matchDatasetsWithModel', () => {
  const buildModel = (
    invoke: jest.Mock
  ): { model: ScopedModel; withStructuredOutput: jest.Mock } => {
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    return {
      withStructuredOutput,
      model: {
        chatModel: { withStructuredOutput } as unknown as ScopedModel['chatModel'],
        inferenceClient: {} as ScopedModel['inferenceClient'],
        connector: {} as ScopedModel['connector'],
      },
    };
  };

  it('returns the matched datasets and confidence', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: ['okta.system', 'fortinet.fortigate'],
      confidence: 0.9,
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' } })
    ).resolves.toEqual({ matches: [fortigate, okta], confidence: 0.9 });
  });

  it('filters hallucinated dataset names against the option list', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: ['okta.system', 'okta.sys', 'logs-okta.system-*', 'made_up.dataset'],
      confidence: 0.8,
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'Okta session hijack' } })
    ).resolves.toEqual({ matches: [okta], confidence: 0.8 });
  });

  it('returns undefined when only hallucinated names come back', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue({ datasets: ['nope.nothing'], confidence: 0.95 });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'x' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when the model picks nothing', async () => {
    const invoke = jest.fn().mockResolvedValue({ datasets: [], confidence: 0.2 });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'unrelated' } })
    ).resolves.toBeUndefined();
  });

  it('drops matches below the confidence threshold and logs at debug', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue({
      datasets: ['okta.system'],
      confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE - 0.01,
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`threshold ${HUNT_DATASET_MATCH_MIN_CONFIDENCE}`)
    );
  });

  it('accepts a match exactly at the confidence threshold', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: ['okta.system'],
      confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE,
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' } })
    ).resolves.toEqual({ matches: [okta], confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE });
  });

  it('returns undefined and warns when the model call throws', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockRejectedValue(new Error('connector down'));
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connector down'));
  });

  it('short-circuits without calling the model when there are no datasets', async () => {
    const invoke = jest.fn();
    const { model, withStructuredOutput } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets: [], report: { vendor: 'Okta' } })
    ).resolves.toBeUndefined();
    expect(withStructuredOutput).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('puts the dataset list and report context into the prompt, clamping text and IOCs', async () => {
    const invoke = jest.fn().mockResolvedValue({ datasets: ['okta.system'], confidence: 1 });
    const { model } = buildModel(invoke);
    const iocs = Array.from({ length: 30 }, (_, i) => ({
      type: 'ip' as const,
      value: `10.0.0.${i}`,
    }));

    await matchDatasetsWithModel({
      model,
      datasets,
      report: {
        vendor: 'Okta',
        product: 'Okta Identity Cloud',
        techniques: ['T1078', 'T1556'],
        iocs,
        text: 'A'.repeat(7000),
      },
    });

    const [prompt] = invoke.mock.calls[0] as [string];
    expect(prompt).toContain('okta.system | logs-okta.system-*');
    expect(prompt).toContain('fortinet.fortigate | logs-fortinet.fortigate-*');
    expect(prompt).toContain('Vendor: Okta');
    expect(prompt).toContain('Product: Okta Identity Cloud');
    expect(prompt).toContain('Techniques: T1078, T1556');
    expect(prompt).toContain('10.0.0.24');
    expect(prompt).not.toContain('10.0.0.25');
    expect(prompt).toContain('A'.repeat(6000));
    expect(prompt).not.toContain('A'.repeat(6001));
  });
});
