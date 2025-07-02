/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios from 'axios';

import { cloneDeep } from 'lodash';

import { telemetryConfiguration } from '../lib/telemetry/configuration';
import {
  TaskManagerPlugin,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';

import {
  setupTestServers,
  removeFile,
  mockAxiosPost,
  DEFAULT_GET_ROUTES,
  mockAxiosGet,
  getRandomInt,
} from './lib/helpers';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Plugin as SecuritySolutionPlugin } from '../plugin';
import { getTelemetryTasks, runSoonConfigTask } from './lib/telemetry_helpers';
import type { SecurityTelemetryTask } from '../lib/telemetry/task';

jest.mock('axios');

const logFilePath = Path.join(__dirname, 'config.logs.log');
const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
const securitySolutionStartSpy = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

const mockedAxiosGet = jest.spyOn(axios, 'get');
const mockedAxiosPost = jest.spyOn(axios, 'post');

const securitySolutionPlugin = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

describe('configuration', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let tasks: SecurityTelemetryTask[];

  beforeAll(async () => {
    await removeFile(logFilePath);

    const servers = await setupTestServers(logFilePath);

    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(securitySolutionStartSpy).toHaveBeenCalledTimes(1);

    tasks = getTelemetryTasks(securitySolutionStartSpy);

    expect(securitySolutionPlugin).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAxiosPost(mockedAxiosPost);
  });

  afterEach(async () => {});

  describe('configuration task', () => {
    it('should keep default values when no new config was provided', async () => {
      const before = cloneDeep(telemetryConfiguration);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      expect(telemetryConfiguration).toEqual(before);
    });

    it('should update values with new manifest', async () => {
      const expected = {
        telemetry_max_buffer_size: getRandomInt(1, 100),
        max_security_list_telemetry_batch: getRandomInt(1, 100),
        max_endpoint_telemetry_batch: getRandomInt(1, 100),
        max_detection_rule_telemetry_batch: getRandomInt(1, 100),
        max_detection_alerts_batch: getRandomInt(1, 100),
        use_async_sender: true,
        pagination_config: {
          max_page_size_bytes: getRandomInt(1, 100),
          num_docs_to_sample: getRandomInt(1, 100),
        },
        sender_channels: {
          default: {
            buffer_time_span_millis: getRandomInt(1, 100),
            inflight_events_threshold: getRandomInt(1, 100),
            max_payload_size_bytes: getRandomInt(1, 100),
          },
        },
        indices_metadata_config: {
          indices_threshold: getRandomInt(1, 100),
          datastreams_threshold: getRandomInt(1, 100),
          indices_settings_threshold: getRandomInt(1, 100),
          max_prefixes: getRandomInt(1, 100),
          max_group_size: getRandomInt(1, 100),
        },
        ingest_pipelines_stats_config: {
          enabled: false,
        },
      };

      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [/.*telemetry-buffer-and-batch-sizes-v1.*/, { status: 200, data: cloneDeep(expected) }],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      expect(telemetryConfiguration.telemetry_max_buffer_size).toEqual(
        expected.telemetry_max_buffer_size
      );
      expect(telemetryConfiguration.max_security_list_telemetry_batch).toEqual(
        expected.max_security_list_telemetry_batch
      );
      expect(telemetryConfiguration.max_endpoint_telemetry_batch).toEqual(
        expected.max_endpoint_telemetry_batch
      );
      expect(telemetryConfiguration.max_detection_rule_telemetry_batch).toEqual(
        expected.max_detection_rule_telemetry_batch
      );
      expect(telemetryConfiguration.max_detection_alerts_batch).toEqual(
        expected.max_detection_alerts_batch
      );
      expect(telemetryConfiguration.use_async_sender).toEqual(expected.use_async_sender);
      expect(telemetryConfiguration.sender_channels).toEqual(expected.sender_channels);
      expect(telemetryConfiguration.pagination_config).toEqual(expected.pagination_config);
      expect(telemetryConfiguration.indices_metadata_config).toEqual(
        expected.indices_metadata_config
      );
      expect(telemetryConfiguration.ingest_pipelines_stats_config).toEqual(
        expected.ingest_pipelines_stats_config
      );
    });
  });
});
