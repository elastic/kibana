/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { readNdjson } from './episodes';
import { enrichDocForGraph } from './graph_enrichment';
import { scriptsDataDir } from './indexing';
import { ensureEcsSourceIp } from './packs';
import {
  allThreatIntelSourceIds,
  buildHistoricThreatReportDoc,
  buildPackArticleDataUrl,
  buildPackHistoricReportItemsForScenario,
  buildPackRssCurrentReportItems,
  buildPackRssDataUrl,
  collectPackJoinFieldValues,
  PACK_TI_SCENARIOS,
  reportTimestampRatiosForPack,
  reportTimestampsForWindow,
  resolveHistoricSourceName,
  resolveHistoricThreatIntelWindow,
  resolveThreatIntelPackIds,
  scenarioRssMustContain,
  THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT,
  THREAT_INTEL_LIVE_WINDOW_MS,
  THREAT_INTEL_RSS_CURRENT_ITEMS_PER_PACK,
  THREAT_INTEL_SUBSCRIPTION_ID,
} from './threat_intel_fixtures';

describe('PACK_TI_SCENARIOS', () => {
  it('covers the four Technology Watch packs', () => {
    expect(Object.keys(PACK_TI_SCENARIOS).sort()).toEqual([
      'aws-iam',
      'github-actions',
      'kubernetes',
      'okta',
    ]);
  });

  it('uses stable threat-intel source ids without data-generator branding', () => {
    expect(allThreatIntelSourceIds().sort()).toEqual([
      'ti-rss-aws-iam',
      'ti-rss-github-actions',
      'ti-rss-kubernetes',
      'ti-rss-okta',
    ]);
    expect(THREAT_INTEL_SUBSCRIPTION_ID).toEqual('threat-intel-digest');
  });

  it('keeps fixture identity free of data-generator strings', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const blob = [
        scenario.sourceId,
        scenario.name,
        scenario.title,
        scenario.body,
        scenario.historicSourceAliases.emerging,
        ...scenario.historicArticles.flatMap((article) => [article.title, article.body]),
        ...scenario.tags,
      ].join('\n');
      expect(blob.toLowerCase()).not.toContain('data-generator');
      expect(blob.toLowerCase()).not.toContain('data generator');
    }
    expect(THREAT_INTEL_SUBSCRIPTION_ID.toLowerCase()).not.toContain('data-generator');
  });

  it('declares Hub categories and regions for historic report seeding', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      expect(scenario.categories.length).toBeGreaterThan(0);
      expect(scenario.regions.length).toBeGreaterThan(0);
    }
  });

  it('declares distinct historic article variants with join and narrative anchors', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      expect(scenario.historicArticles.length).toBeGreaterThanOrEqual(4);
      const titles = scenario.historicArticles.map((article) => article.title);
      expect(new Set(titles).size).toEqual(titles.length);
      for (const article of scenario.historicArticles) {
        for (const token of scenarioRssMustContain(scenario)) {
          expect(article.body).toContain(token);
        }
        expect(article.body).toMatch(/\d+\[\.\]\d+\[\.\]\d+\[\.\]\d+/);
      }
    }
  });

  it('builds a data:text/html article URL that embeds the scenario title and body', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const articleUrl = buildPackArticleDataUrl(scenario);
      expect(articleUrl.startsWith('data:text/html;charset=utf-8,')).toBe(true);
      const html = decodeURIComponent(articleUrl.replace(/^data:text\/html;charset=utf-8,/, ''));
      expect(html).toContain(scenario.title);
      expect(html).toContain(scenario.name);
      expect(html).toContain(scenario.body.slice(0, 48));
    }
  });

  it('embeds join IOCs in a single-item current RSS feed without dated titles', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const reportItems = buildPackRssCurrentReportItems({
        endMs: Date.parse('2026-07-01T00:00:00.000Z'),
      });
      const url = buildPackRssDataUrl({
        scenario,
        reportItems,
      });
      expect(url.startsWith('data:application/rss+xml')).toBe(true);
      const xml = decodeURIComponent(url.replace(/^data:application\/rss\+xml;charset=utf-8,/, ''));
      for (const token of scenarioRssMustContain(scenario)) {
        expect(xml).toContain(token);
      }
      expect(xml).toContain(scenario.title);
      expect(xml.match(/<item>/g)?.length).toEqual(THREAT_INTEL_RSS_CURRENT_ITEMS_PER_PACK);
      expect(xml).toContain('-current-');
      expect(xml).not.toContain('-historic-');
      expect(xml).not.toMatch(/\(20\d{2}-\d{2}-\d{2}\)/);
    }
  });

  it('includes at least one defanged IP per pack body for discriminating extraction', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      expect(scenario.body).toMatch(/\d+\[\.\]\d+\[\.\]\d+\[\.\]\d+/);
      expect(scenario.joinIocs.some((ioc) => ioc.type === 'ip' && Boolean(ioc.defanged))).toBe(
        true
      );
    }
  });

  it('uses the full kubernetes SA principal as a user join IOC (not the short nickname alone)', () => {
    const k8s = PACK_TI_SCENARIOS.kubernetes;
    expect(k8s.joinIocs).toEqual(
      expect.arrayContaining([
        {
          type: 'user',
          value: 'system:serviceaccount:default:compromised-sa',
        },
      ])
    );
    expect(k8s.narrative).toContain('compromised-sa');
    expect(k8s.joinIocs.some((ioc) => ioc.type === 'user' && ioc.value === 'compromised-sa')).toBe(
      false
    );
  });

  it('diversifies live RSS body tone so enrich can classify mixed severities', () => {
    const { okta, 'aws-iam': awsIam, kubernetes, 'github-actions': github } = PACK_TI_SCENARIOS;
    // Titles stay natural (no demo prefixes like ACTIVE INCIDENT / Research note).
    expect(okta.title.toLowerCase()).not.toContain('active incident');
    expect(awsIam.title.toLowerCase()).not.toContain('investigated campaign');
    expect(kubernetes.title.toLowerCase()).not.toMatch(/^advisory:/);
    expect(github.title.toLowerCase()).not.toContain('research note');
    // Severity ladder lives in body wording for classify_severity.
    expect(okta.body.toLowerCase()).toMatch(/ongoing breach|ransomware-adjacent|immediately/);
    expect(awsIam.body.toLowerCase()).toMatch(/confirmed|prioritize|does not assert/);
    expect(kubernetes.body.toLowerCase()).toMatch(/advisory|monitoring guidance|does not claim/);
    expect(github.body.toLowerCase()).toMatch(
      /background research|no immediate incident response|situational awareness/
    );
  });
});

describe('threat intel report timestamps', () => {
  it('returns twelve sorted ratios per pack inside the open interval by default', () => {
    const ratios = reportTimestampRatiosForPack(1, 4);
    expect(ratios).toHaveLength(THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT);
    expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThan(0.02);
      expect(ratio).toBeLessThan(0.98);
    }
  });

  it('offsets timestamps by pack index across the generator window', () => {
    const startMs = Date.parse('2025-01-01T00:00:00.000Z');
    const endMs = Date.parse('2025-07-01T00:00:00.000Z');
    const timestampsA = reportTimestampsForWindow(
      startMs,
      endMs,
      reportTimestampRatiosForPack(0, 4)
    );
    const timestampsB = reportTimestampsForWindow(
      startMs,
      endMs,
      reportTimestampRatiosForPack(3, 4)
    );
    expect(timestampsA).not.toEqual(timestampsB);
  });

  it('places RSS current items near endMs and historic items across the full window', () => {
    const startMs = Date.parse('2025-01-01T00:00:00.000Z');
    const endMs = Date.parse('2025-07-01T00:00:00.000Z');
    const current = buildPackRssCurrentReportItems({ endMs });
    const historic = buildPackHistoricReportItemsForScenario({
      packIndex: 0,
      packCount: 4,
      startMs,
      endMs,
    });
    expect(current).toHaveLength(THREAT_INTEL_RSS_CURRENT_ITEMS_PER_PACK);
    expect(historic).toHaveLength(THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT);
    expect(Date.parse(historic[0].reportTimestamp)).toBeLessThan(
      Date.parse(current[0].reportTimestamp)
    );
  });
});

describe('buildHistoricThreatReportDoc', () => {
  it('assigns critical severity to the newest historic slot per pack', () => {
    const scenario = PACK_TI_SCENARIOS.okta;
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      packIndex: 0,
      packCount: 4,
      startMs,
      endMs,
      reportsPerPack: 4,
    });
    const feedUrl = buildPackRssDataUrl({
      scenario,
      reportItems: buildPackRssCurrentReportItems({
        endMs: Date.parse('2026-07-22T18:00:00.000Z'),
      }),
    });
    const newest = buildHistoricThreatReportDoc({
      scenario,
      item: items[items.length - 1],
      itemIndex: items.length - 1,
      reportsPerPack: 4,
      spaceId: 'default',
      feedUrl,
      kind: 'historic',
    });
    const oldest = buildHistoricThreatReportDoc({
      scenario,
      item: items[0],
      itemIndex: 0,
      reportsPerPack: 4,
      spaceId: 'default',
      feedUrl,
      kind: 'historic',
    });
    expect(newest.severity.level).toEqual('critical');
    expect(oldest.severity.level).not.toEqual('critical');
  });

  it('rotates historic article variants without date-suffix titles', () => {
    const scenario = PACK_TI_SCENARIOS.okta;
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      packIndex: 0,
      packCount: 4,
      startMs,
      endMs,
      reportsPerPack: 12,
    });
    const feedUrl = buildPackRssDataUrl({
      scenario,
      reportItems: buildPackRssCurrentReportItems({
        endMs: Date.parse('2026-07-22T18:00:00.000Z'),
      }),
    });
    const titles = items.map((item, itemIndex) => {
      const doc = buildHistoricThreatReportDoc({
        scenario,
        item,
        itemIndex,
        reportsPerPack: 12,
        spaceId: 'default',
        feedUrl,
        kind: 'historic',
      });
      expect(doc.content.title).not.toMatch(/\(20\d{2}-\d{2}-\d{2}\)/);
      expect(doc.content.body_text).toContain(
        scenario.historicArticles[itemIndex % scenario.historicArticles.length].body.slice(0, 48)
      );
      return doc.content.title;
    });
    expect(new Set(titles).size).toBeGreaterThan(1);
    expect(titles).toContain(scenario.historicArticles[0].title);
    expect(titles).not.toContain(scenario.title);
  });

  it('keeps live kind on the canonical scenario title and body', () => {
    const scenario = PACK_TI_SCENARIOS.okta;
    const feedUrl = buildPackRssDataUrl({
      scenario,
      reportItems: buildPackRssCurrentReportItems({
        endMs: Date.parse('2026-07-22T18:00:00.000Z'),
      }),
    });
    const doc = buildHistoricThreatReportDoc({
      scenario,
      item: { itemKey: 'current-0', reportTimestamp: '2026-07-22T17:00:00.000Z' },
      itemIndex: 0,
      spaceId: 'default',
      feedUrl,
      kind: 'live',
    });
    expect(doc.content.title).toEqual(scenario.title);
    expect(doc.content.body_text.startsWith(scenario.body)).toBe(true);
    expect(doc.source.name).toEqual(scenario.name);
  });

  it('introduces emerging source names only on the newest historic slots', () => {
    const scenario = PACK_TI_SCENARIOS.okta;
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      packIndex: 0,
      packCount: 4,
      startMs,
      endMs,
      reportsPerPack: 12,
    });
    const feedUrl = buildPackRssDataUrl({
      scenario,
      reportItems: buildPackRssCurrentReportItems({
        endMs: Date.parse('2026-07-22T18:00:00.000Z'),
      }),
    });
    const names = items.map((item, itemIndex) => {
      const doc = buildHistoricThreatReportDoc({
        scenario,
        item,
        itemIndex,
        reportsPerPack: 12,
        spaceId: 'default',
        feedUrl,
        kind: 'historic',
      });
      return doc.source.name;
    });
    expect(names[0]).toEqual(scenario.name);
    expect(names[names.length - 1]).toEqual(scenario.historicSourceAliases.emerging);
    expect(names.filter((n) => n === scenario.name).length).toBeGreaterThan(
      names.filter((n) => n === scenario.historicSourceAliases.emerging).length
    );
  });
});

describe('resolveHistoricSourceName', () => {
  it('keeps older slots canonical and switches to emerging near the end', () => {
    const scenario = PACK_TI_SCENARIOS.okta;
    expect(resolveHistoricSourceName({ scenario, itemIndex: 0, reportsPerPack: 12 })).toEqual(
      scenario.name
    );
    expect(resolveHistoricSourceName({ scenario, itemIndex: 6, reportsPerPack: 12 })).toEqual(
      scenario.name
    );
    expect(resolveHistoricSourceName({ scenario, itemIndex: 11, reportsPerPack: 12 })).toEqual(
      scenario.historicSourceAliases.emerging
    );
  });

  it('makes older halves of a pack run smaller source sets than newer halves', () => {
    const scenarios = Object.values(PACK_TI_SCENARIOS);
    const reportsPerPack = 12;
    const older = new Set<string>();
    const newer = new Set<string>();
    for (const scenario of scenarios) {
      for (let i = 0; i < reportsPerPack; i++) {
        const name = resolveHistoricSourceName({ scenario, itemIndex: i, reportsPerPack });
        if (i < reportsPerPack / 2) older.add(name);
        else newer.add(name);
      }
    }
    expect(older.size).toBe(4);
    expect(newer.size).toBeGreaterThan(older.size);
  });
});

describe('resolveHistoricThreatIntelWindow', () => {
  it('reserves the last 24h for live workflow ingest', () => {
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const endMs = Date.parse('2026-07-22T18:00:00.000Z');
    const { historicStartMs, historicEndMs } = resolveHistoricThreatIntelWindow({
      startMs,
      endMs,
    });
    expect(historicStartMs).toEqual(startMs);
    expect(historicEndMs).toEqual(endMs - THREAT_INTEL_LIVE_WINDOW_MS);
  });

  it('rejects windows that do not leave a live reserve', () => {
    expect(() =>
      resolveHistoricThreatIntelWindow({
        startMs: Date.parse('2026-07-22T12:00:00.000Z'),
        endMs: Date.parse('2026-07-22T18:00:00.000Z'),
      })
    ).toThrow(/wider than the 24h live reserve/);
  });
});

describe('pack TI join contract', () => {
  it('places every join IOC on mustard hunt ECS fields after pack enrich', async () => {
    const missing: string[] = [];

    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const eventsPath = path.join(scriptsDataDir('packs', scenario.packId), 'events.ndjson');
      const raw = await readNdjson(eventsPath);
      const docs = raw.map((doc) => {
        const next = structuredClone(doc);
        ensureEcsSourceIp(next);
        enrichDocForGraph(next);
        return next;
      });

      for (const ioc of scenario.joinIocs) {
        const fieldValues = collectPackJoinFieldValues(docs, ioc.type);
        if (!fieldValues.has(ioc.value)) {
          missing.push(`${scenario.packId}:${ioc.type}:${ioc.value}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

describe('resolveThreatIntelPackIds', () => {
  it('returns all packs when input is empty', () => {
    expect(resolveThreatIntelPackIds([]).sort()).toEqual([
      'aws-iam',
      'github-actions',
      'kubernetes',
      'okta',
    ]);
  });

  it('preserves an explicit pack subset', () => {
    expect(resolveThreatIntelPackIds(['okta', 'aws-iam'])).toEqual(['okta', 'aws-iam']);
  });
});
