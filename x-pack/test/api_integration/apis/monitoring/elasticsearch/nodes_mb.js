/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import nodesListingFixtureGreen from './fixtures/nodes_listing_green';
import nodesListingFixtureRed from './fixtures/nodes_listing_red';
import nodesListingFixtureCgroup from './fixtures/nodes_listing_cgroup';
import nodesListingFixturePagination from './fixtures/nodes_listing_pagination';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('nodes mb', () => {
    describe('with green platinum cluster', () => {
      const archive =
        'x-pack/test/functional/es_archives/monitoring/singlecluster_green_platinum_mb';
      const timeRange = {
        min: '2018-02-13T17:04:50.000Z',
        max: '2018-02-13T17:51:55.000Z',
      };
      const pagination = {
        size: 10,
        index: 0,
      };

      before('load clusters archive', () => {
        return setup(archive);
      });

      after('unload clusters archive', () => {
        return tearDown();
      });

      it('should return data for 2 active nodes', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureGreen);
      });
    });

    describe('with red platinum cluster', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_red_platinum';
      const timeRange = {
        min: '2017-10-06T19:53:06.000Z',
        max: '2017-10-06T20:15:30.000Z',
      };
      const pagination = {
        size: 10,
        index: 0,
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should return data for offline nodes', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/1LYuyvCCQFS3FAO_h65PQw/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureRed);
      });
    });

    describe('with green trial cluster and node in cpu group', () => {
      const archive =
        'x-pack/test/functional/es_archives/monitoring/singlecluster_green_trial_two_nodes_one_cgrouped';
      const timeRange = {
        min: '2018-02-13T19:18:02.000Z',
        max: '2018-02-13T19:26:14.000Z',
      };
      const pagination = {
        size: 10,
        index: 0,
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should return cpu info for cgroup node and cpu info for "regular" node', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Cbo7k85ZRdy--yxmqeykog/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureCgroup);
      });
    });

    describe('with pagination', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_lots_of_nodes';
      const timeRange = {
        min: '2019-10-03T19:41:01.402Z',
        max: '2019-10-03T19:41:13.132Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should work with the default pagination', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination })
          .expect(200);

        const names = body.nodes.map((node) => node.name);
        expect(body.nodes.length).to.be(pagination.size);
        expect(names).to.eql(nodesListingFixturePagination.defaultPagination);
      });

      it('should work with going to page 2', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const { body: body1 } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination })
          .expect(200);
        const names1 = body1.nodes.map((node) => node.name);

        const { body: body2 } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination: { size: 12, index: 1 } })
          .expect(200);
        const names2 = body2.nodes.map((node) => node.name);

        for (const name1 of names1) {
          expect(names2.includes(name1)).to.be(false);
        }
        expect(names2.length).to.be(12);
        expect(names2).to.eql(nodesListingFixturePagination.secondPagePagination);
      });
    });

    describe('with sorting', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_lots_of_nodes';
      const timeRange = {
        min: '2019-10-03T19:41:01.402Z',
        max: '2019-10-03T19:41:13.132Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should work with the default sorting', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const sort = {
          field: 'name',
          direction: 'asc',
        };

        const { body: body1 } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort })
          .expect(200);

        const { body: body2 } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort: { ...sort, direction: 'desc' } })
          .expect(200);

        const names1 = body1.nodes.map((node) => node.name);
        const names2 = body2.nodes.map((node) => node.name);

        expect(names1).to.eql(nodesListingFixturePagination.sortByNameAsc);
        expect(names2).to.eql(nodesListingFixturePagination.sortByNameDesc);
        for (const name1 of names1) {
          expect(names2.includes(name1)).to.be(false);
        }
      });

      it('should work with sorting by cpu usage', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const sort = {
          field: 'node_cpu_utilization',
          direction: 'asc',
        };

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort })
          .expect(200);

        const cpuUsage = body.nodes.map((node) => ({
          name: node.name,
          cpu_usage: node.node_cpu_utilization.summary,
        }));
        expect(cpuUsage).to.eql(nodesListingFixturePagination.sortByCpuUsage);
      });

      it('should work with sorting by load average', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const sort = {
          field: 'node_load_average',
          direction: 'asc',
        };

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort })
          .expect(200);

        const loadAverage = body.nodes.map((node) => ({
          name: node.name,
          load_average: node.node_load_average.summary,
        }));
        expect(loadAverage).to.eql(nodesListingFixturePagination.sortByLoadAverage);
      });

      it('should work with sorting by jvm memory', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const sort = {
          field: 'node_jvm_mem_percent',
          direction: 'asc',
        };

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort })
          .expect(200);

        const jvmMemory = body.nodes.map((node) => ({
          name: node.name,
          jvm_memory: node.node_jvm_mem_percent.summary,
        }));
        expect(jvmMemory).to.eql(nodesListingFixturePagination.sortByJvmMemory);
      });

      it('should work with sorting by free space', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };

        const sort = {
          field: 'node_free_space',
          direction: 'asc',
        };

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, sort })
          .expect(200);

        const freeSpace = body.nodes.map((node) => ({
          name: node.name,
          free_space: node.node_free_space.summary,
        }));
        expect(freeSpace).to.eql(nodesListingFixturePagination.sortByFreeSpace);
      });
    });

    describe('with filtering', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_lots_of_nodes';
      const timeRange = {
        min: '2019-10-03T19:41:01.402Z',
        max: '2019-10-03T19:41:13.132Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should work with a simple query', async () => {
        const pagination = {
          size: 10,
          index: 0,
        };
        const queryText = '41';

        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Pawu2etQQ9uPwl22Vm_Tug/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination, queryText })
          .expect(200);

        const names = body.nodes.map((node) => node.name);
        expect(names).to.eql(nodesListingFixturePagination.simpleQuery);
      });
    });
  });
}
