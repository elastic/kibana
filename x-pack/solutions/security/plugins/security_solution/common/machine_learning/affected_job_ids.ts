/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These are the job IDs of ML jobs that are dependent on specific ECS data. If
// any of them is installed, we want to notify the user that they potentially
// have incompatibility between their beats, rules, and jobs.
// There are four modules of jobs that are affected. However, because the API
// that returns installed jobs does not include those jobs' modules, hardcoding
// the IDs from those modules (as found in e.g.
// x-pack/platform/plugins/shared/ml/server/models/data_recognizer/modules/security_windows/manifest.json)
// allows us to make this determination from a single API call.
//
// Note: In 8.3 the V3 ML modules were released (#131166) and a large portion of the V1/V2
// jobs were removed or replaced. We'll use this same list of affectedJobIds to show a modal
// before updating their Detection Rules to inform users of this change and any actions that
// must be taken before updating  to ensure continued functionality if they still need to run
// the V1/V2 jobs
// For details see: https://github.com/elastic/kibana/issues/128121
//
// Note: In 9.4 the V3 jobs were replaced by Entity Analytics (_ea) variants that use
// Entity Analytics fields (host.id, user.id, event.module, etc.) as influencers.
// V3 non-EA jobs are now also considered affected.
export const affectedJobIds: string[] = [
  // security_linux module (V2 -> V3 _ea)
  'v2_rare_process_by_host_linux_ecs', // Replaced by: v3_rare_process_by_host_linux_ea
  'v2_linux_rare_metadata_user', // Replaced by: v3_linux_rare_metadata_user_ea
  'v2_linux_rare_metadata_process', // Replaced by: v3_linux_rare_metadata_process_ea
  'v2_linux_anomalous_user_name_ecs', // Replaced by: v3_linux_anomalous_user_name_ea
  'v2_linux_anomalous_process_all_hosts_ecs', // Replaced by: v3_linux_anomalous_process_all_hosts_ea
  'v2_linux_anomalous_network_port_activity_ecs', // Replaced by: v3_linux_anomalous_network_port_activity_ea
  // security_windows module (V2 -> V3 _ea)
  'v2_rare_process_by_host_windows_ecs', // Replaced by: v3_rare_process_by_host_windows_ea
  'v2_windows_anomalous_network_activity_ecs', // Replaced by: v3_windows_anomalous_network_activity_ea
  'v2_windows_anomalous_path_activity_ecs', // Replaced by: v3_windows_anomalous_path_activity_ea
  'v2_windows_anomalous_process_all_hosts_ecs', // Replaced by: v3_windows_anomalous_process_all_hosts_ea
  'v2_windows_anomalous_process_creation', // Replaced by: v3_windows_anomalous_process_creation_ea
  'v2_windows_anomalous_user_name_ecs', // Replaced by: v3_windows_anomalous_user_name_ea
  'v2_windows_rare_metadata_process', // Replaced by: v3_windows_rare_metadata_process_ea
  'v2_windows_rare_metadata_user', // Replaced by: v3_windows_rare_metadata_user_ea
  // siem_auditbeat module (V1 -> V3 _ea)
  'rare_process_by_host_linux_ecs', // Replaced by: v3_rare_process_by_host_linux_ea
  'linux_anomalous_network_activity_ecs', // Replaced by: v3_linux_anomalous_network_activity_ea
  'linux_anomalous_network_port_activity_ecs', // Replaced by: v3_linux_anomalous_network_port_activity_ea
  'linux_anomalous_network_service', // Deleted
  'linux_anomalous_network_url_activity_ecs', // Deleted
  'linux_anomalous_process_all_hosts_ecs', // Replaced by: v3_linux_anomalous_process_all_hosts_ea
  'linux_anomalous_user_name_ecs', // Replaced by: v3_linux_anomalous_user_name_ea
  'linux_rare_metadata_process', // Replaced by: v3_linux_rare_metadata_process_ea
  'linux_rare_metadata_user', // Replaced by: v3_linux_rare_metadata_user_ea
  'linux_rare_user_compiler', // Replaced by: v3_linux_rare_user_compiler_ea
  'linux_rare_kernel_module_arguments', // Deleted
  'linux_rare_sudo_user', // Replaced by: v3_linux_rare_sudo_user_ea
  'linux_system_user_discovery', // Replaced by: v3_linux_system_user_discovery_ea
  'linux_system_information_discovery', // Replaced by: v3_linux_system_information_discovery_ea
  'linux_system_process_discovery', // Replaced by: v3_linux_system_process_discovery_ea
  'linux_network_connection_discovery', // Replaced by: v3_linux_network_connection_discovery_ea
  'linux_network_configuration_discovery', // Replaced by: v3_linux_network_configuration_discovery_ea
  // siem_winlogbeat module (V1 -> V3 _ea)
  'rare_process_by_host_windows_ecs', // Replaced by: v3_rare_process_by_host_windows_ea
  'windows_anomalous_network_activity_ecs', // Replaced by: v3_windows_anomalous_network_activity_ea
  'windows_anomalous_path_activity_ecs', // Replaced by: v3_windows_anomalous_path_activity_ea
  'windows_anomalous_process_all_hosts_ecs', // Replaced by: v3_windows_anomalous_process_all_hosts_ea
  'windows_anomalous_process_creation', // Replaced by: v3_windows_anomalous_process_creation_ea
  'windows_anomalous_script', // Replaced by: v3_windows_anomalous_script_ea
  'windows_anomalous_service', // Replaced by: v3_windows_anomalous_service_ea
  'windows_anomalous_user_name_ecs', // Replaced by: v3_windows_anomalous_user_name_ea
  'windows_rare_user_runas_event', // Replaced by: v3_windows_rare_user_runas_event_ea
  'windows_rare_metadata_process', // Replaced by: v3_windows_rare_metadata_process_ea
  'windows_rare_metadata_user', // Replaced by: v3_windows_rare_metadata_user_ea
  // siem_winlogbeat_auth module (V1 -> V3 _ea)
  'windows_rare_user_type10_remote_login', // Replaced by: v3_windows_rare_user_type10_remote_login_ea
  // security_linux module V3 (non-EA, replaced by _ea variants)
  'v3_rare_process_by_host_linux_ecs', // Replaced by: v3_rare_process_by_host_linux_ea
  'v3_linux_rare_metadata_user', // Replaced by: v3_linux_rare_metadata_user_ea
  'v3_linux_rare_metadata_process', // Replaced by: v3_linux_rare_metadata_process_ea
  'v3_linux_anomalous_user_name_ecs', // Replaced by: v3_linux_anomalous_user_name_ea
  'v3_linux_anomalous_process_all_hosts_ecs', // Replaced by: v3_linux_anomalous_process_all_hosts_ea
  'v3_linux_anomalous_network_port_activity_ecs', // Replaced by: v3_linux_anomalous_network_port_activity_ea
  'v3_linux_anomalous_network_activity_ecs', // Replaced by: v3_linux_anomalous_network_activity_ea
  'v3_linux_rare_user_compiler', // Replaced by: v3_linux_rare_user_compiler_ea
  'v3_linux_rare_sudo_user', // Replaced by: v3_linux_rare_sudo_user_ea
  'v3_linux_system_user_discovery', // Replaced by: v3_linux_system_user_discovery_ea
  'v3_linux_system_information_discovery', // Replaced by: v3_linux_system_information_discovery_ea
  'v3_linux_system_process_discovery', // Replaced by: v3_linux_system_process_discovery_ea
  'v3_linux_network_connection_discovery', // Replaced by: v3_linux_network_connection_discovery_ea
  'v3_linux_network_configuration_discovery', // Replaced by: v3_linux_network_configuration_discovery_ea
  // security_windows module V3 (non-EA, replaced by _ea variants)
  'v3_rare_process_by_host_windows_ecs', // Replaced by: v3_rare_process_by_host_windows_ea
  'v3_windows_anomalous_network_activity_ecs', // Replaced by: v3_windows_anomalous_network_activity_ea
  'v3_windows_anomalous_path_activity_ecs', // Replaced by: v3_windows_anomalous_path_activity_ea
  'v3_windows_anomalous_process_all_hosts_ecs', // Replaced by: v3_windows_anomalous_process_all_hosts_ea
  'v3_windows_anomalous_process_creation', // Replaced by: v3_windows_anomalous_process_creation_ea
  'v3_windows_anomalous_user_name_ecs', // Replaced by: v3_windows_anomalous_user_name_ea
  'v3_windows_rare_metadata_process', // Replaced by: v3_windows_rare_metadata_process_ea
  'v3_windows_rare_metadata_user', // Replaced by: v3_windows_rare_metadata_user_ea
  'v3_windows_anomalous_script', // Replaced by: v3_windows_anomalous_script_ea
  'v3_windows_anomalous_service', // Replaced by: v3_windows_anomalous_service_ea
  'v3_windows_rare_user_runas_event', // Replaced by: v3_windows_rare_user_runas_event_ea
  'v3_windows_rare_user_type10_remote_login', // Replaced by: v3_windows_rare_user_type10_remote_login_ea
  'v3_windows_rare_script', // Replaced by: v3_windows_rare_script_ea
];
