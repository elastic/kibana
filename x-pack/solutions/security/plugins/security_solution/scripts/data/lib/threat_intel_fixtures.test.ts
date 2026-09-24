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

  it('gives aws-iam four scenarios and every other pack exactly one', () => {
    expect(PACK_TI_SCENARIOS['aws-iam']).toHaveLength(4);
    expect(PACK_TI_SCENARIOS.okta).toHaveLength(1);
    expect(PACK_TI_SCENARIOS.kubernetes).toHaveLength(1);
    expect(PACK_TI_SCENARIOS['github-actions']).toHaveLength(1);
  });

  it('uses stable threat-intel source ids without data-generator branding', () => {
    expect(allThreatIntelSourceIds().sort()).toEqual([
      'aws-iam-assume-role',
      'aws-iam-behavior-only',
      'aws-iam-ioc-only',
      'ti-rss-aws-iam',
      'ti-rss-github-actions',
      'ti-rss-kubernetes',
      'ti-rss-okta',
    ]);
  });

  it('keeps fixture identity free of data-generator strings', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
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
  });

  it('uses browsable https article URLs for every pack scenario', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      const { protocol } = new URL(scenario.articleUrl);
      expect(protocol === 'http:' || protocol === 'https:').toBe(true);
    }
  });

  it('declares Hub categories and regions for historic report seeding', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      expect(scenario.categories.length).toBeGreaterThan(0);
      expect(scenario.regions.length).toBeGreaterThan(0);
    }
  });

  it('declares distinct historic article variants with join and narrative anchors', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
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
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      const articleUrl = buildPackArticleDataUrl(scenario);
      expect(articleUrl.startsWith('data:text/html;charset=utf-8,')).toBe(true);
      const html = decodeURIComponent(articleUrl.replace(/^data:text\/html;charset=utf-8,/, ''));
      expect(html).toContain(scenario.title);
      expect(html).toContain(scenario.name);
      expect(html).toContain(scenario.body.slice(0, 48));
    }
  });

  it('embeds join IOCs in a single-item current RSS feed without dated titles', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
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
      expect(xml).toContain(scenario.articleUrl);
      expect(xml).not.toContain('example.elastic.dev');
      expect(xml.toLowerCase()).not.toContain('data-generator');
      expect(xml.toLowerCase()).not.toContain('data generator');
    }
  });

  it('includes at least one defanged IP per pack body for discriminating extraction', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      expect(scenario.body).toMatch(/\d+\[\.\]\d+\[\.\]\d+\[\.\]\d+/);
      expect(scenario.joinIocs.some((ioc) => ioc.type === 'ip' && Boolean(ioc.defanged))).toBe(
        true
      );
    }
  });

  it('uses the full kubernetes SA principal as a user join IOC (not the short nickname alone)', () => {
    const k8s = PACK_TI_SCENARIOS.kubernetes[0];
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
    const [primaryOkta] = okta;
    const [primaryAwsIam] = awsIam;
    const [primaryKubernetes] = kubernetes;
    const [primaryGithub] = github;
    // Titles stay natural (no demo prefixes like ACTIVE INCIDENT / Research note).
    expect(primaryOkta.title.toLowerCase()).not.toContain('active incident');
    expect(primaryAwsIam.title.toLowerCase()).not.toContain('investigated campaign');
    expect(primaryKubernetes.title.toLowerCase()).not.toMatch(/^advisory:/);
    expect(primaryGithub.title.toLowerCase()).not.toContain('research note');
    // Severity ladder lives in body wording for classify_severity.
    expect(primaryOkta.body.toLowerCase()).toMatch(
      /ongoing breach|ransomware-adjacent|immediately/
    );
    expect(primaryAwsIam.body.toLowerCase()).toMatch(/confirmed|prioritize|does not assert/);
    expect(primaryKubernetes.body.toLowerCase()).toMatch(
      /advisory|monitoring guidance|does not claim/
    );
    expect(primaryGithub.body.toLowerCase()).toMatch(
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
      scenario: PACK_TI_SCENARIOS.okta[0],
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
    const scenario = PACK_TI_SCENARIOS.okta[0];
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      scenario,
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
    const scenario = PACK_TI_SCENARIOS.okta[0];
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      scenario,
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
    const scenario = PACK_TI_SCENARIOS.okta[0];
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
    const scenario = PACK_TI_SCENARIOS.okta[0];
    const endMs = Date.parse('2026-07-21T18:00:00.000Z');
    const startMs = Date.parse('2026-01-01T00:00:00.000Z');
    const items = buildPackHistoricReportItemsForScenario({
      scenario,
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
    const scenario = PACK_TI_SCENARIOS.okta[0];
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
    const scenarios = Object.values(PACK_TI_SCENARIOS).flat();
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
    expect(older.size).toBe(7);
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
  it('places every env-bound join IOC on mustard hunt ECS fields after pack enrich', async () => {
    const missing: string[] = [];

    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      if (scenario.joinIocsArticleOnly) continue;
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

  it('keeps article-only join IOCs off pack ECS so Tier 1 stays clean for behavior-only', async () => {
    const scenario = PACK_TI_SCENARIOS['aws-iam'].find((s) => s.reportIdSlug === 'aws-iam-behavior-only');
    expect(scenario?.joinIocsArticleOnly).toBe(true);
    const eventsPath = path.join(scriptsDataDir('packs', 'aws-iam'), 'events.ndjson');
    const raw = await readNdjson(eventsPath);
    const docs = raw.map((doc) => {
      const next = structuredClone(doc);
      ensureEcsSourceIp(next);
      enrichDocForGraph(next);
      return next;
    });
    for (const ioc of scenario!.joinIocs) {
      const fieldValues = collectPackJoinFieldValues(docs, ioc.type);
      expect(fieldValues.has(ioc.value)).toBe(false);
    }
  });
});

describe('resolveThreatIntelPackIds', () => {
  it('returns all packs when input is empty', () => {
    expect(resolveThreatIntelPackIds([]).sort()).toEqual([
      'aws-iam',
      'github-actions',
      'ip-fields',
      'kubernetes',
      'okta',
    ]);
  });

  it('preserves an explicit pack subset', () => {
    expect(resolveThreatIntelPackIds(['okta', 'aws-iam'])).toEqual(['okta', 'aws-iam']);
  });
});

describe('deterministic historic report ids', () => {
  const buildAllHistoricDocs = () => {
    const spaceId = 'default';
    const feedUrl = 'data:text/html,stub';
    const scenarios = Object.values(PACK_TI_SCENARIOS).flat();
    const docs = scenarios.flatMap((scenario, packIndex) => {
      const items = buildPackHistoricReportItemsForScenario({
        scenario,
        packIndex,
        packCount: scenarios.length,
        startMs: Date.parse('2026-01-01T00:00:00.000Z'),
        endMs: Date.parse('2026-07-21T00:00:00.000Z'),
        reportsPerPack: 12,
      });
      return items.map((item, itemIndex) =>
        buildHistoricThreatReportDoc({
          scenario,
          item,
          itemIndex,
          packIndex,
          reportsPerPack: 12,
          spaceId,
          feedUrl,
          kind: 'historic',
        })
      );
    });
    return docs;
  };

  it('names guids `ti-report-<reportIdSlug>-historic-NN`, capped at 99 slots by the 2-digit NN', () => {
    const docs = buildAllHistoricDocs();
    const ids = docs.map((doc) => doc.lineage.source_doc_ref.id);
    expect(ids).toContain('ti-report-aws-iam-historic-01');
    expect(ids).toContain('ti-report-aws-iam-assume-role-historic-01');
    expect(ids).toContain('ti-report-aws-iam-ioc-only-historic-01');
    expect(ids).toContain('ti-report-aws-iam-behavior-only-historic-01');
    for (const id of ids) {
      expect(id).toMatch(/^ti-report-[a-z0-9-]+-historic-\d{2}$/);
    }
  });

  it('produces a unique id per report across all seven scenarios (guards the packId collision)', () => {
    const ids = buildAllHistoricDocs().map((doc) => doc.lineage.source_doc_ref.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(84);
  });

  it('builds identical ids and docs from identical inputs (idempotent by construction)', () => {
    const first = buildAllHistoricDocs();
    const second = buildAllHistoricDocs();
    expect(second).toEqual(first);
  });
});

describe('per-slot correlation anchors', () => {
  const buildAllHistoricDocsWithIds = () => {
    const spaceId = 'default';
    const feedUrl = 'data:text/html,stub';
    const scenarios = Object.values(PACK_TI_SCENARIOS).flat();
    return scenarios.flatMap((scenario, packIndex) => {
      const items = buildPackHistoricReportItemsForScenario({
        scenario,
        packIndex,
        packCount: scenarios.length,
        startMs: Date.parse('2026-01-01T00:00:00.000Z'),
        endMs: Date.parse('2026-07-21T00:00:00.000Z'),
        reportsPerPack: 12,
      });
      return items.map((item, itemIndex) =>
        buildHistoricThreatReportDoc({
          scenario,
          item,
          itemIndex,
          packIndex,
          reportsPerPack: 12,
          spaceId,
          feedUrl,
          kind: 'historic',
        })
      );
    });
  };

  // Mirrors the discriminating-anchor rules in search_by_anchors.ts: a `threat_actors`
  // entry or a hash-typed IOC value correlates two reports; every doc excludes itself.
  const discriminatingAnchorsForDoc = (
    doc: ReturnType<typeof buildAllHistoricDocsWithIds>[number]
  ) => {
    const actors = doc.extracted?.threat_actors ?? [];
    const hashes = (doc.extracted?.iocs ?? [])
      .filter((ioc) => ioc.type === 'hash')
      .map((ioc) => ioc.value);
    return { actors, hashes };
  };

  it('correlates exactly the anchored A/B pair and nothing else', () => {
    const docs = buildAllHistoricDocsWithIds();
    const byId = new Map(docs.map((doc) => [doc.lineage.source_doc_ref.id, doc]));

    const matchesFor = (id: string) => {
      const anchors = discriminatingAnchorsForDoc(byId.get(id)!);
      const matches = new Set<string>();
      for (const other of docs) {
        const otherId = other.lineage.source_doc_ref.id;
        if (otherId !== id) {
          const otherAnchors = discriminatingAnchorsForDoc(other);
          const sharesActor = anchors.actors.some((a) => otherAnchors.actors.includes(a));
          const sharesHash = anchors.hashes.some((h) => otherAnchors.hashes.includes(h));
          if (sharesActor || sharesHash) matches.add(otherId);
        }
      }
      return matches;
    };

    const reportA = 'ti-report-aws-iam-historic-01';
    const reportB = 'ti-report-aws-iam-assume-role-historic-01';
    expect(matchesFor(reportA)).toEqual(new Set([reportB]));
    expect(matchesFor(reportB)).toEqual(new Set([reportA]));

    const anchoredIds = docs
      .filter((doc) => discriminatingAnchorsForDoc(doc).actors.length > 0)
      .map((doc) => doc.lineage.source_doc_ref.id);
    expect(new Set(anchoredIds)).toEqual(new Set([reportA, reportB]));

    for (const doc of docs) {
      const id = doc.lineage.source_doc_ref.id;
      if (id !== reportA && id !== reportB) {
        expect(matchesFor(id).size).toBe(0);
      }
    }
  });

  it('keeps every actor string and hash IOC value scoped to only the intended pair', () => {
    // Technique ids may legitimately overlap (okta and aws-iam both carry T1078.004);
    // that overlap is boost-only in the gate (minimum_should_match on discriminating
    // clauses only) and is not asserted here.
    const docs = buildAllHistoricDocsWithIds();
    const actorOwners = new Map<string, Set<string>>();
    const hashOwners = new Map<string, Set<string>>();
    for (const doc of docs) {
      const { actors, hashes } = discriminatingAnchorsForDoc(doc);
      for (const actor of actors) {
        actorOwners.set(actor, (actorOwners.get(actor) ?? new Set()).add(doc.source.adapter_id));
      }
      for (const hash of hashes) {
        hashOwners.set(hash, (hashOwners.get(hash) ?? new Set()).add(doc.source.adapter_id));
      }
    }
    for (const owners of actorOwners.values()) {
      expect(owners.size).toBeLessThanOrEqual(2);
    }
    for (const owners of hashOwners.values()) {
      expect(owners.size).toBeLessThanOrEqual(2);
    }

    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      if (scenario.packId !== 'aws-iam') {
        expect(scenario.historicAnchors).toBeUndefined();
      }
    }
  });

  it('never puts a hash-typed IOC into joinIocs (report-only, not a join contract)', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS).flat()) {
      expect(scenario.joinIocs.some((ioc) => (ioc.type as string) === 'hash')).toBe(false);
    }
  });

  it('names the attributed intrusion set in aws-iam canonical body text for Diamond suitability', () => {
    // enrich_taxonomy's diamond_suitable gate requires the report itself to name an
    // attributed actor/campaign, not just carry a threat_actors field on the extracted
    // doc. historicAnchors.threatActors never reaches content.body_text, so the actor
    // name must be woven into the prose directly (mirrors the okta scenario's pattern).
    // Behavior-only has no historicAnchors: it is a Tier 2 execute fixture, not a diamond demo.
    const awsIamScenarios = PACK_TI_SCENARIOS['aws-iam'].filter((s) => s.historicAnchors);
    expect(awsIamScenarios.length).toBeGreaterThan(0);
    for (const scenario of awsIamScenarios) {
      expect(scenario.historicAnchors?.threatActors.length).toBeGreaterThan(0);
      const namedActor = scenario.historicAnchors!.threatActors[0];
      expect(scenario.body).toContain(namedActor);
    }
  });

  it('names the attributed intrusion set in the anchored historic-article body too', () => {
    // buildHistoricThreatReportDoc renders content.body_text from historicArticles[itemIndex],
    // not from scenario.body, whenever historicArticles is non-empty. The seeded
    // ti-report-*-historic-01 docs (the ones the diamond-extraction demo actually reads) use
    // historicArticles[0], so the actor name must also be woven into that slot's prose, not
    // just scenario.body's live/RSS twin.
    const awsIamScenarios = PACK_TI_SCENARIOS['aws-iam'].filter((s) => s.historicAnchors);
    expect(awsIamScenarios.length).toBeGreaterThan(0);
    for (const scenario of awsIamScenarios) {
      const namedActor = scenario.historicAnchors!.threatActors[0];
      expect(scenario.historicArticles[0]?.body).toContain(namedActor);
    }
  });
});
