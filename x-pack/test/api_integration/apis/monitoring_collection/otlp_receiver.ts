/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as grpc from '@grpc/grpc-js';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const OTLP_PORT = 4317;
const EXPORT_PATH =
  '/opentelemetry.proto.collector.metrics.v1.MetricsService/Export';

// Service definition mirrors what OTLPMetricExporter sends: raw Buffer passthrough,
// no built-in proto serialization so we can decode manually.
const metricsServiceDefinition: grpc.ServiceDefinition = {
  Export: {
    path: EXPORT_PATH,
    requestStream: false,
    responseStream: false,
    requestDeserialize: (buf: Buffer) => buf,
    requestSerialize: (buf: Buffer) => buf,
    responseDeserialize: (buf: Buffer) => buf,
    responseSerialize: (buf: Buffer) => buf,
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('OTLP metrics export', function () {
    this.tags(['skipCloud']);

    let server: grpc.Server;
    const receivedBuffers: Buffer[] = [];

    before(async () => {
      server = new grpc.Server();

      server.addService(metricsServiceDefinition, {
        Export: (
          call: grpc.ServerUnaryCall<Buffer, Buffer>,
          callback: grpc.sendUnaryData<Buffer>
        ) => {
          receivedBuffers.push(call.request);
          // Empty ExportMetricsServiceResponse — all-zero protobuf is a valid empty message
          callback(null, Buffer.alloc(0));
        },
      });

      await new Promise<void>((resolve, reject) => {
        server.bindAsync(
          `0.0.0.0:${OTLP_PORT}`,
          grpc.ServerCredentials.createInsecure(),
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    after(async () => {
      await new Promise<void>((resolve, reject) =>
        server.tryShutdown((err) => (err ? reject(err) : resolve()))
      );
    });

    it('receives exported OTLP metrics containing the request_count metric', async () => {
      receivedBuffers.length = 0;

      // Increment the request_count counter in the otel_metrics test plugin
      await supertest.post('/api/generate_otel_metrics').set('kbn-xsrf', 'foo').expect(200);

      // Wait up to 10 s for at least one OTLP export (config sets exportIntervalMillis=2000)
      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(
          () => reject(new Error('Timed out waiting for OTLP export')),
          10_000
        );
        const poll = setInterval(() => {
          if (receivedBuffers.length > 0) {
            clearTimeout(deadline);
            clearInterval(poll);
            resolve();
          }
        }, 100);
      });

      expect(receivedBuffers.length).to.be.greaterThan(0);

      // Decode the first received payload using the same protobufjs root that the
      // OTLPMetricExporter uses internally to encode requests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const root = require('@opentelemetry/otlp-transformer/build/src/generated/root');
      const ExportMetricsServiceRequest =
        root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;

      const decoded = ExportMetricsServiceRequest.decode(receivedBuffers[0]);

      const metricNames: string[] = decoded.resourceMetrics
        .flatMap((rm: any) => rm.scopeMetrics)
        .flatMap((sm: any) => sm.metrics)
        .map((m: any) => m.name as string);

      expect(metricNames).to.contain('request_count');
    });
  });
}
