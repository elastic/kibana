/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReportSpecs } from './report_documents';
import { loadManifest, loadSamples } from './load_corpus';
import { leakAuditHolds, leakAuditTokens } from '../harness/phases';
import { flattenDocText } from '../harness/examples';

const manifest = loadManifest();
const samples = loadSamples();

/** What the harness feeds the C2 token extractor at run time: flattened, not JSON.stringify. */
const seededTexts = Object.values(samples).map((s) => flattenDocText(s));

describe('R-beh narratives vs the C2 leak audit (live-run regression)', () => {
  // Captured live (run7 of the smoke): the vendored manifest step texts name
  // the chains' users and hosts, so the narrative leaked E+ tokens and the C2
  // control nulled 8 cells. The narrative must redact every seeded token.
  const tokens = leakAuditTokens(seededTexts);

  it('leak audit tokens are actually extracted from the samples', () => {
    expect(tokens).toEqual(
      expect.arrayContaining(['jordan.park', 'karen.d', 'www-data', 'alice.chen'])
    );
  });

  it.each(['A', 'B'])('arm %s: no R-beh body text leaks an E+ token', (arm) => {
    const specs = buildReportSpecs(manifest, samples, arm as 'A' | 'B');
    const rBeh = specs.filter((spec) => spec.reportClass.startsWith('R-beh'));
    expect(rBeh.length).toBe(5);
    for (const spec of rBeh) {
      const text = String(spec.document['content.body_text'] ?? '');
      expect(leakAuditHolds(JSON.stringify(spec.document), tokens)).toBeNull();
      expect(text).not.toMatch(/jordan\.park|karen\.d|alice\.chen|www-data|srv-files-02|dc-fs-09/);
    }
  });
});
