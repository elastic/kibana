/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import type { MitreEntity, MitreFramework } from '@kbn/security-mitre-attack-common';
import {
  MITRE_ATTACK_ENTITY_SO_TYPE,
  MITRE_FRAMEWORKS,
  buildSoId,
} from '@kbn/security-mitre-attack-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { seedMitreEntities, deleteAllMitreEntities, waitForMitrePopulation } from '../utils';

/** Groups artifact entities by framework so expectations can be derived per framework. */
const groupArtifactByFramework = (
  artifact: MitreEntity[]
): Array<[MitreFramework, MitreEntity[]]> =>
  MITRE_FRAMEWORKS.map((framework) => [
    framework,
    artifact.filter((entity) => entity.framework === framework),
  ]);

/** Compares dotted version strings segment by segment as integers (`2026.10` > `2026.8`). */
const compareVersions = (a: string, b: string): number => {
  const aSegments = a.split('.').map(Number);
  const bSegments = b.split('.').map(Number);
  const length = Math.max(aSegments.length, bSegments.length);
  for (let i = 0; i < length; i++) {
    const diff = (aSegments[i] ?? 0) - (bSegments[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * The artifact may carry several versions per framework and the API serves the
 * latest one, so the expected version is the highest one among the entities.
 */
const getArtifactVersion = (framework: MitreFramework, entities: MitreEntity[]): string => {
  expect(entities.length).to.be.greaterThan(
    0,
    `artifact carries no entities for framework '${framework}'`
  );
  return entities
    .map((entity) => entity.framework_version)
    .reduce((latest, version) => (compareVersions(version, latest) > 0 ? version : latest));
};

export default ({ getService }: FtrProviderContext) => {
  const mitreAttackApi = getService('mitreAttackApi');
  const es = getService('es');
  const log = getService('log');

  describe('@ess @serverless Saved-object population from bundled artifact', () => {
    before(async () => {
      // populate() runs at plugin startup unconditionally; poll until the expected
      // number of artifact docs are present to confirm startup is complete.
      await waitForMitrePopulation(es, log, loadMitreArtifact().length);
    });

    it('bundles entities for every managed framework', () => {
      for (const [framework, entities] of groupArtifactByFramework(loadMitreArtifact())) {
        expect(entities.length).to.be.greaterThan(
          0,
          `artifact carries no entities for framework '${framework}'`
        );
      }
    });

    it('populates saved objects for every artifact entity with the correct _id format and count', async () => {
      const artifactEntities = loadMitreArtifact();

      // Build the exact set of ES _ids we expect the plugin to have written.
      // Raw ES _id = SO type prefix + ":" + SO id (the SO repository adds this prefix at write time).
      const expectedIds = artifactEntities
        .map(
          (entity) =>
            `${MITRE_ATTACK_ENTITY_SO_TYPE}:${buildSoId({
              framework: entity.framework,
              frameworkVersion: entity.framework_version,
              id: entity.id,
            })}`
        )
        .sort();

      const result = await es.search({
        index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
        size: expectedIds.length + 10,
        query: { term: { type: MITRE_ATTACK_ENTITY_SO_TYPE } },
      });

      const actualIds = result.hits.hits.map((hit) => String(hit._id)).sort();
      expect(actualIds).to.eql(expectedIds);
    });

    describe('per-framework retrieval', () => {
      for (const [framework, artifactEntities] of groupArtifactByFramework(loadMitreArtifact())) {
        it(`serves the ${framework} artifact version and active entity counts for framework=${framework}`, async () => {
          const artifactVersion = getArtifactVersion(framework, artifactEntities);
          const active = artifactEntities.filter(
            (entity) =>
              entity.framework_version === artifactVersion && !entity.revoked && !entity.deprecated
          );
          const countByType = (type: MitreEntity['type']) =>
            active.filter((entity) => entity.type === type).length;

          const { body, status } = await mitreAttackApi.getEntities({ framework });

          expect(status).to.eql(200);
          expect(body.framework).to.eql(framework);
          expect(body.framework_version).to.eql(artifactVersion);
          expect(body.tactics.length).to.eql(countByType('tactic'));
          expect(body.techniques.length).to.eql(countByType('technique'));
          expect(body.subtechniques.length).to.eql(countByType('subtechnique'));

          for (const entity of [...body.tactics, ...body.techniques, ...body.subtechniques]) {
            expect(entity.framework).to.eql(framework);
            expect(entity.framework_version).to.eql(artifactVersion);
          }
        });
      }
    });

    describe('referential integrity', () => {
      for (const framework of MITRE_FRAMEWORKS) {
        it(`[${framework}] every technique references only tactics present in the response`, async () => {
          const { body, status } = await mitreAttackApi.getEntities({ framework });

          expect(status).to.eql(200);

          const tacticIds = new Set<string>(body.tactics.map((t: { id: string }) => t.id));

          for (const technique of body.techniques as Array<{
            id: string;
            tactic_ids: string[];
          }>) {
            for (const tacticId of technique.tactic_ids) {
              expect(tacticIds.has(tacticId)).to.eql(
                true,
                `technique ${technique.id} references tactic ${tacticId} which is not in the tactics bucket`
              );
            }
          }
        });

        it(`[${framework}] every subtechnique references a technique present in the response and shares its id prefix`, async () => {
          const { body, status } = await mitreAttackApi.getEntities({ framework });

          expect(status).to.eql(200);

          const techniqueIds = new Set<string>(body.techniques.map((t: { id: string }) => t.id));

          for (const sub of body.subtechniques as Array<{
            id: string;
            technique_id: string;
          }>) {
            expect(techniqueIds.has(sub.technique_id)).to.eql(
              true,
              `subtechnique ${sub.id} references technique ${sub.technique_id} which is not in the techniques bucket`
            );
            expect(sub.id.startsWith(sub.technique_id + '.')).to.eql(
              true,
              `subtechnique id ${sub.id} is not prefixed by its technique_id ${sub.technique_id}`
            );
          }
        });
      }
    });

    describe('tactic matrix ordering', () => {
      for (const framework of MITRE_FRAMEWORKS) {
        it(`[${framework}] every tactic has a unique matrix position`, async () => {
          const { body, status } = await mitreAttackApi.getEntities({ framework, types: 'tactic' });

          expect(status).to.eql(200);
          expect(body.tactics.length).to.be.greaterThan(0);

          const positions = body.tactics.map((t: { position: number }) => t.position);
          const uniquePositions = new Set(positions);
          expect(uniquePositions.size).to.eql(body.tactics.length);
        });
      }
    });

    // This describe block must run last in the suite because the tests are
    // destructive: they delete all mitre-attack-entity saved objects to simulate
    // an empty data source. The after() hook restores data so subsequent suites
    // (in other files) are not affected.
    describe('empty data source', () => {
      after(async () => {
        // Unconditional restore: even a partial state (some docs present) can
        // leak to later files, so always delete then reseed to ensure a clean slate.
        await deleteAllMitreEntities(es);
        await seedMitreEntities(es, loadMitreArtifact());
      });

      it('returns 200 with empty buckets when no saved objects exist (never a 5xx)', async () => {
        await deleteAllMitreEntities(es);

        const { body, status } = await mitreAttackApi.getEntities();

        // The plugin's state is already 'ready' from the before() call above,
        // so ensureInitialized() returns immediately and list() reads the now-empty index.
        expect(status).to.eql(200);
        expect(body.tactics).to.eql([]);
        expect(body.techniques).to.eql([]);
        expect(body.subtechniques).to.eql([]);
      });

      it('serves data for every framework after the index is repopulated with the full artifact via bulk insert', async () => {
        // Re-seed using the same mechanism a downstream delivery pipeline would use:
        // direct ES bulk write using the artifact data and the canonical SO doc shape.
        // This also verifies that the API reads from the index rather than an in-memory cache.
        const artifact = loadMitreArtifact();
        await seedMitreEntities(es, artifact);

        for (const [framework, artifactEntities] of groupArtifactByFramework(artifact)) {
          const { body, status } = await mitreAttackApi.getEntities({ framework });

          expect(status).to.eql(200);
          expect(body.framework).to.eql(framework);
          expect(body.framework_version).to.eql(getArtifactVersion(framework, artifactEntities));
          expect(body.tactics.length).to.be.greaterThan(0);
          expect(body.techniques.length).to.be.greaterThan(0);
          expect(body.subtechniques.length).to.be.greaterThan(0);
        }
      });
    });
  });
};
