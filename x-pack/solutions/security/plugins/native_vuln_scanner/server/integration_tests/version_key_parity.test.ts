/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { dpkgKey, rpmKey, UnencodableVersionError } from '../lib/version_compare';
import { versionKeyProcessor } from '../lib/version_compare/version_key_painless';

type Scheme = 'dpkg' | 'rpm';

const FIXTURES = join(__dirname, '..', 'lib', 'version_compare', '__fixtures__');
const SIMULATE_BATCH = 1000;

// Inputs the labelled corpus does not reach: empty parts, separators at the edges, the longest
// encodable number and one digit past it, epochs at and past the cap (including ones that
// overflow a long), and characters the dpkg key rejects.
// Java's trim strips only chars <= U+0020; the keys must agree on what counts as whitespace.
const TRIM_EDGES = ['\u00a01:1.0-1', '1:1.0-1\u00a0', '\ufeff1:1.0-1', '\t1:1.0-1\n'];

const EPOCH_EDGES = ['999999999', '0000000001', '1000000000', '9'.repeat(19), '9'.repeat(25)];

const EDGE_CASES: Readonly<Record<Scheme, readonly string[]>> = {
  dpkg: [
    ...['', '0', '1:', ':1', '-1', '1-', 'a-b-c', '1.0~~', '01:1.0', ' 1.0 ', '-1:1.0'],
    ...[`1.${'9'.repeat(78)}`, `1.${'9'.repeat(79)}`, '1.0_bad', '1.0@x', 'ü1.0'],
    ...EPOCH_EDGES.map((epoch) => `${epoch}:1.0-1`),
    ...TRIM_EDGES,
  ],
  rpm: [
    ...[
      '',
      '0',
      '1:',
      '1.0^',
      '1.0^~',
      '1.0~^',
      '0:1.0-1.el9_2',
      '1.0_x',
      '1..0',
      '.1',
      '-1:1.0-1',
    ],
    ...[`1.${'9'.repeat(79)}`, 'ü1.0'],
    ...EPOCH_EDGES.map((epoch) => `${epoch}:1.0-1.el9`),
    ...TRIM_EDGES,
  ],
};

const corpusVersions = (scheme: Scheme): string[] => {
  const versions = new Set<string>(EDGE_CASES[scheme]);
  readFileSync(join(FIXTURES, `${scheme}_labelled_pairs.tsv`), 'utf8')
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const [a, b] = line.split('\t');
      versions.add(a);
      versions.add(b);
    });
  return [...versions];
};

/** The TS key, or null where it throws UnencodableVersionError. */
const tsKey = (scheme: Scheme, version: string): string | null => {
  try {
    return scheme === 'dpkg' ? dpkgKey(version) : rpmKey(version);
  } catch (error) {
    if (error instanceof UnencodableVersionError) return null;
    throw error;
  }
};

interface SimulatedPackage {
  version_key?: string;
  version_key_error?: string;
}

/** The painless key, or null where the script reports the version as unencodable. */
const painlessKeys = async (
  client: Client,
  scheme: Scheme,
  versions: string[]
): Promise<Map<string, string | null>> => {
  const keys = new Map<string, string | null>();
  for (let start = 0; start < versions.length; start += SIMULATE_BATCH) {
    const batch = versions.slice(start, start + SIMULATE_BATCH);
    const { docs } = await client.ingest.simulate({
      pipeline: { processors: [versionKeyProcessor] },
      docs: batch.map((version) => ({ _source: { package: { version, version_scheme: scheme } } })),
    });
    docs.forEach((doc, i) => {
      const pkg = (doc.doc?._source as { package?: SimulatedPackage } | undefined)?.package;
      if (!pkg) throw new Error(`simulate failed for ${JSON.stringify(batch[i])}`);
      if (pkg.version_key_error !== undefined && pkg.version_key_error !== 'unencodable') {
        throw new Error(
          `unexpected error for ${JSON.stringify(batch[i])}: ${pkg.version_key_error}`
        );
      }
      keys.set(batch[i], pkg.version_key ?? null);
    });
  }
  return keys;
};

describe('painless version key parity', () => {
  let esServer: TestElasticsearchUtils;
  let client: Client;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: (t: number) => jest.setTimeout(t) });
    esServer = await startES();
    client = esServer.es.getClient();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it.each(['dpkg', 'rpm'] as const)(
    'builds %s keys byte-identical to the TS keys',
    async (scheme) => {
      const versions = corpusVersions(scheme);
      const painless = await painlessKeys(client, scheme, versions);

      const mismatches = versions
        .filter((version) => painless.get(version) !== tsKey(scheme, version))
        .slice(0, 10)
        .map(
          (version) =>
            `${JSON.stringify(version)}: ts=${JSON.stringify(
              tsKey(scheme, version)
            )} painless=${JSON.stringify(painless.get(version))}`
        );

      expect(versions.length).toBeGreaterThan(1000);
      expect(mismatches).toEqual([]);
    }
  );
});
