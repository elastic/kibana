/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateHostData } from '../fixtures/synthtrace/host_data';
import {
  CONTAINER_COUNT,
  DATE_WITH_DOCKER_DATA_FROM,
  DATE_WITH_DOCKER_DATA_TO,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  DATE_WITH_HOSTS_WITHOUT_DATA_FROM,
  DATE_WITH_HOSTS_WITHOUT_DATA_TO,
  DATE_WITH_K8S_HOSTS_DATA_FROM,
  DATE_WITH_K8S_HOSTS_DATA_TO,
  DATE_WITH_POD_DATA_FROM,
  DATE_WITH_POD_DATA_TO,
  HOST_NAME_WITH_SERVICES,
  HOSTS,
  HOSTS_WITHOUT_DATA,
  POD_COUNT,
  SERVICE_PER_HOST_COUNT,
} from '../fixtures/constants';
import { generateHostsWithK8sNodeData } from '../fixtures/synthtrace/hosts_with_k8s_node_data';
import { generatePodsData } from '../fixtures/synthtrace/pods_data';
import { generateLogsDataForHosts } from '../fixtures/synthtrace/logs_data_for_hosts';
import { generateAddServicesToExistingHost } from '../fixtures/synthtrace/add_services_to_existing_hosts';
import { generateDockerContainersData } from '../fixtures/synthtrace/docker_containers_data';
import { globalSetupHook } from '../fixtures';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({
    infraSynthtraceEsClient,
    logsSynthtraceEsClient,
    apmSynthtraceEsClient,
    profilingSetup,
    log,
  }) => {
    // Set up Universal Profiling resources and data if needed
    try {
      const status = await profilingSetup.checkStatus();
      log.info('Profiling status:', status);

      if (!status.has_setup) {
        await profilingSetup.setupResources();
      } else {
        log.info('Profiling resources already set up.');
      }

      if (!status.has_data) {
        await profilingSetup.loadData();
      } else {
        log.info('Profiling data already loaded.');
      }
    } catch (error: any) {
      // If profiling API is not available, log and continue
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        log.info('Profiling API not available or error occurred, skipping profiling setup');
      } else {
        log.error(`Error setting up profiling: ${error}`);
        // Don't throw - allow tests to continue
      }
    }

    await infraSynthtraceEsClient.index(
      generateHostData({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        hosts: HOSTS,
      })
    );
    log.info('Host data indexed');

    await logsSynthtraceEsClient.index(
      generateLogsDataForHosts({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        hosts: HOSTS,
      })
    );
    log.info('Logs data for hosts indexed');

    await apmSynthtraceEsClient.index(
      generateAddServicesToExistingHost({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        hostName: HOST_NAME_WITH_SERVICES,
        servicesPerHost: SERVICE_PER_HOST_COUNT,
      })
    );
    log.info('Service data for hosts indexed');

    await infraSynthtraceEsClient.index(
      generateHostData({
        from: DATE_WITH_HOSTS_WITHOUT_DATA_FROM,
        to: DATE_WITH_HOSTS_WITHOUT_DATA_TO,
        hosts: HOSTS_WITHOUT_DATA,
      })
    );
    log.info('Hosts without data indexed');

    await infraSynthtraceEsClient.index(
      generateHostsWithK8sNodeData({
        from: DATE_WITH_K8S_HOSTS_DATA_FROM,
        to: DATE_WITH_K8S_HOSTS_DATA_TO,
      })
    );
    log.info('Hosts with K8s node data indexed');

    await infraSynthtraceEsClient.index(
      generatePodsData({
        from: DATE_WITH_POD_DATA_FROM,
        to: DATE_WITH_POD_DATA_TO,
        count: POD_COUNT,
      })
    );
    log.info('Pods data indexed');

    await infraSynthtraceEsClient.index(
      generateDockerContainersData({
        from: DATE_WITH_DOCKER_DATA_FROM,
        to: DATE_WITH_DOCKER_DATA_TO,
        count: CONTAINER_COUNT,
      })
    );
    log.info('Docker containers data indexed');
  }
);
