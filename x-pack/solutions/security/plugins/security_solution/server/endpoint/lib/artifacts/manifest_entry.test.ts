/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalArtifactSchema } from '../../schemas';
import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';
import { ManifestEntry } from './manifest_entry';

describe('manifest_entry', () => {
  describe('ManifestEntry object checks', () => {
    let artifact: InternalArtifactSchema;
    let manifestEntry: ManifestEntry;

    beforeAll(async () => {
      artifact = await getInternalArtifactMock('windows', 'v1');
      manifestEntry = new ManifestEntry(artifact);
    });

    test('Can create manifest entry', () => {
      expect(manifestEntry).toBeInstanceOf(ManifestEntry);
    });

    test('Correct doc_id is returned', () => {
      expect(manifestEntry.getDocId()).toEqual(
        'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct identifier is returned', () => {
      expect(manifestEntry.getIdentifier()).toEqual('endpoint-exceptionlist-windows-v1');
    });

    test('Correct sha256 is returned', () => {
      expect(manifestEntry.getEncodedSha256()).toEqual(
        '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
      expect(manifestEntry.getDecodedSha256()).toEqual(
        '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct size is returned', () => {
      expect(manifestEntry.getEncodedSize()).toEqual(432);
      expect(manifestEntry.getDecodedSize()).toEqual(432);
    });

    test('Correct url is returned', () => {
      expect(manifestEntry.getUrl()).toEqual(
        '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct artifact is returned', () => {
      expect(manifestEntry.getArtifact()).toEqual(artifact);
    });

    test('Correct record is returned', () => {
      expect(manifestEntry.getRecord()).toEqual({
        compression_algorithm: 'none',
        encryption_algorithm: 'none',
        decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        encoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        decoded_size: 432,
        encoded_size: 432,
        relative_url:
          '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
      });
    });
  });
});
