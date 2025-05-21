/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CrowdstrikeBaseApiResponse,
  CrowdstrikeGetAgentOnlineStatusResponse,
  CrowdstrikeGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { merge } from 'lodash';
import { TEST_AGENT_ID, TEST_CID_ID } from './routes/utils';

export const createCrowdstrikeGetAgentsApiResponseMock = (
  data: CrowdstrikeBaseApiResponse['resources'][number]
) => {
  return {
    meta: {
      query_time: 0.001831479,
      powered_by: 'device-api',
      trace_id: 'xxx',
    },
    errors: null,
    resources: data,
  };
};

export const createCrowdstrikeErrorResponseMock = (error: object) => {
  return {
    meta: {
      query_time: 0.001831479,
      powered_by: 'device-api',
      trace_id: 'xxx',
    },
    errors: [error],
  };
};

export const createCrowdstrikeAgentDetailsMock = (
  overrides: Partial<CrowdstrikeGetAgentsResponse['resources'][number]> = {}
): CrowdstrikeGetAgentsResponse['resources'][number] => {
  return merge(
    {
      device_id: TEST_AGENT_ID,
      cid: TEST_CID_ID,
      agent_load_flags: '0',
      agent_local_time: '2024-09-08T06:07:00.326Z',
      agent_version: '7.18.17106.0',
      bios_manufacturer: 'EFI Development Kit II / OVMF',
      bios_version: '0.0.0',
      config_id_base: '65994763',
      config_id_build: '17106',
      config_id_platform: '128',
      cpu_signature: '4294967295',
      cpu_vendor: '3',
      external_ip: '79.184.246.19',
      mac_address: '52-54-00-09-42-a6',
      hostname: 'cs-falcon',
      filesystem_containment_status: 'normal',
      first_login_timestamp: '2024-08-19T08:37:15Z',
      first_login_user: 'ubuntu',
      first_seen: '2024-08-19T08:37:17Z',
      last_login_timestamp: '2024-08-19T08:37:15Z',
      last_login_user: 'ubuntu',
      last_login_uid: '1000',
      last_seen: '2024-09-10T09:32:58Z',
      local_ip: '192.168.80.7',
      major_version: '6',
      minor_version: '8',
      os_version: 'Ubuntu 24.04',
      platform_id: '3',
      platform_name: 'Linux',
      policies: [
        {
          policy_type: 'prevention',
          policy_id: 'test_prevention_policy_id',
          applied: true,
          settings_hash: 'test2984',
          assigned_date: '2024-08-19T08:40:24.454802663Z',
          applied_date: '2024-08-19T08:46:46.169115065Z',
          rule_groups: [],
        },
      ],
      reduced_functionality_mode: 'no',
      device_policies: {
        prevention: {
          policy_type: 'prevention',
          policy_id: 'test_prevention_policy_id',
          applied: true,
          settings_hash: 'test2984',
          assigned_date: '2024-08-19T08:40:24.454802663Z',
          applied_date: '2024-08-19T08:46:46.169115065Z',
          rule_groups: [],
        },
        sensor_update: {
          policy_type: 'sensor-update',
          policy_id: 'test_sensor_update_policy_id',
          applied: true,
          settings_hash: 'test3a5bb',
          assigned_date: '2024-08-19T08:40:24.406563043Z',
          applied_date: '2024-08-19T08:44:54.277815271Z',
          uninstall_protection: 'UNKNOWN',
        },
        global_config: {
          policy_type: 'globalconfig',
          policy_id: 'test_global_config_policy_id',
          applied: true,
          settings_hash: 'testa5bc',
          assigned_date: '2024-09-08T04:54:07.410501178Z',
          applied_date: '2024-09-08T04:55:06.81648557Z',
        },
        remote_response: {
          policy_type: 'remote-response',
          policy_id: 'test_remote_response_policy_id',
          applied: true,
          settings_hash: 'test205c',
          assigned_date: '2024-08-19T08:48:00.144480664Z',
          applied_date: '2024-08-19T08:55:01.036602542Z',
        },
        'host-retention': {
          policy_type: 'host-retention',
          policy_id: 'test_host-retention_policy_id',
          applied: true,
          settings_hash: 'testfghjk',
          assigned_date: '2024-08-19T08:40:24.444810716Z',
          applied_date: '2024-08-19T08:44:54.577562462Z',
        },
      },
      groups: ['test123', 'test456'],
      group_hash: 'test123',
      product_type_desc: 'Server',
      provision_status: 'Provisioned',
      status: 'normal',
      system_manufacturer: 'QEMU',
      system_product_name: 'QEMU Virtual Machine',
      tags: [],
      modified_timestamp: '2024-09-10T09:33:21Z',
      meta: {
        version: '552',
        version_string: '1:1815077394',
      },
      kernel_version: '6.8.0-41-generic',
      chassis_type: '1',
      chassis_type_desc: 'Other',
      connection_ip: '192.168.80.7',
      default_gateway_ip: '192.168.80.1',
      connection_mac_address: '52-54-00-09-42-a6',
      linux_sensor_mode: 'User Mode',
      deployment_type: 'Standard',
    },
    overrides
  );
};

export const createCrowdstrikeGetAgentOnlineStatusDetailsMock: (
  overrides: Partial<CrowdstrikeGetAgentOnlineStatusResponse['resources'][number]>
) => CrowdstrikeGetAgentOnlineStatusResponse['resources'][number] = (overrides) => {
  return merge(
    {
      id: TEST_AGENT_ID,
      cid: TEST_CID_ID,
      last_seen: '2024-09-10T09:59:56Z',
      state: 'online',
    },
    overrides
  );
};
