/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  resolveIndexScope,
  resolveHuntScope,
  parseTechnologyInput,
  broadSearchPatterns,
  MAX_SCOPE_TARGETS,
} from './resolve_index_scope';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';
import type { HuntIoc, HuntTechnology } from '@kbn/alertzero-common';
import { discoverHuntDatasets } from './discover_hunt_datasets';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { matchDatasetsDeterministic, matchDatasetsWithModel } from './match_hunt_datasets';

// Keep the real constants (an automock would empty `INTERNAL_DATASET_PREFIXES`); mock only the call.
jest.mock('./discover_hunt_datasets', () => ({
  ...jest.requireActual('./discover_hunt_datasets'),
  discoverHuntDatasets: jest.fn(),
}));
jest.mock('./match_hunt_datasets');

const mockDiscover = discoverHuntDatasets as jest.MockedFunction<typeof discoverHuntDatasets>;
const mockDeterministic = matchDatasetsDeterministic as jest.MockedFunction<
  typeof matchDatasetsDeterministic
>;
const mockWithModel = matchDatasetsWithModel as jest.MockedFunction<typeof matchDatasetsWithModel>;

const present = { indices: [{ name: 'x', attributes: [] }], aliases: [], data_streams: [] };
const absent = { indices: [], aliases: [], data_streams: [] };

const createMockEsClient = (presentPatterns: Set<string>): ElasticsearchClient =>
  ({
    indices: {
      resolveIndex: jest
        .fn()
        .mockImplementation(({ name }: { name: string }) =>
          Promise.resolve(presentPatterns.has(name) ? present : absent)
        ),
    },
  } as unknown as ElasticsearchClient);

describe('resolveIndexScope', () => {
  const SPACE_ID = 'default';
  const alertsPattern = `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${SPACE_ID}`;

  describe.each<{
    technology: HuntTechnology;
    required: string[];
    optional: string[];
  }>([
    { technology: 'aws_iam', required: ['logs-aws.*'], optional: ['logs-endpoint.events.*'] },
    { technology: 'fortigate', required: ['logs-fortinet.*'], optional: [] },
  ])('$technology', ({ technology, required, optional }) => {
    it('is ok when every required and optional pattern (plus alerts) resolves', async () => {
      const esClient = createMockEsClient(new Set([...required, ...optional, alertsPattern]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('ok');
      expect(result.required).toEqual(required);
      expect(result.optional).toEqual([...optional, alertsPattern]);
      expect(result.missing).toEqual([]);
    });

    it('is blocked when a required pattern is absent, even if optional resolves', async () => {
      const esClient = createMockEsClient(new Set([...optional, alertsPattern]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('blocked');
      expect(result.missing).toEqual(expect.arrayContaining(required));
    });

    it('is degraded when required resolves but the alerts pattern is absent', async () => {
      const esClient = createMockEsClient(new Set([...required, ...optional]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('degraded');
      expect(result.missing).toEqual([alertsPattern]);
    });
  });

  it('derives the alerts pattern from the passed spaceId, not a default', async () => {
    const nonDefaultSpace = 'threat-hunting';
    const esClient = createMockEsClient(
      new Set([
        'logs-aws.*',
        'logs-endpoint.events.*',
        `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${nonDefaultSpace}`,
      ])
    );
    const result = await resolveIndexScope({
      esClient,
      technology: 'aws_iam',
      spaceId: nonDefaultSpace,
    });

    expect(result.status).toBe('ok');
    expect(result.optional).toContain(`${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${nonDefaultSpace}`);
  });

  it('resolves every pattern against open indices only, so hidden indices never satisfy a requirement', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*']));
    await resolveIndexScope({ esClient, technology: 'aws_iam', spaceId: SPACE_ID });

    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: 'logs-aws.*',
      expand_wildcards: 'open',
      ignore_unavailable: true,
    });
  });

  it('treats a 404 on a concrete index name as absent instead of failing the resolution', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*', 'logs-endpoint.events.*']));
    (esClient.indices.resolveIndex as jest.Mock).mockImplementation(({ name }: { name: string }) =>
      name === alertsPattern
        ? Promise.reject(Object.assign(new Error('index_not_found_exception'), { statusCode: 404 }))
        : Promise.resolve(
            name === 'logs-aws.*' || name === 'logs-endpoint.events.*' ? present : absent
          )
    );
    const result = await resolveIndexScope({ esClient, technology: 'aws_iam', spaceId: SPACE_ID });

    expect(result).toEqual(
      expect.objectContaining({ status: 'degraded', missing: [alertsPattern] })
    );
  });

  it('treats a name that resolves only as an alias as present, since the alerts pattern is an alias over a hidden index', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*', 'logs-endpoint.events.*']));
    (esClient.indices.resolveIndex as jest.Mock).mockImplementation(({ name }: { name: string }) =>
      Promise.resolve(
        name === alertsPattern
          ? {
              indices: [],
              aliases: [{ name, indices: ['.internal.alerts-security.alerts-default-000001'] }],
              data_streams: [],
            }
          : name === 'logs-aws.*' || name === 'logs-endpoint.events.*'
          ? present
          : absent
      )
    );
    const result = await resolveIndexScope({ esClient, technology: 'aws_iam', spaceId: SPACE_ID });

    expect(result).toEqual(expect.objectContaining({ status: 'ok', missing: [] }));
  });

  it('defaults the row limit to 25 and the window to a 30-day lookback', async () => {
    const esClient = createMockEsClient(new Set());
    const before = Date.now();
    const result = await resolveIndexScope({
      esClient,
      technology: 'fortigate',
      spaceId: SPACE_ID,
    });
    const after = Date.now();

    expect(result.row_limit).toBe(25);
    const fromMs = new Date(result.window.from).getTime();
    const toMs = new Date(result.window.to).getTime();
    expect(toMs).toBeGreaterThanOrEqual(before);
    expect(toMs).toBeLessThanOrEqual(after);
    expect(toMs - fromMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });

  it('honors a caller-supplied window and row limit', async () => {
    const esClient = createMockEsClient(new Set());
    const window = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    const result = await resolveIndexScope({
      esClient,
      technology: 'fortigate',
      spaceId: SPACE_ID,
      window,
      row_limit: 100,
    });

    expect(result.window).toEqual(window);
    expect(result.row_limit).toBe(100);
  });
});

describe('resolveHuntScope', () => {
  const SPACE_ID = 'default';
  const alertsPattern = `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${SPACE_ID}`;

  it('resolves only the named technology when one is given', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*', 'logs-fortinet.*', alertsPattern]));
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, technology: 'fortigate' });

    expect(result.technologies).toEqual(['fortigate']);
    expect(result.resolution).toBe('pinned');
  });

  it('is blocked:pinned when the named technology has no required indices, even if another does', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*', alertsPattern]));
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, technology: 'fortigate' });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'blocked',
        technologies: [],
        index_patterns: [],
        resolution: 'blocked:pinned',
      })
    );
  });

  it('keeps only the technologies whose required indices exist when none is named', async () => {
    const esClient = createMockEsClient(
      new Set(['logs-aws.*', 'logs-endpoint.events.*', alertsPattern])
    );
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result.technologies).toEqual(['aws_iam']);
    expect(result.resolution).toBe('static');
  });

  it('merges the patterns of every present technology', async () => {
    const esClient = createMockEsClient(
      new Set(['logs-aws.*', 'logs-endpoint.events.*', 'logs-fortinet.*', alertsPattern])
    );
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result.required).toEqual(['logs-aws.*', 'logs-fortinet.*']);
    expect(result.index_patterns).toEqual(['logs-aws.*', 'logs-fortinet.*']);
  });

  it('lists the alerts pattern once even though every technology checks it', async () => {
    const esClient = createMockEsClient(
      new Set(['logs-aws.*', 'logs-endpoint.events.*', 'logs-fortinet.*', alertsPattern])
    );
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result.optional.filter((pattern) => pattern === alertsPattern)).toHaveLength(1);
  });

  it('is blocked with no technologies when no required index exists in the space', async () => {
    const esClient = createMockEsClient(new Set([alertsPattern]));
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'blocked',
        technologies: [],
        index_patterns: [],
        resolution: 'blocked:no_report',
      })
    );
  });

  it('reports every checked required pattern as missing when blocked', async () => {
    const esClient = createMockEsClient(new Set([alertsPattern]));
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result.missing).toEqual(expect.arrayContaining(['logs-aws.*', 'logs-fortinet.*']));
  });

  it('is degraded when any present technology is degraded', async () => {
    const esClient = createMockEsClient(new Set(['logs-aws.*', 'logs-fortinet.*', alertsPattern]));
    const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID });

    expect(result.status).toBe('degraded');
  });

  describe('dynamic discovery', () => {
    const oktaDataset: DiscoveredDataset = {
      index_pattern: 'logs-okta.system-*',
      dataset: 'okta.system',
      vendor: 'okta',
      data_streams: ['logs-okta.system-default'],
      search_patterns: ['logs-okta.system-*'],
    };
    const ciscoDataset: DiscoveredDataset = {
      index_pattern: 'logs-cisco_asa.log-*',
      dataset: 'cisco_asa.log',
      vendor: 'cisco_asa',
      data_streams: ['logs-cisco_asa.log-default'],
      search_patterns: ['logs-cisco_asa.log-*'],
    };
    const report = { vendor: 'Okta', text: 'Okta session hijacking' };
    const articleReport = { text: 'A campaign abusing session tokens' };
    const iocs: HuntIoc[] = [{ type: 'ip', value: '203.0.113.7' }];
    const model = {} as ScopedModel;
    let logger: ReturnType<typeof loggerMock.create>;

    beforeEach(() => {
      jest.clearAllMocks();
      logger = loggerMock.create();
      mockDiscover.mockResolvedValue([oktaDataset, ciscoDataset]);
      mockDeterministic.mockReturnValue([]);
      mockWithModel.mockResolvedValue(undefined);
    });

    it('keeps the static result and never discovers when a known technology is present and the report names no vendor or product', async () => {
      const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: articleReport,
        model,
        logger,
      });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'ok',
          technologies: ['fortigate'],
          required: ['logs-fortinet.*'],
          index_patterns: ['logs-fortinet.*'],
          resolution: 'static',
        })
      );
      expect(mockDiscover).not.toHaveBeenCalled();
      expect(mockDeterministic).not.toHaveBeenCalled();
      expect(mockWithModel).not.toHaveBeenCalled();
    });

    it('keeps the static result and never discovers for an article report even when it carries IOCs', async () => {
      const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { ...articleReport, iocs },
        model,
        logger,
      });

      expect(result.resolution).toBe('static');
      expect(mockDiscover).not.toHaveBeenCalled();
    });

    it('runs the full discovery path for an article report when every technology is blocked', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: articleReport,
        model,
        logger,
      });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:model_declined');
      expect(mockDiscover).toHaveBeenCalledTimes(1);
      expect(mockDeterministic).toHaveBeenCalledWith({
        datasets: [oktaDataset, ciscoDataset],
        vendor: undefined,
        product: undefined,
      });
      expect(mockWithModel).toHaveBeenCalledWith({
        model,
        datasets: [oktaDataset, ciscoDataset],
        report: articleReport,
        logger,
      });
    });

    describe('vendor match first', () => {
      it('prefers a deterministic vendor match over a present static technology', async () => {
        const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
        const ciscoReport = { vendor: 'Cisco', text: 'Cisco ASA exploitation' };
        mockDiscover.mockResolvedValue([ciscoDataset]);
        mockDeterministic.mockReturnValue([ciscoDataset]);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: ciscoReport,
          model,
          logger,
        });

        expect(result).toEqual(
          expect.objectContaining({
            status: 'ok',
            technologies: [],
            required: ['logs-cisco_asa.log-*'],
            index_patterns: ['logs-cisco_asa.log-*'],
            resolution: 'discovered:deterministic',
          })
        );
        expect(result.required).not.toContain('logs-fortinet.*');
        expect(mockDeterministic).toHaveBeenCalledWith({
          datasets: [ciscoDataset],
          vendor: 'Cisco',
          product: undefined,
        });
        expect(mockWithModel).not.toHaveBeenCalled();
      });

      it('runs the vendor leg on a product-only report', async () => {
        const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
        mockDeterministic.mockReturnValue([ciscoDataset]);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: { product: 'ASA' },
          model,
          logger,
        });

        expect(result.resolution).toBe('discovered:deterministic');
        expect(mockDeterministic).toHaveBeenCalledWith({
          datasets: [oktaDataset, ciscoDataset],
          vendor: undefined,
          product: 'ASA',
        });
      });

      it('falls back to the static result when the vendor misses, discovering once and never asking the model', async () => {
        const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
        mockDiscover.mockResolvedValue([ciscoDataset]);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report,
          model,
          logger,
        });

        expect(result).toEqual(
          expect.objectContaining({
            status: 'ok',
            technologies: ['fortigate'],
            required: ['logs-fortinet.*'],
            index_patterns: ['logs-fortinet.*'],
            resolution: 'static',
          })
        );
        expect(mockDiscover).toHaveBeenCalledTimes(1);
        expect(mockWithModel).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Hunt scope resolved via static: logs-fortinet.*');
      });

      it('keeps the static result when discovery returns no datasets', async () => {
        const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
        mockDiscover.mockResolvedValue([]);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report,
          model,
          logger,
        });

        expect(result.resolution).toBe('static');
        expect(result.status).toBe('ok');
        expect(mockDeterministic).not.toHaveBeenCalled();
      });

      it('keeps the static result with a warning when discovery throws', async () => {
        const esClient = createMockEsClient(new Set(['logs-fortinet.*', alertsPattern]));
        mockDiscover.mockRejectedValue(new Error('cluster unavailable'));
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report,
          model,
          logger,
        });

        expect(result).toEqual(
          expect.objectContaining({
            status: 'ok',
            technologies: ['fortigate'],
            resolution: 'static',
          })
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('vendor-first leg skipped')
        );
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
        expect(mockDeterministic).not.toHaveBeenCalled();
        expect(mockWithModel).not.toHaveBeenCalled();
      });
    });

    it('stays blocked:no_report without discovering when every technology is blocked and no report is given', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, model, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:no_report');
      expect(mockDiscover).not.toHaveBeenCalled();
    });

    it('searches a matched dataset by its search_patterns, so a sibling-prefixed dataset stays out of scope', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern])); // every static entry blocked
      const windowsDataset: DiscoveredDataset = {
        index_pattern: 'logs-windows-*',
        dataset: 'windows',
        vendor: 'windows',
        data_streams: ['logs-windows-default', 'logs-windows-prod'],
        search_patterns: ['logs-windows-default*', 'logs-windows-prod*'],
      };
      mockDiscover.mockResolvedValue([windowsDataset]);
      mockDeterministic.mockReturnValue([windowsDataset]);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { vendor: 'Microsoft', product: 'Windows' },
      });

      expect(result.resolution).toBe('discovered:deterministic');
      expect(result.required).toEqual(['logs-windows-default*', 'logs-windows-prod*']);
      expect(result.index_patterns).toEqual(result.required);
    });

    it('collapses a match too wide to name onto one wildcard per matched vendor, degraded', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const wide: DiscoveredDataset[] = Array.from({ length: MAX_SCOPE_TARGETS + 1 }, (_, i) => ({
        index_pattern: `logs-microsoft.ds${i}-*`,
        dataset: `microsoft.ds${i}`,
        vendor: 'microsoft',
        data_streams: [`logs-microsoft.ds${i}-default`],
        search_patterns: [`logs-microsoft.ds${i}-*`],
      }));
      mockDiscover.mockResolvedValue(wide);
      mockDeterministic.mockReturnValue(wide);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { vendor: 'Microsoft' },
        logger,
      });

      expect(result.resolution).toBe('discovered:deterministic');
      expect(result.status).toBe('degraded');
      // Still only the matched vendor token: an Okta stream, a `microsoftx` vendor, and a
      // `microsoft_defender` sibling token all stay out of the hit bar.
      expect(result.required).toEqual(['logs-microsoft.*', 'logs-microsoft-*']);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 vendor wildcard(s)'));
    });

    it('keeps the full vendor token when collapsing, so a cisco_asa match never reaches cisco_ise', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const asa: DiscoveredDataset[] = Array.from({ length: MAX_SCOPE_TARGETS + 1 }, (_, i) => ({
        index_pattern: `logs-cisco_asa.s${i}-*`,
        dataset: `cisco_asa.s${i}`,
        vendor: 'cisco_asa',
        data_streams: [`logs-cisco_asa.s${i}-default`],
        search_patterns: [`logs-cisco_asa.s${i}-*`],
      }));
      mockDiscover.mockResolvedValue(asa);
      mockDeterministic.mockReturnValue(asa);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { vendor: 'Cisco ASA' },
        logger,
      });

      expect(result.required).toEqual(['logs-cisco_asa.*', 'logs-cisco_asa-*']);
      expect(result.required.some((p) => p.startsWith('logs-cisco_*'))).toBe(false);
    });

    it('bounds the serialized target list, not just the entry count', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const longVendor = `microsoft_${'x'.repeat(200)}`;
      const longName = (i: number) => `${longVendor}.log${i}`;
      const wide: DiscoveredDataset[] = Array.from({ length: 20 }, (_, i) => ({
        index_pattern: `logs-${longName(i)}-*`,
        dataset: longName(i),
        vendor: longVendor,
        data_streams: [`logs-${longName(i)}-default`],
        search_patterns: [`logs-${longName(i)}-*`],
      }));
      mockDiscover.mockResolvedValue(wide);
      mockDeterministic.mockReturnValue(wide);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { vendor: 'Microsoft' },
        logger,
      });

      // 20 entries is under the count cap, but 20 patterns of ~220 chars is over the byte cap.
      expect(result.required).toEqual([`logs-${longVendor}.*`, `logs-${longVendor}-*`]);
      expect(result.status).toBe('degraded');
    });

    it('falls back to the broad target only when even one wildcard per vendor does not fit', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const wide: DiscoveredDataset[] = Array.from({ length: MAX_SCOPE_TARGETS + 1 }, (_, i) => ({
        index_pattern: `logs-vendor${i}.log-*`,
        dataset: `vendor${i}.log`,
        vendor: `vendor${i}`,
        data_streams: [`logs-vendor${i}.log-default`],
        search_patterns: [`logs-vendor${i}.log-*`],
      }));
      mockDiscover.mockResolvedValue(wide);
      mockDeterministic.mockReturnValue(wide);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { vendor: 'v' },
        logger,
      });

      expect(result.required).toEqual(broadSearchPatterns());
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('the bounded logs-* target')
      );
    });

    it('is ok on a deterministic vendor match with the discovered pattern as required', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockDeterministic.mockReturnValue([oktaDataset]);
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'ok',
          technologies: [],
          required: ['logs-okta.system-*'],
          optional: [alertsPattern],
          resolution: 'discovered:deterministic',
        })
      );
      expect(result.index_patterns).toEqual(result.required);
      expect(mockDiscover).toHaveBeenCalledWith({ esClient, logger });
      expect(mockDeterministic).toHaveBeenCalledWith({
        datasets: [oktaDataset, ciscoDataset],
        vendor: 'Okta',
        product: undefined,
      });
      expect(mockWithModel).not.toHaveBeenCalled();
    });

    it('is degraded when only the model matches, with the model match as required', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockWithModel.mockResolvedValue({
        matches: [ciscoDataset],
        confidence: 0.7,
        scored: [{ dataset: 'cisco_asa.log', confidence: 0.7 }],
      });
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'degraded',
          technologies: [],
          required: ['logs-cisco_asa.log-*'],
          index_patterns: ['logs-cisco_asa.log-*'],
          resolution: 'discovered:model',
        })
      );
      expect(mockWithModel).toHaveBeenCalledWith({
        model,
        datasets: [oktaDataset, ciscoDataset],
        report,
        logger,
      });
    });

    it('logs every model score with the chosen patterns so a model-chosen scope is auditable', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockWithModel.mockResolvedValue({
        matches: [ciscoDataset],
        confidence: 0.7,
        scored: [
          { dataset: 'cisco_asa.log', confidence: 0.7 },
          { dataset: 'okta.system', confidence: 0.2 },
        ],
      });
      await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(logger.info).toHaveBeenCalledWith(
        'Hunt scope resolved via discovered:model: logs-cisco_asa.log-* (cisco_asa.log=0.7, okta.system=0.2)'
      );
    });

    it('logs the resolution and patterns at info on the deterministic path', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockDeterministic.mockReturnValue([oktaDataset]);
      await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(logger.info).toHaveBeenCalledWith(
        'Hunt scope resolved via discovered:deterministic: logs-okta.system-*'
      );
    });

    it('is blocked:model_unavailable when nothing matches deterministically and no model is given', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:model_unavailable');
      expect(result.technologies).toEqual([]);
      expect(mockWithModel).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Hunt scope blocked: blocked:model_unavailable');
    });

    it('is blocked:model_declined when the model returns undefined', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockWithModel.mockResolvedValue(undefined);
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:model_declined');
      expect(result.index_patterns).toEqual([]);
      expect(result.required).toEqual(['logs-aws.*', 'logs-fortinet.*']);
    });

    it('is blocked:model_declined when the model returns an empty match list', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockWithModel.mockResolvedValue({ matches: [], confidence: 0, scored: [] });
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:model_declined');
      expect(result.index_patterns).toEqual([]);
    });

    it('goes broad when discovery finds no data streams but plain logs-* indices exist and the report has IOCs', async () => {
      // An estate with only an imported archive index: nothing parses as a dataset, yet
      // the broad target covers that index and the IOC can be searched there.
      const esClient = createMockEsClient(new Set([alertsPattern, 'logs-*']));
      mockDiscover.mockResolvedValue([]);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { ...report, iocs: [{ type: 'ip', value: '192.0.2.30' }] },
        logger,
      });

      expect(result.resolution).toBe('discovered:broad');
      expect(result.required).toEqual(broadSearchPatterns());
      expect(mockDeterministic).not.toHaveBeenCalled();
    });

    it('stays blocked:no_datasets with IOCs when nothing at all answers to logs-*', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockDiscover.mockResolvedValue([]);

      const result = await resolveHuntScope({
        esClient,
        spaceId: SPACE_ID,
        report: { ...report, iocs: [{ type: 'ip', value: '192.0.2.30' }] },
        logger,
      });

      expect(result.resolution).toBe('blocked:no_datasets');
    });

    it('is blocked:no_datasets when discovery returns no datasets', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockDiscover.mockResolvedValue([]);
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:no_datasets');
      expect(mockDeterministic).not.toHaveBeenCalled();
    });

    it('fails closed as blocked:discovery_failed with a warning when discovery throws', async () => {
      const esClient = createMockEsClient(new Set([alertsPattern]));
      mockDiscover.mockRejectedValue(new Error('cluster unavailable'));
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result.status).toBe('blocked');
      expect(result.resolution).toBe('blocked:discovery_failed');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
      expect(mockDeterministic).not.toHaveBeenCalled();
    });

    it('is degraded and lists the alerts alias as missing when it is absent on the discovered path', async () => {
      const esClient = createMockEsClient(new Set());
      mockDeterministic.mockReturnValue([oktaDataset]);
      const result = await resolveHuntScope({ esClient, spaceId: SPACE_ID, report, model, logger });

      expect(result.status).toBe('degraded');
      expect(result.required).toEqual(['logs-okta.system-*']);
      expect(result.missing).toContain(alertsPattern);
      expect(result.missing).toEqual(expect.arrayContaining(['logs-aws.*', 'logs-fortinet.*']));
    });

    describe('broad Tier 1 over every discovered dataset', () => {
      const iocReport = { ...report, iocs };

      it('is discovered:broad over every discovered dataset when nothing matches, no model is given, and the report has IOCs', async () => {
        const esClient = createMockEsClient(new Set([alertsPattern]));
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          logger,
        });

        expect(result).toEqual(
          expect.objectContaining({
            status: 'degraded',
            technologies: [],
            required: broadSearchPatterns(),
            optional: [alertsPattern],
            resolution: 'discovered:broad',
          })
        );
        expect(result.index_patterns).toEqual(result.required);
        expect(result.missing).toEqual(expect.arrayContaining(['logs-aws.*', 'logs-fortinet.*']));
        expect(result.missing).not.toContain(alertsPattern);
        expect(mockDiscover).toHaveBeenCalledTimes(1);
        expect(mockWithModel).not.toHaveBeenCalled();
      });

      it('is discovered:broad after the model declines when the report has IOCs', async () => {
        const esClient = createMockEsClient(new Set([alertsPattern]));
        mockWithModel.mockResolvedValue(undefined);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          model,
          logger,
        });

        expect(result.resolution).toBe('discovered:broad');
        expect(result.status).toBe('degraded');
        expect(result.index_patterns).toEqual(broadSearchPatterns());
        expect(mockWithModel).toHaveBeenCalledTimes(1);
        expect(mockDiscover).toHaveBeenCalledTimes(1);
      });

      it('is discovered:broad after the model returns an empty match list when the report has IOCs', async () => {
        const esClient = createMockEsClient(new Set([alertsPattern]));
        mockWithModel.mockResolvedValue({ matches: [], confidence: 0, scored: [] });
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          model,
          logger,
        });

        expect(result.resolution).toBe('discovered:broad');
      });

      it('still prefers a model match over the broad scope when the report has IOCs', async () => {
        const esClient = createMockEsClient(new Set([alertsPattern]));
        mockWithModel.mockResolvedValue({
          matches: [ciscoDataset],
          confidence: 0.7,
          scored: [{ dataset: 'cisco_asa.log', confidence: 0.7 }],
        });
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          model,
          logger,
        });

        expect(result.resolution).toBe('discovered:model');
        expect(result.required).toEqual(['logs-cisco_asa.log-*']);
      });

      it.each<{ label: string; iocs: HuntIoc[] | undefined }>([
        { label: 'an empty IOC list', iocs: [] },
        { label: 'no IOC list', iocs: undefined },
      ])(
        'stays blocked:model_unavailable with $label and no model',
        async ({ iocs: reportIocs }) => {
          const esClient = createMockEsClient(new Set([alertsPattern]));
          const result = await resolveHuntScope({
            esClient,
            spaceId: SPACE_ID,
            report: { ...report, iocs: reportIocs },
            logger,
          });

          expect(result.status).toBe('blocked');
          expect(result.resolution).toBe('blocked:model_unavailable');
          expect(result.index_patterns).toEqual([]);
        }
      );

      it.each<{ label: string; iocs: HuntIoc[] | undefined }>([
        { label: 'an empty IOC list', iocs: [] },
        { label: 'no IOC list', iocs: undefined },
      ])(
        'stays blocked:model_declined with $label after the model declines',
        async ({ iocs: reportIocs }) => {
          const esClient = createMockEsClient(new Set([alertsPattern]));
          mockWithModel.mockResolvedValue(undefined);
          const result = await resolveHuntScope({
            esClient,
            spaceId: SPACE_ID,
            report: { ...report, iocs: reportIocs },
            model,
            logger,
          });

          expect(result.status).toBe('blocked');
          expect(result.resolution).toBe('blocked:model_declined');
          expect(result.index_patterns).toEqual([]);
        }
      );

      it('is still degraded and lists the alerts alias as missing when it is absent', async () => {
        const esClient = createMockEsClient(new Set());
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          logger,
        });

        expect(result.resolution).toBe('discovered:broad');
        expect(result.status).toBe('degraded');
        expect(result.missing).toContain(alertsPattern);
        expect(result.required).toEqual(broadSearchPatterns());
      });

      it('searches one bounded wildcard with the internal datasets excluded, however many datasets exist', async () => {
        const esClient = createMockEsClient(new Set([alertsPattern]));
        const manyDatasets: DiscoveredDataset[] = ['a', 'b', 'c', 'd', 'e'].map((name) => ({
          index_pattern: `logs-${name}.log-*`,
          dataset: `${name}.log`,
          vendor: name,
          data_streams: [`logs-${name}.log-default`],
          search_patterns: [`logs-${name}.log-*`],
        }));
        mockDiscover.mockResolvedValue(manyDatasets);
        const result = await resolveHuntScope({
          esClient,
          spaceId: SPACE_ID,
          report: iocReport,
          logger,
        });

        // Not the dataset list: the client puts `index` in the request path, and an estate
        // of a hundred-odd datasets would exceed Elasticsearch's initial-line limit.
        expect(result.required).toEqual(['logs-*', '-logs-elastic_agent*', '-logs-fleet_server*']);
        expect(result.index_patterns).toEqual(result.required);
        expect(logger.info).toHaveBeenCalledWith(
          'Hunt scope resolved via discovered:broad: 3 index pattern(s): logs-*, -logs-elastic_agent*, -logs-fleet_server*'
        );
        expect(logger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('Hunt scope blocked')
        );
      });
    });
  });
});

describe('parseTechnologyInput', () => {
  it.each([undefined, null, ''])('treats %p as "resolve from the environment"', (value) => {
    expect(parseTechnologyInput(value)).toEqual({});
  });

  it('accepts a known technology', () => {
    expect(parseTechnologyInput('fortigate')).toEqual({ technology: 'fortigate' });
  });

  it('flags an unknown technology', () => {
    expect(parseTechnologyInput('okta')).toEqual({ invalid: 'okta' });
  });
});
