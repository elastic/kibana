/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssetDocument,
  infra,
  apm,
  ApmFields,
  monitoring,
  MonitoringDocument,
  InfraDocument,
  Serializable,
  timerange,
} from '@kbn/apm-synthtrace-client';
import { Asset, AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { ASSETS_ENDPOINT } from '../constants';
import { FtrProviderContext } from '../types';

const HOST_ASSETS_ENDPOINT = `${ASSETS_ENDPOINT}/hosts`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const infraSynthtraceEsClient = getService('infraSynthtraceEsClient');
  const assetsSynthtraceEsClient = getService('assetsSynthtraceEsClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const monitoringSynthtraceEsClient = getService('monitoringSynthtraceEsClient');

  describe('asset management', () => {
    describe('GET /assets/hosts', () => {
      it('should return host assets from signals', async () => {
        const end = new Date(); // now
        const start = new Date();
        start.setHours(end.getHours() - 1); // now-1h
        const timestamps = timerange(start.getTime(), end.getTime()).interval('10m').rate(1);

        const assets = timestamps.generator<AssetDocument>((timestamp) => {
          const hostA = infra.host('host-a');
          const podA = hostA.pod('pod-a');
          const containerA = podA.container('container-a');

          return [hostA.asset(), podA.asset(), containerA.asset()].map(withTimestamp(timestamp));
        });

        const metrics = timestamps.generator<InfraDocument>((timestamp) => {
          const hostA = infra.host('host-a');
          const podA = hostA.pod('pod-a');
          const containerA = podA.container('container-a');

          return [hostA.metrics(), podA.metrics(), containerA.metrics()].map(
            withTimestamp(timestamp)
          );
        });

        const apmEvents = timestamps.generator<ApmFields>((timestamp) => {
          const serviceA = apm.service('service-a', 'test', 'node').instance('instance-a');

          return [serviceA.appMetrics({ 'system.cpu.total.norm.pct': 46 })].map(
            withTimestamp(timestamp)
          );
        });

        const monitoringEvents = timestamps.generator<MonitoringDocument>((timestamp) => {
          const clusterA = monitoring.cluster('cluster-a');
          const kibanaA = clusterA.kibana('kibana-a');

          return [clusterA.stats(), kibanaA.stats()].map(withTimestamp(timestamp));
        });

        await infraSynthtraceEsClient.index(metrics);
        await assetsSynthtraceEsClient.index(assets);
        await apmSynthtraceEsClient.index(apmEvents);
        await monitoringSynthtraceEsClient.index(monitoringEvents);

        const response = await supertest
          .get(HOST_ASSETS_ENDPOINT)
          .query({
            from: start,
            to: end,
          })
          .expect(200);
        expect(response.body).to.have.property('hosts');
        expect(response.body.hosts.length).to.equal(2);
        expect(response.body.hosts.map(dropTimestamp)).to.eql([
          {
            'asset.kind': 'host',
            'asset.id': ['host-a'],
            'asset.name': ['host-a'],
            'asset.ean': 'host:host-a',
          },
          {
            'asset.kind': 'host',
            'asset.id': ['host-b'],
            'asset.name': ['host-b'],
            'asset.ean': 'host:host-b',
          },
        ]);
      });

      afterEach(async () => {
        await infraSynthtraceEsClient.clean();
        await assetsSynthtraceEsClient.clean();
      });
    });
  });
}

// Can I type better than any here? Like Fields?
function withTimestamp<
  T extends Serializable<InfraDocument | AssetDocument | MonitoringDocument | ApmFields>
>(timestamp: number) {
  return (document: T) => document.timestamp(timestamp);
}

// Is this a good solution? Or would it be better to capture the synthtrace interval timestamps to use/predict?
function dropTimestamp(asset: Asset) {
  const copy: Partial<Asset> = Object.assign({}, asset);
  delete copy['@timestamp'];
  return copy as AssetWithoutTimestamp;
}
