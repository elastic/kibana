/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { find, uniqBy } from 'lodash/fp';
import { ALERT_RULE_PARAMETERS, ALERT_RULE_TYPE } from '@kbn/rule-data-utils';

import { EventCode, EventCategory } from '@kbn/securitysolution-ecs';
import { i18n } from '@kbn/i18n';
import { SUPPORTED_AGENT_ID_ALERT_FIELDS } from '../../../../common/endpoint/service/response_actions/constants';
import {
  ALERTS_HEADERS_THRESHOLD_CARDINALITY,
  ALERTS_HEADERS_THRESHOLD_COUNT,
  ALERTS_HEADERS_THRESHOLD_TERMS,
  ALERTS_HEADERS_RULE_DESCRIPTION,
  ALERTS_HEADERS_NEW_TERMS,
  ALERTS_HEADERS_NEW_TERMS_FIELDS,
} from '../../../detections/components/alerts_table/translations';
import {
  ALERT_NEW_TERMS_FIELDS,
  ALERT_NEW_TERMS,
  ALERT_THRESHOLD_RESULT,
} from '../../../../common/field_maps/field_names';
import {
  AGENT_STATUS_FIELD_NAME,
  QUARANTINED_PATH_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import type { EventSummaryField } from './types';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

const THRESHOLD_TERMS_FIELD = `${ALERT_THRESHOLD_RESULT}.terms.field`;
const THRESHOLD_TERMS_VALUE = `${ALERT_THRESHOLD_RESULT}.terms.value`;
const THRESHOLD_CARDINALITY_FIELD = `${ALERT_THRESHOLD_RESULT}.cardinality.field`;
const THRESHOLD_COUNT = `${ALERT_THRESHOLD_RESULT}.count`;

const AGENT_STATUS = i18n.translate('xpack.securitySolution.detections.alerts.agentStatus', {
  defaultMessage: 'Agent status',
});
const QUARANTINED_FILE_PATH = i18n.translate(
  'xpack.securitySolution.detections.alerts.quarantinedFilePath',
  {
    defaultMessage: 'Quarantined file path',
  }
);
const RULE_TYPE = i18n.translate('xpack.securitySolution.detections.alerts.ruleType', {
  defaultMessage: 'Rule type',
});

/** Always show these fields */
const alwaysDisplayedFields: EventSummaryField[] = [
  { id: 'host.name' },

  // Add all fields used to identify the agent ID in alert events and override them to
  // show the `agent.status` field name/value
  ...SUPPORTED_AGENT_ID_ALERT_FIELDS.map((fieldPath) => {
    return {
      id: fieldPath,
      overrideField: AGENT_STATUS_FIELD_NAME,
      label: AGENT_STATUS,
    };
  }),

  // ** //
  { id: 'Endpoint.policy.applied.artifacts.global.channel' },
  { id: 'user.name' },
  { id: 'rule.name' },
  { id: 'cloud.provider' },
  { id: 'cloud.region' },
  { id: 'cloud.provider' },
  { id: 'cloud.region' },
  { id: 'orchestrator.cluster.id' },
  { id: 'orchestrator.cluster.name' },
  { id: 'container.image.name' },
  { id: 'container.image.tag' },
  { id: 'orchestrator.namespace' },
  { id: 'orchestrator.resource.parent.type' },
  { id: 'orchestrator.resource.type' },
  { id: 'process.executable' },
  { id: 'file.path' },
  { id: ALERT_RULE_TYPE, label: RULE_TYPE },
];

/**
 * Get a list of fields to display based on the event's category
 */
function getFieldsByCategory({
  primaryEventCategory,
  allEventCategories,
}: EventCategories): EventSummaryField[] {
  switch (primaryEventCategory) {
    case EventCategory.PROCESS:
      return [{ id: 'process.name' }, { id: 'process.parent.name' }, { id: 'process.args' }];
    case EventCategory.FILE:
      return [
        { id: 'file.name' },
        { id: 'file.hash.sha256' },
        { id: 'file.directory' },
        { id: 'process.name' },
      ];
    case EventCategory.NETWORK:
      return [
        { id: 'destination.address' },
        { id: 'destination.port' },
        { id: 'source.address' },
        { id: 'source.port' },
        { id: 'dns.question.name' },
        { id: 'process.name' },
      ];
    case EventCategory.REGISTRY:
      return [{ id: 'registry.key' }, { id: 'registry.value' }, { id: 'process.name' }];
    case EventCategory.MALWARE:
      // The details for malware events can be found in the file fields
      return getFieldsByCategory({ primaryEventCategory: EventCategory.FILE, allEventCategories });
    default:
      let fields: EventSummaryField[] = [];

      // If no primary category matches or hasn't been defined on purpose (e.g. in order to follow the source event)
      // resolve more fields based on the other event categories.
      if (allEventCategories?.includes(EventCategory.FILE)) {
        fields = fields.concat(getFieldsByCategory({ primaryEventCategory: EventCategory.FILE }));
      }

      if (allEventCategories?.includes(EventCategory.PROCESS)) {
        fields = fields.concat(
          getFieldsByCategory({ primaryEventCategory: EventCategory.PROCESS })
        );
      }
      return fields;
  }
}

/**
 * Gets the fields to display based on the event's code.
 * Contains some enhancements to resolve more fields based on the event's categories.
 * @param eventCode The event's code
 * @param eventCategories The events categories
 * @returns A list of fields to include
 */
function getFieldsByEventCode(
  eventCode: string | undefined,
  eventCategories: EventCategories
): EventSummaryField[] {
  switch (eventCode) {
    case EventCode.BEHAVIOR:
      return [
        { id: 'rule.description', label: ALERTS_HEADERS_RULE_DESCRIPTION },
        // Resolve more fields based on the source event
        ...getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined }),
      ];
    case EventCode.SHELLCODE_THREAD:
      return [
        { id: 'Target.process.executable' },
        {
          id: 'Memory_protection.unique_key_v1',
        },
      ];
    case EventCode.RANSOMWARE:
      return [
        { id: 'Ransomware.feature' },
        { id: 'process.hash.sha256' },
        ...getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined }),
      ];
    case EventCode.MEMORY_SIGNATURE:
      // Resolve more fields based on the source event
      return getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined });
    case EventCode.MALICIOUS_FILE:
      return [
        {
          id: 'file.Ext.quarantine_path',
          overrideField: QUARANTINED_PATH_FIELD_NAME,
          label: QUARANTINED_FILE_PATH,
        },
      ];
    default:
      return [];
  }
}

/**
 * Returns a list of fields based on the event's rule type
 */
function getFieldsByRuleType(ruleType?: string): EventSummaryField[] {
  switch (ruleType) {
    case 'threshold':
      return [
        { id: THRESHOLD_COUNT, label: ALERTS_HEADERS_THRESHOLD_COUNT },
        {
          id: THRESHOLD_TERMS_FIELD,
          overrideField: THRESHOLD_TERMS_VALUE,
          label: ALERTS_HEADERS_THRESHOLD_TERMS,
        },
        {
          id: THRESHOLD_CARDINALITY_FIELD,
          label: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
        },
      ];
    case 'machine_learning':
      return [
        {
          id: `${ALERT_RULE_PARAMETERS}.machine_learning_job_id`,
          legacyId: 'signal.rule.machine_learning_job_id',
        },
        {
          id: `${ALERT_RULE_PARAMETERS}.anomaly_threshold`,
          legacyId: 'signal.rule.anomaly_threshold',
        },
      ];
    case 'threat_match':
      return [
        {
          id: `${ALERT_RULE_PARAMETERS}.threat_index`,
          legacyId: 'signal.rule.threat_index',
        },
        {
          id: `${ALERT_RULE_PARAMETERS}.threat_query`,
          legacyId: 'signal.rule.threat_query',
        },
      ];
    case 'new_terms':
      return [
        {
          id: ALERT_NEW_TERMS_FIELDS,
          label: ALERTS_HEADERS_NEW_TERMS_FIELDS,
        },
        {
          id: ALERT_NEW_TERMS,
          label: ALERTS_HEADERS_NEW_TERMS,
        },
      ];
    default:
      return [];
  }
}

/**
 * Gets the fields to display based on custom rules and configuration
 * @param customs The list of custom-defined fields to display
 * @returns The list of custom-defined fields to display
 */
function getHighlightedFieldsOverride(customs: string[]): EventSummaryField[] {
  return customs.map((field) => ({ id: field }));
}

/**
  This function is exported because it is used in the Exception Component to
  populate the conditions with the Highlighted Fields. Additionally, the new
  Alert Summary Flyout also requires access to these fields.
  As the Alert Summary components will undergo changes soon we will go with
  exporting the function only for now.
 */
/**
 * Assembles a list of fields to display based on the event
 */
export function getEventFieldsToDisplay({
  eventCategories,
  eventCode,
  eventRuleType,
  highlightedFieldsOverride,
}: {
  eventCategories: EventCategories;
  eventCode?: string;
  eventRuleType?: string;
  highlightedFieldsOverride: string[];
}): EventSummaryField[] {
  const fields = [
    ...getHighlightedFieldsOverride(highlightedFieldsOverride),
    ...alwaysDisplayedFields,
    ...getFieldsByCategory(eventCategories),
    ...getFieldsByEventCode(eventCode, eventCategories),
    ...getFieldsByRuleType(eventRuleType),
  ];

  // Filter all fields by their id to make sure there are no duplicates
  return uniqBy('id', fields);
}

interface EventCategories {
  primaryEventCategory?: string;
  allEventCategories?: string[];
}

/**
 * Extract the event's categories
 * @param data The event details
 * @returns The event's primary category and all other categories in case there is more than one
 */
export function getEventCategoriesFromData(data: TimelineEventsDetailsItem[]): EventCategories {
  const eventCategoryField = find({ category: 'event', field: 'event.category' }, data);

  let primaryEventCategory: string | undefined;
  let allEventCategories: string[] | undefined;

  if (Array.isArray(eventCategoryField?.originalValue)) {
    primaryEventCategory = eventCategoryField?.originalValue[0];
    allEventCategories = eventCategoryField?.originalValue;
  } else {
    primaryEventCategory = eventCategoryField?.originalValue;
    if (primaryEventCategory) {
      allEventCategories = [primaryEventCategory];
    }
  }

  return { primaryEventCategory, allEventCategories };
}
