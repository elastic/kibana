/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  seedMitreEntities,
  deleteAllMitreEntities,
  waitForMitrePopulation,
  createMitreTactic,
  createMitreTechnique,
  createMitreSubtechnique,
  DEFAULT_MOCK_FRAMEWORK_VERSION,
  OLDER_MOCK_FRAMEWORK_VERSION,
} from '../utils';

export default ({ getService }: FtrProviderContext) => {
  const mitreAttackApi = getService('mitreAttackApi');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless GET /internal/mitre/entities', () => {
    before(async () => {
      // This poll ensures the startup populate() method has
      // completed before beforeEach runs deleteAllMitreEntities.
      // Without this guard, the startup bulkCreate could finish after the delete,
      // re-adding docs mid-test and causing assertion failures.
      await waitForMitrePopulation(es, log, loadMitreArtifact().length);
    });

    beforeEach(async () => {
      await deleteAllMitreEntities(es);
    });

    after(async () => {
      // Restore the index to its natural state so subsequent suites start clean.
      await deleteAllMitreEntities(es);
      await seedMitreEntities(es, loadMitreArtifact());
    });

    describe('default retrieval and defaults', () => {
      it('defaults to returning all entity types in three populated buckets', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.tactics.length).to.eql(1);
        expect(body.techniques.length).to.eql(1);
        expect(body.subtechniques.length).to.eql(1);
      });

      it('defaults to the enterprise framework', async () => {
        const mockTactic = createMitreTactic();
        await seedMitreEntities(es, [mockTactic]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.framework).to.eql('enterprise');
      });

      it('defaults to framework_version matching the latest seeded version', async () => {
        const mockTactic = createMitreTactic({ framework_version: '30.0' });
        await seedMitreEntities(es, [mockTactic]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.framework_version).to.eql(mockTactic.framework_version);
      });
    });

    describe('summary contract', () => {
      it('no entity in any bucket carries a description field', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        const allEntities = [...body.tactics, ...body.techniques, ...body.subtechniques];
        expect(allEntities.length).to.eql(3);
        for (const entity of allEntities) {
          expect(entity).not.to.have.key('description');
        }
      });
    });

    describe('types filtering', () => {
      it('returns all three buckets when types is omitted', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.tactics.map((t: { id: string }) => t.id)).to.eql([mockTactic.id]);
        expect(body.techniques.map((t: { id: string }) => t.id)).to.eql([activeTechnique.id]);
        expect(body.subtechniques.map((t: { id: string }) => t.id)).to.eql([mockSubtechnique.id]);
      });

      it('returns only tactics when types=tactic', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        await seedMitreEntities(es, [mockTactic, activeTechnique]);

        const { body, status } = await mitreAttackApi.getEntities({ types: 'tactic' });

        expect(status).to.eql(200);
        expect(body.tactics.map((t: { id: string }) => t.id)).to.eql([mockTactic.id]);
        expect(body.techniques).to.eql([]);
        expect(body.subtechniques).to.eql([]);
      });

      it('returns only techniques when types=technique', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities({ types: 'technique' });

        expect(status).to.eql(200);
        expect(body.tactics).to.eql([]);
        expect(body.techniques.map((t: { id: string }) => t.id)).to.eql([activeTechnique.id]);
        expect(body.subtechniques).to.eql([]);
      });

      it('returns only subtechniques when types=subtechnique', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities({ types: 'subtechnique' });

        expect(status).to.eql(200);
        expect(body.tactics).to.eql([]);
        expect(body.techniques).to.eql([]);
        expect(body.subtechniques.map((t: { id: string }) => t.id)).to.eql([mockSubtechnique.id]);
      });

      it('returns techniques and subtechniques when both types are passed as params', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const mockSubtechnique = createMitreSubtechnique({
          technique_id: activeTechnique.id,
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, activeTechnique, mockSubtechnique]);

        const { body, status } = await mitreAttackApi.getEntities({
          types: ['technique', 'subtechnique'],
        });

        expect(status).to.eql(200);
        expect(body.tactics).to.eql([]);
        expect(body.techniques.map((t: { id: string }) => t.id)).to.eql([activeTechnique.id]);
        expect(body.subtechniques.map((t: { id: string }) => t.id)).to.eql([mockSubtechnique.id]);
      });
    });

    describe('status filtering', () => {
      it('excludes revoked and deprecated entities by default', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const revokedTechnique = createMitreTechnique({
          id: 'T0002',
          tactic_ids: [mockTactic.id],
          revoked: true,
          superseded_by_id: [activeTechnique.id],
        });
        const deprecatedTechnique = createMitreTechnique({
          id: 'T0003',
          tactic_ids: [mockTactic.id],
          deprecated: true,
        });
        await seedMitreEntities(es, [
          mockTactic,
          activeTechnique,
          revokedTechnique,
          deprecatedTechnique,
        ]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.techniques.map((t: { id: string }) => t.id)).to.eql([activeTechnique.id]);
        for (const entity of [...body.tactics, ...body.techniques, ...body.subtechniques]) {
          expect(entity.revoked).to.eql(false);
          expect(entity.deprecated).to.eql(false);
        }
      });

      it('includes revoked and deprecated entities when status=all', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({ tactic_ids: [mockTactic.id] });
        const revokedTechnique = createMitreTechnique({
          id: 'T0002',
          tactic_ids: [mockTactic.id],
          revoked: true,
          superseded_by_id: [activeTechnique.id],
        });
        const deprecatedTechnique = createMitreTechnique({
          id: 'T0003',
          tactic_ids: [mockTactic.id],
          deprecated: true,
        });
        await seedMitreEntities(es, [
          mockTactic,
          activeTechnique,
          revokedTechnique,
          deprecatedTechnique,
        ]);

        const { body, status } = await mitreAttackApi.getEntities({ status: 'all' });

        expect(status).to.eql(200);
        const techIds = body.techniques.map((t: { id: string }) => t.id).sort();
        expect(techIds).to.eql(
          [activeTechnique.id, revokedTechnique.id, deprecatedTechnique.id].sort()
        );
      });

      it('applies status filtering within an explicitly requested framework_version', async () => {
        const mockTactic = createMitreTactic({ framework_version: OLDER_MOCK_FRAMEWORK_VERSION });
        const activeTechnique = createMitreTechnique({
          tactic_ids: [mockTactic.id],
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
        });
        const revokedTechnique = createMitreTechnique({
          id: 'T0002',
          tactic_ids: [mockTactic.id],
          revoked: true,
          superseded_by_id: [activeTechnique.id],
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
        });
        const deprecatedTechnique = createMitreTechnique({
          id: 'T0003',
          tactic_ids: [mockTactic.id],
          deprecated: true,
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
        });
        await seedMitreEntities(es, [
          mockTactic,
          activeTechnique,
          revokedTechnique,
          deprecatedTechnique,
        ]);

        const { body: activeBody, status: activeStatus } = await mitreAttackApi.getEntities({
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
        });
        expect(activeStatus).to.eql(200);
        expect(activeBody.techniques.map((t: { id: string }) => t.id)).to.eql([activeTechnique.id]);
        for (const entity of [
          ...activeBody.tactics,
          ...activeBody.techniques,
          ...activeBody.subtechniques,
        ]) {
          expect(entity.revoked).to.eql(false);
          expect(entity.deprecated).to.eql(false);
        }

        const { body: allBody, status: allStatus } = await mitreAttackApi.getEntities({
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
          status: 'all',
        });
        expect(allStatus).to.eql(200);
        const allTechIds = allBody.techniques.map((t: { id: string }) => t.id).sort();
        expect(allTechIds).to.eql(
          [activeTechnique.id, revokedTechnique.id, deprecatedTechnique.id].sort()
        );
      });

      it('a revoked entity carries superseded_by_id pointing to the successor', async () => {
        const mockTactic = createMitreTactic();
        const activeTechnique = createMitreTechnique({
          id: 'T0002',
          tactic_ids: [mockTactic.id],
        });
        const revokedTechnique = createMitreTechnique({
          tactic_ids: [mockTactic.id],
          revoked: true,
          superseded_by_id: [activeTechnique.id],
        });
        await seedMitreEntities(es, [mockTactic, revokedTechnique, activeTechnique]);

        const { body, status } = await mitreAttackApi.getEntities({
          status: 'all',
          types: 'technique',
        });

        expect(status).to.eql(200);
        const revoked = body.techniques.find((t: { id: string }) => t.id === revokedTechnique.id);
        expect(revoked).not.to.eql(undefined);
        expect(revoked.revoked).to.eql(true);
        expect(revoked.superseded_by_id).to.eql([activeTechnique.id]);
      });
    });

    describe('version resolution', () => {
      it('resolves to the latest version when framework_version is omitted', async () => {
        const mockTactic = createMitreTactic({ framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION });
        await seedMitreEntities(es, [mockTactic]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.framework_version).to.eql(mockTactic.framework_version);
        for (const entity of body.tactics) {
          expect(entity.framework_version).to.eql(mockTactic.framework_version);
        }
      });

      it('returns 200 with empty buckets and echoes the requested version for an unrecognized framework_version', async () => {
        const mockTactic = createMitreTactic();
        await seedMitreEntities(es, [mockTactic]);

        const { body, status } = await mitreAttackApi.getEntities({ framework_version: '99.9' });

        expect(status).to.eql(200);
        expect(body.framework).to.eql('enterprise');
        expect(body.framework_version).to.eql('99.9');
        expect(body.tactics).to.eql([]);
        expect(body.techniques).to.eql([]);
        expect(body.subtechniques).to.eql([]);
      });

      it('resolves to the latest version when multiple versions are present', async () => {
        const olderTactic = createMitreTactic({ framework_version: OLDER_MOCK_FRAMEWORK_VERSION });
        const newerTactic = createMitreTactic({
          framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
        });
        await seedMitreEntities(es, [olderTactic, newerTactic]);

        const { body, status } = await mitreAttackApi.getEntities();

        expect(status).to.eql(200);
        expect(body.framework_version).to.eql(newerTactic.framework_version);
        for (const entity of body.tactics) {
          expect(entity.framework_version).to.eql(newerTactic.framework_version);
        }
      });

      it('returns the explicit version data when framework_version is specified', async () => {
        const mockTactic = createMitreTactic({ framework_version: OLDER_MOCK_FRAMEWORK_VERSION });
        const secondTactic = createMitreTactic({
          id: 'TA0002',
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
          position: 1,
        });
        const olderTechnique = createMitreTechnique({
          tactic_ids: [mockTactic.id],
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
          name: 'Technique older version',
        });
        await seedMitreEntities(es, [mockTactic, secondTactic, olderTechnique]);

        const { body, status } = await mitreAttackApi.getEntities({
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
          status: 'all',
        });

        expect(status).to.eql(200);
        expect(body.framework_version).to.eql(mockTactic.framework_version);
        for (const entity of [...body.tactics, ...body.techniques]) {
          expect(entity.framework_version).to.eql(mockTactic.framework_version);
        }
        const technique = body.techniques.find((t: { id: string }) => t.id === olderTechnique.id);
        expect(technique).not.to.eql(undefined);
        expect(technique.name).to.eql(olderTechnique.name);
        const tacticIds = body.tactics.map((t: { id: string }) => t.id);
        expect(tacticIds).to.contain(mockTactic.id);
        expect(tacticIds).to.contain(secondTactic.id);
      });

      it('returns version-specific data for the same technique id across two versions', async () => {
        const mockTactic = createMitreTactic();
        const olderTechnique = createMitreTechnique({
          framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
          name: 'Technique older version',
          tactic_ids: [mockTactic.id],
        });
        const newerTechnique = createMitreTechnique({
          framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
          name: 'Technique default version',
          tactic_ids: [mockTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, olderTechnique, newerTechnique]);

        const [olderResp, defaultResp] = await Promise.all([
          mitreAttackApi.getEntities({
            framework_version: OLDER_MOCK_FRAMEWORK_VERSION,
            types: 'technique',
          }),
          mitreAttackApi.getEntities({
            framework_version: DEFAULT_MOCK_FRAMEWORK_VERSION,
            types: 'technique',
          }),
        ]);

        expect(olderResp.status).to.eql(200);
        expect(defaultResp.status).to.eql(200);

        const t0001older = olderResp.body.techniques.find(
          (t: { id: string }) => t.id === olderTechnique.id
        );
        const t0001default = defaultResp.body.techniques.find(
          (t: { id: string }) => t.id === newerTechnique.id
        );

        expect(t0001older).not.to.eql(undefined);
        expect(t0001default).not.to.eql(undefined);
        expect(t0001older.name).to.eql(olderTechnique.name);
        expect(t0001default.name).to.eql(newerTechnique.name);
        expect(t0001older.framework_version).to.eql(olderTechnique.framework_version);
        expect(t0001default.framework_version).to.eql(newerTechnique.framework_version);
      });

      it('a multi-tactic technique appears exactly once with all tactic_ids listed', async () => {
        const mockTactic = createMitreTactic();
        const secondTactic = createMitreTactic({ id: 'TA0002', position: 1 });
        const multiTacticTechnique = createMitreTechnique({
          tactic_ids: [mockTactic.id, secondTactic.id],
        });
        await seedMitreEntities(es, [mockTactic, secondTactic, multiTacticTechnique]);

        const { body, status } = await mitreAttackApi.getEntities({ types: 'technique' });

        expect(status).to.eql(200);
        const matches = body.techniques.filter(
          (t: { id: string }) => t.id === multiTacticTechnique.id
        );
        expect(matches.length).to.eql(1);
        const technique = matches[0];
        expect(technique.tactic_ids).to.contain(mockTactic.id);
        expect(technique.tactic_ids).to.contain(secondTactic.id);
      });
    });

    describe('request validation', () => {
      it('rejects an unsupported framework value with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({ framework: 'atlas' });
        expect(status).to.eql(400);
      });

      it('rejects an invalid entity type with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({ types: 'bogus' });
        expect(status).to.eql(400);
      });

      it('rejects more than three entity types with 400', async () => {
        // The schema allows at most 3 entity types
        const { status } = await mitreAttackApi.getEntities({
          types: 'tactic,technique,subtechnique,tactic',
        });
        expect(status).to.eql(400);
      });

      it('rejects a framework_version exceeding the maximum length with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({
          framework_version: 'a'.repeat(33),
        });
        expect(status).to.eql(400);
      });

      it('rejects an invalid status value with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({ status: 'bogus' });
        expect(status).to.eql(400);
      });

      it('rejects an empty framework_version string with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({ framework_version: '' });
        expect(status).to.eql(400);
      });

      it('rejects an empty types string with 400', async () => {
        const { status } = await mitreAttackApi.getEntities({ types: '' });
        expect(status).to.eql(400);
      });
    });
  });
};
