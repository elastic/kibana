/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FETCH_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (single = true) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.fetchSchedulesFailDescription', {
    defaultMessage:
      'Failed to fetch {failed, plural, one {attack discovery schedule} other {attack discovery schedules}}',
    values: { failed: single ? 1 : 2 },
  });

export const CREATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS = (succeeded = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.createSchedulesSuccess', {
    defaultMessage:
      '{succeeded, plural, one {# attack discovery schedule} other {# attack discovery schedules}} created successfully.',
    values: { succeeded },
  });

export const CREATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (failed = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.createSchedulesFailDescription', {
    defaultMessage:
      'Failed to create {failed, plural, one {# attack discovery schedule} other {# attack discovery schedules}}',
    values: { failed },
  });

export const UPDATE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS = (succeeded = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.updateSchedulesSuccess', {
    defaultMessage:
      '{succeeded, plural, one {# attack discovery schedule} other {# attack discovery schedules}} updated successfully.',
    values: { succeeded },
  });

export const UPDATE_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (failed = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.updateSchedulesFailDescription', {
    defaultMessage:
      'Failed to update {failed, plural, one {# attack discovery schedule} other {# attack discovery schedules}}',
    values: { failed },
  });

export const DELETE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS = (succeeded = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.deleteSchedulesSuccess', {
    defaultMessage:
      '{succeeded, plural, one {# attack discovery schedule} other {# attack discovery schedules}} deleted successfully.',
    values: { succeeded },
  });

export const DELETE_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (failed = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.deleteSchedulesFailDescription', {
    defaultMessage:
      'Failed to delete {failed, plural, one {# attack discovery schedule} other {# attack discovery schedules}}',
    values: { failed },
  });

export const ENABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS = (succeeded = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.enableSchedulesSuccess', {
    defaultMessage:
      '{succeeded, plural, one {# attack discovery schedule} other {# attack discovery schedules}} enabled successfully.',
    values: { succeeded },
  });

export const ENABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (failed = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.enableSchedulesFailDescription', {
    defaultMessage:
      'Failed to enable {failed, plural, one {# attack discovery schedule} other {# attack discovery schedules}}',
    values: { failed },
  });

export const DISABLE_ATTACK_DISCOVERY_SCHEDULES_SUCCESS = (succeeded = 1) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.disableSchedulesSuccess', {
    defaultMessage:
      '{succeeded, plural, one {# attack discovery schedule} other {# attack discovery schedules}} disabled successfully.',
    values: { succeeded },
  });

export const DISABLE_ATTACK_DISCOVERY_SCHEDULES_FAILURE = (failed = 1) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.schedule.disableSchedulesFailDescription',
    {
      defaultMessage:
        'Failed to disable {failed, plural, one {# attack discovery schedule} other {# attack discovery schedules}}',
      values: { failed },
    }
  );

export const FETCH_ATTACK_DISCOVERY_SCHEDULE_RULE_TYPE_FAILURE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.fetchScheduleRuleTypeFailDescription',
  {
    defaultMessage: 'Failed to fetch attack discovery schedule rule type',
  }
);
