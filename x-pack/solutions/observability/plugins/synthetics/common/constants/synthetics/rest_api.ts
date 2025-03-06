/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SYNTHETICS_API_URLS {
  // public apis
  SYNTHETICS_MONITORS = '/api/synthetics/monitors',
  GET_SYNTHETICS_MONITOR = '/api/synthetics/monitors/{monitorId}',
  PRIVATE_LOCATIONS = `/api/synthetics/private_locations`,
  PARAMS = `/api/synthetics/params`,
  LATEST_TEST_RUN = '/api/synthetics/latest_test_run',

  // Service end points
  INDEX_TEMPLATES = '/internal/synthetics/service/index_templates',
  SERVICE_LOCATIONS = '/internal/uptime/service/locations',
  SYNTHETICS_MONITOR_INSPECT = '/internal/synthetics/service/monitor/inspect',
  SYNTHETICS_ENABLEMENT = '/internal/synthetics/service/enablement',
  RUN_ONCE_MONITOR = '/internal/synthetics/service/monitors/run_once',
  TRIGGER_MONITOR = '/internal/synthetics/service/monitors/trigger',
  SERVICE_ALLOWED = '/internal/synthetics/service/allowed',
  SYNTHETICS_PROJECT_APIKEY = '/internal/synthetics/service/api_key',
  SYNTHETICS_HAS_INTEGRATION_MONITORS = '/internal/synthetics/fleet/has_integration_monitors',

  PINGS = '/internal/synthetics/pings',
  MONITOR_STATUS_HEATMAP = '/internal/synthetics/ping_heatmap',
  OVERVIEW_TRENDS = '/internal/synthetics/overview_trends',
  OVERVIEW_STATUS = `/internal/synthetics/overview_status`,
  INDEX_SIZE = `/internal/synthetics/index_size`,
  AGENT_POLICIES = `/internal/synthetics/agent_policies`,
  PRIVATE_LOCATIONS_MONITORS = `/internal/synthetics/private_locations/monitors`,
  SYNC_GLOBAL_PARAMS = `/internal/synthetics/sync_global_params`,
  ENABLE_DEFAULT_ALERTING = `/internal/synthetics/enable_default_alerting`,
  GET_ACTIONS_CONNECTORS = `/internal/synthetics/get_actions_connectors`,
  GET_CONNECTOR_TYPES = `/internal/synthetics/get_connector_types`,
  JOURNEY = `/internal/synthetics/journey/{checkGroup}`,
  SYNTHETICS_SUCCESSFUL_CHECK = `/internal/synthetics/synthetics/check/success`,
  JOURNEY_SCREENSHOT_BLOCKS = `/internal/synthetics/journey/screenshot/block`,
  JOURNEY_FAILED_STEPS = `/internal/synthetics/journeys/failed_steps`,
  NETWORK_EVENTS = `/internal/synthetics/network_events`,
  JOURNEY_SCREENSHOT = `/internal/synthetics/journey/screenshot/{checkGroup}/{stepIndex}`,
  DELETE_PACKAGE_POLICY = `/internal/synthetics/monitor/policy/{packagePolicyId}`,
  FILTERS = '/internal/synthetics/monitor/filters',

  CERTS = '/internal/synthetics/certs',

  SUGGESTIONS = `/internal/synthetics/suggestions`,

  // Project monitor public endpoint
  SYNTHETICS_MONITORS_PROJECT = '/api/synthetics/project/{projectName}/monitors',
  SYNTHETICS_MONITORS_PROJECT_UPDATE = '/api/synthetics/project/{projectName}/monitors/_bulk_update',
  SYNTHETICS_MONITORS_PROJECT_DELETE = '/api/synthetics/project/{projectName}/monitors/_bulk_delete',

  DYNAMIC_SETTINGS = `/api/synthetics/settings`,

  INSPECT_STATUS_RULE = '/internal/synthetics/inspect_status_rule',
}
