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
  buildPackArticleDataUrl,
  buildPackRssDataUrl,
  collectPackJoinFieldValues,
  PACK_TI_SCENARIOS,
  resolveThreatIntelPackIds,
  scenarioRssMustContain,
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
        ...scenario.tags,
      ].join('\n');
      expect(blob.toLowerCase()).not.toContain('data-generator');
      expect(blob.toLowerCase()).not.toContain('data generator');
    }
    expect(THREAT_INTEL_SUBSCRIPTION_ID.toLowerCase()).not.toContain('data-generator');
  });

  it('builds a data:text/html article URL that embeds the scenario title and body', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const articleUrl = buildPackArticleDataUrl(scenario);
      expect(articleUrl.startsWith('data:text/html;charset=utf-8,')).toBe(true);
      const html = decodeURIComponent(articleUrl.replace(/^data:text\/html;charset=utf-8,/, ''));
      expect(html).toContain(scenario.title);
      expect(html).toContain(scenario.name);
      // Body is HTML-escaped (e.g. ATT&CK → ATT&amp;CK), so match a stable unescaped slice.
      expect(html).toContain(scenario.body.slice(0, 48));
    }
  });

  it('embeds join IOCs, narrative anchors, and the HTML article data URL in the RSS payload', () => {
    for (const scenario of Object.values(PACK_TI_SCENARIOS)) {
      const url = buildPackRssDataUrl({
        scenario,
        reportTimestamp: '2026-07-16T12:00:00.000Z',
      });
      expect(url.startsWith('data:application/rss+xml')).toBe(true);
      const xml = decodeURIComponent(url.replace(/^data:application\/rss\+xml;charset=utf-8,/, ''));
      for (const token of scenarioRssMustContain(scenario)) {
        expect(xml).toContain(token);
      }
      expect(xml).toContain(scenario.title);
      expect(xml).toContain(buildPackArticleDataUrl(scenario));
      expect(xml).not.toContain('example.elastic.dev');
      expect(xml).not.toContain('elastic.co/security-labs');
      expect(xml.toLowerCase()).not.toContain('data-generator');
      expect(xml.toLowerCase()).not.toContain('data generator');
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
