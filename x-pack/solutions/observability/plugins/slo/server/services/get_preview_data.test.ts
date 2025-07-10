/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { GetPreviewDataParams } from '@kbn/slo-schema';
import { GetPreviewData } from './get_preview_data';
import { oneMinute } from './fixtures/duration';

describe('GetPreviewData', () => {
  let esClientMock: ElasticsearchClientMock;
  let service: GetPreviewData;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    service = new GetPreviewData(esClientMock, 'default', dataViewsService);
  });

  describe("for 'Custom KQL' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'kbn-data-forge-fake_stack.admin-console-*',
          filter: 'http.response.status_code :*',
          good: 'http.response.status_code <500',
          total: 'http.response.status_code :*',
          timestampField: '@timestamp',
          dataViewId: 'e7744dbe-a7a4-457b-83aa-539e9c88764c',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };

    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });

    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });

    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });

    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'Custom Metric' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.metric.custom',
        params: {
          index: 'kbn-data-forge-fake_stack.message_processor-*',
          filter: '',
          good: {
            metrics: [
              {
                name: 'A',
                aggregation: 'sum',
                field: 'processor.processed',
                filter: '',
              },
            ],
            equation: 'A',
          },
          total: {
            metrics: [
              {
                name: 'A',
                aggregation: 'sum',
                field: 'processor.accepted',
                filter: '',
              },
            ],
            equation: 'A',
          },
          timestampField: '@timestamp',
          dataViewId: '593f894a-3378-42cc-bafc-61b4877b64b0',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'Custom Histogram' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.histogram.custom',
        params: {
          index: 'kbn-data-forge-fake_stack.message_processor-*',
          timestampField: '@timestamp',
          filter: '',
          good: {
            field: 'processor.latency',
            aggregation: 'range',
            filter: '',
            from: 0,
            to: 100,
          },
          total: {
            field: 'processor.latency',
            aggregation: 'value_count',
            filter: '',
          },
          dataViewId: '593f894a-3378-42cc-bafc-61b4877b64b0',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'Timeslice Metric' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.metric.timeslice',
        params: {
          index: 'kbn-data-forge-fake_stack.message_processor-*',
          filter: '',
          metric: {
            metrics: [
              {
                name: 'A',
                aggregation: 'sum',
                field: 'processor.timeSpent',
                filter: '',
              },
              {
                name: 'B',
                aggregation: 'sum',
                field: 'processor.processed',
                filter: '',
              },
            ],
            equation: 'A / B / 1000',
            comparator: 'LTE',
            threshold: 180,
          },
          timestampField: '@timestamp',
          dataViewId: '593f894a-3378-42cc-bafc-61b4877b64b0',
        },
      },
      objective: {
        target: 0.99,
        timesliceTarget: 0.95,
        timesliceWindow: oneMinute(),
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'APM Latency' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: {
          service: 'frontend',
          environment: 'prod',
          transactionType: 'request',
          transactionName: 'GET /api',
          threshold: 250,
          filter: 'some.lable:foo',
          index:
            'remote_cluster:apm-*,remote_cluster:metrics-apm*,remote_cluster:metrics-*.otel-*,apm-*,metrics-apm*,metrics-*.otel-*',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'APM Availability' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: {
          service: 'frontend',
          environment: 'prod',
          transactionType: 'request',
          transactionName: 'GET /api',
          filter: 'some.lable:bar',
          index:
            'remote_cluster:apm-*,remote_cluster:metrics-apm*,remote_cluster:metrics-*.otel-*,apm-*,metrics-apm*,metrics-*.otel-*',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });

  describe("for 'Synthetics' indicator type", () => {
    const params: GetPreviewDataParams = {
      indicator: {
        type: 'sli.synthetics.availability',
        params: {
          monitorIds: [
            { value: 'monitor-1', label: 'My monitor 1' },
            { value: 'monitor-2', label: 'My monitor 2' },
          ],
          index: 'synthetics-*',
          projects: [{ value: 'project-1', label: 'Project 1' }],
          tags: [{ value: 'tag-1', label: 'Tag 1' }],
          dataViewId: '593f894a-3378-42cc-bafc-61b4877b64b0',
        },
      },
      range: {
        from: new Date('2025-02-23T14:26:49.056Z'),
        to: new Date('2025-02-24T14:26:49.056Z'),
      },
    };
    it('builds the query without groups', async () => {
      await service.execute({ ...params, groupBy: ['*'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 1 group', async () => {
      await service.execute({ ...params, groupBy: ['host.name'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query with 2 groups', async () => {
      await service.execute({ ...params, groupBy: ['host.name', 'event.action'] });
      expect(esClientMock.search).toMatchSnapshot();
    });
    it('builds the query for a set of groupings', async () => {
      await service.execute({ ...params, groupings: { 'host.name': 'host.001', env: 'prod' } });
      expect(esClientMock.search).toMatchSnapshot();
    });
  });
});
