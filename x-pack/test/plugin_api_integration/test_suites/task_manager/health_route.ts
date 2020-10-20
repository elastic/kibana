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
  last_update: string;
  status: string;
  stats: {
    configuration: {
      timestamp: string;
      value: Record<string, object>;
    };
    workload: {
      timestamp: string;
      value: {
        count: number;
        task_types: Record<string, object>;
        schedule: Array<[string, number]>;
        overdue: number;
        estimated_schedule_density: number[];
      };
    };
    runtime: {
      timestamp: string;
      value: {
        drift: Record<string, object>;
        execution: {
          duration: Record<string, Record<string, object>>;
          result_frequency_percent_as_number: Record<string, Record<string, object>>;
        };
        polling: {
          last_successful_poll: string;
          result_frequency_percent_as_number: Record<string, number>;
        };
      };
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
      const health = await getHealth();
      expect(health.status).to.eql('OK');
      expect(health.stats.configuration.value).to.eql({
        poll_interval: 3000,
        max_poll_inactivity_cycles: 10,
        monitored_aggregated_stats_refresh_rate: monitoredAggregatedStatsRefreshRate,
        monitored_stats_running_average_window: 50,
        monitored_task_execution_thresholds: {
          custom: {},
          default: {
            error_threshold: 90,
            warn_threshold: 80,
          },
        },
        request_capacity: 1000,
        max_workers: 10,
      });
    });

    it('should return the task manager workload', async () => {
      const health = await getHealth();
      const {
        status,
        stats: { workload },
      } = health;

      expect(status).to.eql('OK');

      const sumSampleTaskInWorkload =
        (workload.value.task_types as {
          sampleTask?: { count: number };
        }).sampleTask?.count ?? 0;
      const scheduledWorkload = (mapValues(
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
          (workloadAfterScheduling.task_types as { sampleTask: { count: number } }).sampleTask.count
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
        expect(schedulesWorkloadAfterScheduling['37s']).to.eql(1 + (scheduledWorkload['37s'] ?? 0));
        expect(schedulesWorkloadAfterScheduling['37m']).to.eql(1 + (scheduledWorkload['37m'] ?? 0));
      });
    });

    it('should return a breakdown of idleTasks in the task manager workload', async () => {
      const {
        workload: { value: workload },
      } = (await getHealth()).stats;

      expect(typeof workload.overdue).to.eql('number');

      expect(Array.isArray(workload.estimated_schedule_density)).to.eql(true);

      // test run with the default poll_interval of 3s and a monitored_aggregated_stats_refresh_rate of 5s,
      // so we expect the estimated_schedule_density to span a minute (which means 20 buckets, as 60s / 3s = 20)
      expect(workload.estimated_schedule_density.length).to.eql(20);
    });

    it('should return the task manager runtime stats', async () => {
      await scheduleTask({
        taskType: 'sampleTask',
        schedule: { interval: '5s' },
      });

      const {
        runtime: {
          value: { drift, polling, execution },
        },
      } = (await getHealth()).stats;

      expect(isNaN(Date.parse(polling.last_successful_poll as string))).to.eql(false);
      expect(typeof polling.result_frequency_percent_as_number.NoTasksClaimed).to.eql('number');
      expect(typeof polling.result_frequency_percent_as_number.RanOutOfCapacity).to.eql('number');
      expect(typeof polling.result_frequency_percent_as_number.PoolFilled).to.eql('number');

      expect(typeof drift.p50).to.eql('number');
      expect(typeof drift.p90).to.eql('number');
      expect(typeof drift.p95).to.eql('number');
      expect(typeof drift.p99).to.eql('number');

      expect(typeof execution.duration.sampleTask.p50).to.eql('number');
      expect(typeof execution.duration.sampleTask.p90).to.eql('number');
      expect(typeof execution.duration.sampleTask.p95).to.eql('number');
      expect(typeof execution.duration.sampleTask.p99).to.eql('number');

      expect(typeof execution.result_frequency_percent_as_number.sampleTask.Success).to.eql(
        'number'
      );
      expect(typeof execution.result_frequency_percent_as_number.sampleTask.RetryScheduled).to.eql(
        'number'
      );
      expect(typeof execution.result_frequency_percent_as_number.sampleTask.Failed).to.eql(
        'number'
      );
    });
  });
}
