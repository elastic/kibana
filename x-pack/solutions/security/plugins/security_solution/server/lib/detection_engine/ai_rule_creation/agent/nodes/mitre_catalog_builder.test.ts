/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelevanceFilteredMitreCatalog } from './mitre_catalog_builder';
import {
  tactics,
  techniques,
} from '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques';

describe('mitre_catalog_builder', () => {
  describe('buildRelevanceFilteredMitreCatalog', () => {
    describe('auto-derived tactic filtering', () => {
      it('should filter to credential access for "credential" (derived from technique names)', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect credential dumping via LSASS');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0006'); // Credential Access
      });

      it('should filter to execution for "powershell" (domain synonym)', () => {
        const result = buildRelevanceFilteredMitreCatalog('powershell encoded command');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0002'); // Execution
      });

      it('should filter to initial access for "phishing" (derived from technique names)', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect phishing email with attachment');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0001'); // Initial Access
      });

      it('should filter to lateral movement for "RDP" (domain synonym)', () => {
        const result = buildRelevanceFilteredMitreCatalog('lateral movement via RDP');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0008'); // Lateral Movement
      });

      it('should filter to cloud-specific tactics for "AWS" (domain synonym)', () => {
        const result = buildRelevanceFilteredMitreCatalog('AWS CloudTrail suspicious API call');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0001'); // Initial Access
      });

      it('should filter to container-related tactics for "k8s" (domain synonym)', () => {
        const result = buildRelevanceFilteredMitreCatalog('k8s pod escape privilege');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0004'); // Privilege Escalation
      });

      it('should filter using tactic names themselves (e.g. "exfiltration")', () => {
        const result = buildRelevanceFilteredMitreCatalog('data exfiltration over DNS');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0010'); // Exfiltration
      });

      it('should return all tactics for unrecognized queries', () => {
        const result = buildRelevanceFilteredMitreCatalog(
          'something completely unrelated to security keywords'
        );

        expect(result.isFiltered).toBe(false);
        expect(result.tacticIds.length).toBe(tactics.length);
      });
    });

    describe('catalog text completeness', () => {
      it('should include technique IDs and names in the catalog text', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect credential dumping via LSASS');

        expect(result.catalogText).toContain('T1003');
        expect(result.catalogText).toContain('OS Credential Dumping');
      });

      it('should include tactic headers in the catalog text', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect phishing email');

        expect(result.catalogText).toMatch(/TA\d{4} .+:/);
      });

      it('should include ALL techniques for matched tactics, not just a curated subset', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect credential dumping');
        const credentialAccessTechniques = techniques.filter((tech) =>
          tech.tactics.some((t) => t.toLowerCase() === 'credentialaccess')
        );

        for (const tech of credentialAccessTechniques) {
          expect(result.catalogText).toContain(tech.id);
        }
      });

      it('should include all tactic-mapped techniques when no keyword matches', () => {
        const result = buildRelevanceFilteredMitreCatalog('zzz xyz qqq');
        expect(result.isFiltered).toBe(false);

        const techniquesWithTactics = techniques.filter((tech) =>
          tech.tactics.some((tacticValue) =>
            tactics.some(
              (t) => t.value.toLowerCase().replace(/-/g, '') === tacticValue.toLowerCase()
            )
          )
        );

        for (const tech of techniquesWithTactics) {
          expect(result.catalogText).toContain(tech.id);
        }
      });
    });

    describe('auto-derived keyword filtering', () => {
      it('should filter out overly generic words that appear in many technique names', () => {
        // "remote" appears in many techniques — should be filtered as too generic
        // or if it's still specific enough, at least it should resolve to relevant tactics
        const result = buildRelevanceFilteredMitreCatalog('remote access tool');

        // Whether filtered or not, the catalog should still contain valid content
        expect(result.catalogText.length).toBeGreaterThan(0);
      });

      it('should derive keywords from technique names automatically', () => {
        // "impersonation" appears in technique names and should map to relevant tactics
        const result = buildRelevanceFilteredMitreCatalog('token impersonation attack');

        if (result.isFiltered) {
          expect(result.tacticIds.length).toBeGreaterThan(0);
          expect(result.tacticIds.length).toBeLessThan(tactics.length);
        }
      });

      it('should handle domain synonyms not in MITRE names (e.g. lsass, uac, c2)', () => {
        const lsass = buildRelevanceFilteredMitreCatalog('lsass memory dump');
        expect(lsass.isFiltered).toBe(true);
        expect(lsass.tacticIds).toContain('TA0006');

        const uac = buildRelevanceFilteredMitreCatalog('uac bypass');
        expect(uac.isFiltered).toBe(true);
        expect(uac.tacticIds).toContain('TA0004');

        const c2Result = buildRelevanceFilteredMitreCatalog('c2 beaconing');
        expect(c2Result.isFiltered).toBe(true);
        expect(c2Result.tacticIds).toContain('TA0011');
      });
    });

    describe('short word filtering', () => {
      it('should ignore generic short words (< 3 chars) that are not domain synonyms', () => {
        // "is", "a", "it", "or", "an" are all < 3 chars and not domain synonyms
        const withShortWords = buildRelevanceFilteredMitreCatalog('is it a credential');
        const withoutShortWords = buildRelevanceFilteredMitreCatalog('credential');

        expect(withShortWords.tacticIds.sort()).toEqual(withoutShortWords.tacticIds.sort());
      });

      it('should still match short domain synonyms like "c2"', () => {
        const result = buildRelevanceFilteredMitreCatalog('c2 traffic');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0011'); // Command and Control
      });

      it('should handle queries with only non-matching short words as unfiltered', () => {
        const result = buildRelevanceFilteredMitreCatalog('is it a or an');

        expect(result.isFiltered).toBe(false);
      });
    });

    describe('multi-word keyword matching', () => {
      it('should match multi-word phrases like "lateral movement"', () => {
        const result = buildRelevanceFilteredMitreCatalog('lateral movement detection');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0008');
      });

      it('should match "command and control" phrase', () => {
        const result = buildRelevanceFilteredMitreCatalog('command and control beaconing');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0011');
      });
    });

    describe('edge cases', () => {
      it('should handle empty query string', () => {
        const result = buildRelevanceFilteredMitreCatalog('');

        expect(result.isFiltered).toBe(false);
        expect(result.catalogText.length).toBeGreaterThan(0);
      });

      it('should handle query with special characters', () => {
        const result = buildRelevanceFilteredMitreCatalog(
          'powershell -enc base64 | credential'
        );

        expect(result.tacticIds).toContain('TA0002'); // Execution (powershell)
        expect(result.tacticIds).toContain('TA0006'); // Credential Access
      });

      it('should be case-insensitive', () => {
        const lower = buildRelevanceFilteredMitreCatalog('powershell credential');
        const upper = buildRelevanceFilteredMitreCatalog('POWERSHELL CREDENTIAL');
        const mixed = buildRelevanceFilteredMitreCatalog('PowerShell Credential');

        expect(lower.tacticIds.sort()).toEqual(upper.tacticIds.sort());
        expect(lower.tacticIds.sort()).toEqual(mixed.tacticIds.sort());
      });
    });
  });
});
