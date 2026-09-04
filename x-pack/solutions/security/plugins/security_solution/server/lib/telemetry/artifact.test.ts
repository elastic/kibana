/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockTelemetryReceiver } from './__mocks__';
import { Artifact } from './artifact';
import Fs from 'fs';
import type { TelemetryConfiguration } from './types';

const mockedFetch = jest.spyOn(global, 'fetch');

describe('telemetry artifact test', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test.each(['manifest', 'artifact'])(
    'should time out while reading the %s body',
    async (stage) => {
      jest.useFakeTimers();
      try {
        const artifact = new Artifact();
        await artifact.start(createMockTelemetryReceiver());
        if (stage === 'artifact') {
          mockedFetch.mockResolvedValueOnce(
            zipResponse(
              'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip'
            )
          );
        }
        mockedFetch.mockImplementationOnce(async (_input, init) => {
          return new Response(
            new ReadableStream({
              start(controller) {
                init?.signal?.addEventListener('abort', () => {
                  controller.error(new Error('Response body aborted'));
                });
              },
            })
          );
        });

        const result = expect(
          artifact.getArtifact('telemetry-buffer-and-batch-sizes-v1')
        ).rejects.toThrow('Response body aborted');
        await jest.advanceTimersByTimeAsync(10_000);
        await result;
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    }
  );

  test('start should set manifest url for snapshot version', async () => {
    const expectedManifestUrl =
      'https://artifacts.security.elastic.co/downloads/kibana/manifest/artifacts-8.0.0.zip';
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    expect(mockTelemetryReceiver.fetchClusterInfo).toHaveBeenCalled();
    expect(artifact.getManifestUrl()).toEqual(expectedManifestUrl);
  });

  test('start should set manifest url for non-snapshot version', async () => {
    const expectedManifestUrl =
      'https://artifacts.security.elastic.co/downloads/kibana/manifest/artifacts-8.0.0.zip';
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const stubClusterInfo = {
      name: 'Stub-MacBook-Pro.local',
      cluster_name: 'elasticsearch',
      cluster_uuid: '5Pr5PXRQQpGJUTn0czAvKQ',
      version: {
        number: '8.0.0',
        build_type: 'tar',
        build_hash: '38537ab4a726b42ce8f034aad78d8fca4d4f3e51',
        build_date: new Date().toISOString(),
        build_snapshot: true,
        lucene_version: '9.2.0',
        minimum_wire_compatibility_version: '7.17.0',
        minimum_index_compatibility_version: '7.0.0',
      },
      tagline: 'You Know, for Search',
    };
    mockTelemetryReceiver.fetchClusterInfo = jest.fn().mockReturnValue(stubClusterInfo);
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    expect(mockTelemetryReceiver.fetchClusterInfo).toHaveBeenCalled();
    expect(artifact.getManifestUrl()).toEqual(expectedManifestUrl);
  });

  test('getArtifact should throw an error if manifest url is null', async () => {
    const artifact = new Artifact();
    await expect(async () => artifact.getArtifact('test')).rejects.toThrow('No manifest url');
  });

  test('getArtifact should throw an error if relative url is null', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    mockedFetch.mockResolvedValueOnce(
      zipResponse(
        'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip'
      )
    );
    await expect(async () => artifact.getArtifact('artifactThatDoesNotExist')).rejects.toThrow(
      'No artifact for name artifactThatDoesNotExist'
    );
  });

  test('getArtifact should return respective artifact', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    mockedFetch
      .mockResolvedValueOnce(
        zipResponse(
          'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip'
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          telemetry_max_buffer_size: 100,
          max_security_list_telemetry_batch: 100,
          max_endpoint_telemetry_batch: 300,
          max_detection_rule_telemetry_batch: 1_000,
          max_detection_alerts_batch: 50,
        })
      );
    const manifest = await artifact.getArtifact('telemetry-buffer-and-batch-sizes-v1');
    expect(manifest).not.toBeFalsy();
    const artifactObject: TelemetryConfiguration =
      manifest.data as unknown as TelemetryConfiguration;
    expect(artifactObject.telemetry_max_buffer_size).toEqual(100);
    expect(artifactObject.max_security_list_telemetry_batch).toEqual(100);
    expect(artifactObject.max_endpoint_telemetry_batch).toEqual(300);
    expect(artifactObject.max_detection_rule_telemetry_batch).toEqual(1_000);
    expect(artifactObject.max_detection_alerts_batch).toEqual(50);
  });

  test('getArtifact should cache response', async () => {
    const fakeEtag = '123';
    const artifact = new Artifact();

    await artifact.start(createMockTelemetryReceiver());

    mockedFetch
      .mockResolvedValueOnce(
        zipResponse(
          'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
          { etag: fakeEtag }
        )
      )
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    let manifest = await artifact.getArtifact('telemetry-buffer-and-batch-sizes-v1');
    expect(manifest).not.toBeFalsy();
    expect(manifest.notModified).toEqual(false);
    expect(mockedFetch.mock.calls.length).toBe(2);

    manifest = await artifact.getArtifact('telemetry-buffer-and-batch-sizes-v1');
    expect(manifest).not.toBeFalsy();
    expect(manifest.notModified).toEqual(true);
    expect(mockedFetch.mock.calls.length).toBe(3);

    const [_url, init] = mockedFetch.mock.calls[2];
    expect(new Headers(init?.headers).get('If-None-Match')).toEqual(fakeEtag);
  });
});

function zipResponse(path: string, headers?: HeadersInit): Response {
  return new Response(Fs.readFileSync(path), { status: 200, headers });
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200 });
}
