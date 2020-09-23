/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import { keyBy, mapValues } from 'lodash';
import supertestAsPromised from 'supertest-as-promised';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ConcreteTaskInstance } from '../../../../plugins/task_manager/server';

interface MonitoringStats {
  lastUpdate: string;
  stats: {
    configuration: {
      timestamp: string;
      value: Record<string, object>;
    };
    workload: {
      timestamp: string;
      value: Record<string, object>;
    };
  };
}

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const retry = getService('retry');
  const supertest = supertestAsPromised(url.format(config.get('servers.kibana')));

  function getHealthRequest() {
    return supertest.get('/api/task_manager/_health').set('kbn-xsrf', 'foo');
  }

  function getHealth(): Promise<MonitoringStats> {
    return getHealthRequest()
      .expect(200)
      .then((response) => response.body);
  }

  function scheduleTask(task: Partial<ConcreteTaskInstance>): Promise<ConcreteTaskInstance> {
    return supertest
      .post('/api/sample_tasks/schedule')
      .set('kbn-xsrf', 'xxx')
      .send({ task })
      .expect(200)
      .then((response: { body: ConcreteTaskInstance }) => response.body);
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const monitoredAggregatedStatsRefreshRate = 5000;

  describe('health', () => {
    it('should return basic configuration of task manager', async () => {
      expect((await getHealth()).stats.configuration.value).to.eql({
        poll_interval: 3000,
        max_poll_inactivity_cycles: 10,
        monitored_aggregated_stats_refresh_rate: monitoredAggregatedStatsRefreshRate,
        request_capacity: 1000,
        max_workers: 10,
      });
    });

    it('should return the task manager workload', async () => {
      const workload = (await getHealth()).stats.workload;
      const sumSampleTaskInWorkload =
        (workload.value.taskTypes as {
          sampleTask?: { sum: number };
        }).sampleTask?.sum ?? 0;
      const schedulesWorkload = (mapValues(
        keyBy(workload.value.schedule as Array<[string, number]>, ([interval, count]) => interval),
        ([, count]) => count
      ) as unknown) as { '37m': number | undefined; '37s': number | undefined };

      await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: '37s' },
      });

      await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: '37m' },
      });

      await retry.try(async () => {
        // workload is configured to refresh every 5s in FTs
        await delay(monitoredAggregatedStatsRefreshRate);

        const workloadAfterScheduling = (await getHealth()).stats.workload.value;

        expect(
          (workloadAfterScheduling.taskTypes as { sampleTask: { sum: number } }).sampleTask.sum
        ).to.eql(sumSampleTaskInWorkload + 2);

        const schedulesWorkloadAfterScheduling = (mapValues(
          keyBy(
            workloadAfterScheduling.schedule as Array<[string, number]>,
            ([interval]) => interval
          ),
          ([, count]) => count
        ) as unknown) as {
          '37m': number;
          '37s': number;
        };
        expect(schedulesWorkloadAfterScheduling['37s']).to.eql(schedulesWorkload['37s'] ?? 0 + 1);
        expect(schedulesWorkloadAfterScheduling['37m']).to.eql(schedulesWorkload['37m'] ?? 0 + 1);
      });
    });
  });
}
