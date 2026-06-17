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
    describe('tactic filtering', () => {
      it('should filter to credential access tactics for credential-related queries', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect credential dumping via LSASS');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0006'); // Credential Access
      });

      it('should filter to initial access tactics for phishing queries', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect phishing email with attachment');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0001'); // Initial Access
      });

      it('should filter to lateral movement tactics for network lateral queries', () => {
        const result = buildRelevanceFilteredMitreCatalog('lateral movement via RDP');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0008'); // Lateral Movement
      });

      it('should filter to cloud-specific tactics for AWS queries', () => {
        const result = buildRelevanceFilteredMitreCatalog('AWS CloudTrail suspicious API call');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0001'); // Initial Access
        expect(result.tacticIds).toContain('TA0005'); // Defense Evasion
      });

      it('should filter to Kubernetes-related tactics for container queries', () => {
        const result = buildRelevanceFilteredMitreCatalog('kubernetes pod escape privilege');

        expect(result.isFiltered).toBe(true);
        expect(result.tacticIds).toContain('TA0004'); // Privilege Escalation
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
        const result = buildRelevanceFilteredMitreCatalog('generic security query');
        // Every technique that has at least one tactic mapping should appear
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

    describe('stopword handling', () => {
      it('should ignore common stopwords in the query', () => {
        const withStopwords = buildRelevanceFilteredMitreCatalog(
          'detect the suspicious credential activity'
        );
        const withoutStopwords = buildRelevanceFilteredMitreCatalog('credential');

        expect(withStopwords.tacticIds.sort()).toEqual(withoutStopwords.tacticIds.sort());
      });

      it('should handle queries with only stopwords as unfiltered', () => {
        const result = buildRelevanceFilteredMitreCatalog('detect the suspicious activity');

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
