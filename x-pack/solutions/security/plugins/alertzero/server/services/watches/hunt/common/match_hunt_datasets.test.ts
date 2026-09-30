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
  MAX_MODEL_DATASET_OPTIONS,
  rankOptionsForModel,
  HUNT_VENDOR_ALIASES,
  matchDatasetsDeterministic,
  matchDatasetsWithModel,
  normalizeVendorToken,
} from './match_hunt_datasets';

const dataset = (name: string): DiscoveredDataset => {
  const dot = name.indexOf('.');
  return {
    index_pattern: `logs-${name}-*`,
    search_patterns: [`logs-${name}-*`],
    dataset: name,
    vendor: dot === -1 ? name : name.slice(0, dot),
    data_streams: [`logs-${name}-default`],
  };
};

const fortigate = dataset('fortinet.fortigate');
const okta = dataset('okta.system');
const ciscoAsa = dataset('cisco_asa.log');
const ciscoIse = dataset('cisco_ise.log');
const awsCloudtrail = dataset('aws.cloudtrail');
const panos = dataset('panw.panos');
const f5BigIp = dataset('f5_bigip.log');
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

  it('matches when the report vendor equals a segment of the dataset vendor token', () => {
    // `cisco_asa.log` has vendor token 'cisco_asa' ('ciscoasa' normalized), which is
    // not a substring of 'cisco'. The segment rule fires instead: 'cisco' equals the
    // first '_'-separated segment, so every Cisco integration matches.
    expect(
      matchDatasetsDeterministic({ datasets: [...datasets, ciscoIse], vendor: 'Cisco' })
    ).toEqual([ciscoAsa, ciscoIse]);
  });

  it('does not match a product against the dataset vendor segments (only the vendor is checked that way)', () => {
    expect(matchDatasetsDeterministic({ datasets, product: 'Cisco' })).toEqual([]);
  });

  it.each([
    ['SAP', 'aws.apigateway_logs'],
    ['SAP', 'windows.applocker_msi_and_script'],
    ['SAP', 'axonius.application'],
    ['Intel', 'zeek.intel'],
    ['Intel', 'ti_crowdstrike.intel'],
    ['Intel', 'bbot.asm_intel'],
    ['Quest', 'cloudflare_logpush.http_request'],
    ['Versa', 'openai_chatgpt_enterprise.conversation_message'],
    ['Linux', 'ti_google_threat_intelligence.linux'],
  ])(
    'does not match report vendor %s against %s on a substring of the dataset name',
    (vendor, name) => {
      expect(matchDatasetsDeterministic({ datasets: [dataset(name)], vendor })).toEqual([]);
    }
  );

  it('does not match the report vendor against a partial vendor segment', () => {
    // 'cisco' is inside 'ciscoasa' but the segments are 'cisco' and 'asa'; 'cis' equals neither.
    expect(matchDatasetsDeterministic({ datasets: [ciscoAsa], vendor: 'cis' })).toEqual([]);
  });

  it('still matches a dataset vendor token inside the report product for multi-segment names', () => {
    expect(
      matchDatasetsDeterministic({
        datasets: [dataset('windows.applocker_msi_and_script'), okta],
        vendor: 'Microsoft',
        product: 'Windows',
      })
    ).toEqual([dataset('windows.applocker_msi_and_script')]);
  });

  describe('vendor aliases', () => {
    it('seeds the vendors whose dataset token is not derivable from the name', () => {
      expect(HUNT_VENDOR_ALIASES).toEqual({
        paloaltonetworks: ['panw'],
        f5: ['f5bigip'],
        vmware: ['vsphere'],
      });
    });

    it('matches Palo Alto Networks to panw.panos', () => {
      expect(
        matchDatasetsDeterministic({ datasets: [...datasets, panos], vendor: 'Palo Alto Networks' })
      ).toEqual([panos]);
    });

    it('matches F5 to f5_bigip.log even though the vendor is under the minimum token length', () => {
      expect(
        matchDatasetsDeterministic({ datasets: [...datasets, f5BigIp], vendor: 'F5' })
      ).toEqual([f5BigIp]);
    });

    it('matches VMware to vsphere.log', () => {
      const vsphere = dataset('vsphere.log');
      expect(
        matchDatasetsDeterministic({ datasets: [...datasets, vsphere], vendor: 'VMware' })
      ).toEqual([vsphere]);
    });

    it('also looks the report product up in the alias table', () => {
      expect(
        matchDatasetsDeterministic({
          datasets: [...datasets, panos],
          product: 'Palo Alto Networks',
        })
      ).toEqual([panos]);
    });

    it('does not let an alias pull in a different vendor', () => {
      expect(matchDatasetsDeterministic({ datasets, vendor: 'Palo Alto Networks' })).toEqual([]);
    });
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

  it('does not match Elastic Defend datasets through an "Endpoint Manager" product', () => {
    const defend = dataset('endpoint.events.process');
    expect(
      matchDatasetsDeterministic({
        datasets: [defend, okta],
        vendor: 'Ivanti',
        product: 'Endpoint Manager Mobile (EPMM)',
      })
    ).toEqual([]);
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
    // The report-vendor-equals-vendor-segment rule is unaffected.
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

  it('returns the matched datasets, per-dataset scores, and the lowest confidence', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: [
        { dataset: 'okta.system', confidence: 0.9 },
        { dataset: 'fortinet.fortigate', confidence: 0.7 },
      ],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' } })
    ).resolves.toEqual({
      matches: [fortigate, okta],
      confidence: 0.7,
      scored: [
        { dataset: 'fortinet.fortigate', confidence: 0.7 },
        { dataset: 'okta.system', confidence: 0.9 },
      ],
    });
  });

  it('narrows a mixed set to the datasets that clear the threshold on their own', async () => {
    const logger = loggerMock.create();
    const options = [ciscoAsa, f5BigIp, panos];
    const invoke = jest.fn().mockResolvedValue({
      datasets: [
        { dataset: 'panw.panos', confidence: 0.9 },
        { dataset: 'cisco_asa.log', confidence: 0.6 },
        { dataset: 'f5_bigip.log', confidence: 0.3 },
      ],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({
        model,
        datasets: options,
        report: { vendor: 'Palo Alto Networks', product: 'PAN-OS' },
        logger,
      })
    ).resolves.toEqual({
      matches: [ciscoAsa, panos],
      confidence: 0.6,
      scored: [
        { dataset: 'cisco_asa.log', confidence: 0.6 },
        { dataset: 'panw.panos', confidence: 0.9 },
      ],
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`1 below confidence threshold ${HUNT_DATASET_MATCH_MIN_CONFIDENCE}`)
    );
  });

  it('filters hallucinated dataset names against the option list', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue({
      datasets: [
        { dataset: 'okta.system', confidence: 0.8 },
        { dataset: 'okta.sys', confidence: 0.9 },
        { dataset: 'logs-okta.system-*', confidence: 0.9 },
        { dataset: 'made_up.dataset', confidence: 1 },
      ],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'Okta session hijack' }, logger })
    ).resolves.toEqual({
      matches: [okta],
      confidence: 0.8,
      scored: [{ dataset: 'okta.system', confidence: 0.8 }],
    });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('3 not in the option list'));
  });

  it('returns undefined when only hallucinated names come back', async () => {
    const logger = loggerMock.create();
    const invoke = jest
      .fn()
      .mockResolvedValue({ datasets: [{ dataset: 'nope.nothing', confidence: 0.95 }] });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'x' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('1 not in the option list'));
  });

  it('returns undefined when the model picks nothing', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue({ datasets: [] });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { text: 'unrelated' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when every dataset is below the confidence threshold and logs at debug', async () => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue({
      datasets: [
        { dataset: 'okta.system', confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE - 0.01 },
        { dataset: 'fortinet.fortigate', confidence: 0.1 },
      ],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`2 below confidence threshold ${HUNT_DATASET_MATCH_MIN_CONFIDENCE}`)
    );
  });

  it('accepts a match exactly at the confidence threshold', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: [{ dataset: 'okta.system', confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE }],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' } })
    ).resolves.toEqual({
      matches: [okta],
      confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE,
      scored: [{ dataset: 'okta.system', confidence: HUNT_DATASET_MATCH_MIN_CONFIDENCE }],
    });
  });

  it('keeps the highest score when the model repeats a dataset', async () => {
    const invoke = jest.fn().mockResolvedValue({
      datasets: [
        { dataset: 'okta.system', confidence: 0.6 },
        { dataset: 'okta.system', confidence: 0.9 },
      ],
    });
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' } })
    ).resolves.toEqual({
      matches: [okta],
      confidence: 0.9,
      scored: [{ dataset: 'okta.system', confidence: 0.9 }],
    });
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

  it.each([
    ['a missing confidence', { datasets: [{ dataset: 'okta.system' }] }],
    ['a NaN confidence', { datasets: [{ dataset: 'okta.system', confidence: Number.NaN }] }],
    ['an out-of-range confidence', { datasets: [{ dataset: 'okta.system', confidence: 1.5 }] }],
    ['a non-array datasets', { datasets: 'okta.system' }],
    ['bare string items', { datasets: ['okta.system'], confidence: 0.9 }],
  ])('returns undefined and warns when the model output has %s', async (_label, raw) => {
    const logger = loggerMock.create();
    const invoke = jest.fn().mockResolvedValue(raw);
    const { model } = buildModel(invoke);

    await expect(
      matchDatasetsWithModel({ model, datasets, report: { vendor: 'Okta' }, logger })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid shape'));
  });

  it('offers the model at most MAX_MODEL_DATASET_OPTIONS datasets and says so', async () => {
    const logger = loggerMock.create();
    const many = Array.from({ length: MAX_MODEL_DATASET_OPTIONS + 5 }, (_, i) =>
      dataset(`vendor${String(i).padStart(3, '0')}.log`)
    );
    const invoke = jest.fn().mockResolvedValue({ datasets: [] });
    const { model } = buildModel(invoke);

    await matchDatasetsWithModel({ model, datasets: many, report: { text: 'x' }, logger });

    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('vendor000.log');
    expect(prompt).toContain(`vendor${MAX_MODEL_DATASET_OPTIONS - 1}.log`);
    expect(prompt).not.toContain(`vendor${MAX_MODEL_DATASET_OPTIONS}.log`);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `offered ${MAX_MODEL_DATASET_OPTIONS} of ${MAX_MODEL_DATASET_OPTIONS + 5}`
      )
    );
  });

  it('puts datasets the report mentions in front of the cap, so a late-alphabet vendor is still offered', async () => {
    const logger = loggerMock.create();
    const many = Array.from({ length: MAX_MODEL_DATASET_OPTIONS + 5 }, (_, i) =>
      dataset(`vendor${String(i).padStart(3, '0')}.log`)
    );
    const zscaler = dataset('zscaler.zia');
    const invoke = jest.fn().mockResolvedValue({ datasets: [] });
    const { model } = buildModel(invoke);

    await matchDatasetsWithModel({
      model,
      datasets: [...many, zscaler],
      report: { text: 'Zscaler Client Connector privilege escalation' },
      logger,
    });

    const prompt = invoke.mock.calls[0][0] as string;
    expect(prompt).toContain('zscaler.zia');
    expect(prompt.indexOf('zscaler.zia')).toBeLessThan(prompt.indexOf('vendor000.log'));
  });

  it('ranks mentioned datasets first and keeps the order otherwise', () => {
    const ranked = rankOptionsForModel([okta, fortigate, ciscoAsa], {
      vendor: 'Cisco',
      text: 'affects Fortinet appliances',
    });
    expect(ranked.map((d) => d.dataset)).toEqual([
      fortigate.dataset,
      ciscoAsa.dataset,
      okta.dataset,
    ]);
    expect(rankOptionsForModel([okta, fortigate], {})).toEqual([okta, fortigate]);
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
    const invoke = jest
      .fn()
      .mockResolvedValue({ datasets: [{ dataset: 'okta.system', confidence: 1 }] });
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
    // Vendor and product come before the dataset list so they read as the primary criterion.
    expect(prompt.indexOf('Vendor: Okta')).toBeLessThan(
      prompt.indexOf('okta.system | logs-okta.system-*')
    );
    expect(prompt.indexOf('Product: Okta Identity Cloud')).toBeLessThan(
      prompt.indexOf('--- AVAILABLE DATASETS')
    );
    expect(prompt).toContain('a dataset from a different vendor is not relevant');
    expect(prompt).toContain('10.0.0.24');
    expect(prompt).not.toContain('10.0.0.25');
    expect(prompt).toContain('A'.repeat(6000));
    expect(prompt).not.toContain('A'.repeat(6001));
  });
});
