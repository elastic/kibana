/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { generateHostData } from '../fixtures/synthtrace/host_data';
import {
  CONTAINER_COUNT,
  CONTAINER_IDS,
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
import { generateLogsDataForHostsOrContainers } from '../fixtures/synthtrace/logs_data_for_hosts_or_containers';
import { generateAddServicesToExistingHost } from '../fixtures/synthtrace/add_services_to_existing_hosts';
import { generateDockerContainersData } from '../fixtures/synthtrace/docker_containers_data';
import { globalSetupHook } from '../fixtures';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ infraSynthtraceEsClient, logsSynthtraceEsClient, apmSynthtraceEsClient, log }) => {
    await infraSynthtraceEsClient.index(
      generateHostData({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        hosts: HOSTS,
      })
    );
    log.info('Host data indexed');

    await logsSynthtraceEsClient.index(
      generateLogsDataForHostsOrContainers({
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
        hostNames: HOSTS.map((host) => host.hostName),
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

    await logsSynthtraceEsClient.index(
      generateLogsDataForHostsOrContainers({
        from: DATE_WITH_DOCKER_DATA_FROM,
        to: DATE_WITH_DOCKER_DATA_TO,
        containerIds: CONTAINER_IDS,
      })
    );
    log.info('Logs data for containers indexed');
  }
);
