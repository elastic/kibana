/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const thresholds = [
  {
    id: 'synthetics_monitor_duration',
    name: 'Monitor Duration Alert',
    data_type: 'synthetics-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'monitor.duration.us',
              aggType: 'avg',
            },
          ],
          threshold: [1000000],
          timeSize: 5,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'monitor.status: "up"',
          language: 'kuery',
        },
        index: 'synthetics-*',
      },
    },
    iconType: 'uptimeApp',
  },
  {
    id: 'synthetics_availability',
    name: 'Availability Alert',
    data_type: 'synthetics-*',
    params: {
      criteria: [
        {
          comparator: '>=',
          metrics: [
            {
              name: 'A',
              field: 'monitor.status',
              aggType: 'count',
            },
          ],
          threshold: [1],
          timeSize: 1,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'monitor.status: "down"',
          language: 'kuery',
        },
        index: 'synthetics-*',
      },
    },
    iconType: 'uptimeApp',
  },
  {
    id: 'apm_slow_transactions',
    name: 'Slow Transactions Alert',
    data_type: 'apm-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'transaction.duration.us',
              aggType: 'avg',
            },
          ],
          threshold: [2000000],
          timeSize: 5,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'transaction.type: "request"',
          language: 'kuery',
        },
        index: 'apm-*',
      },
    },
    iconType: 'apmApp',
  },
  {
    id: 'logs_error_rate',
    name: 'Error Log Rate Alert',
    data_type: 'logs-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'log.level',
              aggType: 'count',
            },
          ],
          threshold: [10],
          timeSize: 10,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'log.level: "error"',
          language: 'kuery',
        },
        index: 'logs-*',
      },
    },
    iconType: 'logsApp',
  },
  {
    id: 'metrics_cpu_usage',
    name: 'CPU Usage Alert',
    data_type: 'metrics-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'system.cpu.user.pct',
              aggType: 'avg',
            },
          ],
          threshold: [80],
          timeSize: 5,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'system.cpu.user.pct > 0',
          language: 'kuery',
        },
        index: 'metrics-*',
      },
    },
    iconType: 'monitoringApp',
  },
  {
    id: 'metrics_memory_usage',
    name: 'Memory Usage Alert',
    data_type: 'metrics-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'system.memory.used.pct',
              aggType: 'avg',
            },
          ],
          threshold: [90],
          timeSize: 5,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'system.memory.used.pct > 0',
          language: 'kuery',
        },
        index: 'metrics-*',
      },
    },
    iconType: 'memory',
  },
  {
    id: 'metrics_disk_space',
    name: 'Disk Space Alert',
    data_type: 'metrics-*',
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              field: 'system.filesystem.used.pct',
              aggType: 'avg',
            },
          ],
          threshold: [85],
          timeSize: 5,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: 'system.filesystem.used.pct > 0',
          language: 'kuery',
        },
        index: 'metrics-*',
      },
    },
    iconType: 'storage',
  },
];
