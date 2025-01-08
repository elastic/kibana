/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { parseEcsFieldPath } from '../../lib/endpoint';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS } from '../../../../common/endpoint/service/response_actions/constants';

/**
 * Provide overrides for data `fields`. If a field is set to `undefined`, then it will be removed
 * from the array.  If an override field name is not currently in the array, it will be added.
 */
interface AlertDetailsItemDataOverrides {
  [field: string]: Partial<TimelineEventsDetailsItem> | undefined;
}

/**
 * Will update (mutate) the data passed in with the override data defined
 * @param data
 * @param overrides
 */
const setAlertDetailsItemDataOverrides = (
  data: TimelineEventsDetailsItem[],
  overrides: AlertDetailsItemDataOverrides
): TimelineEventsDetailsItem[] => {
  if (Object.keys(overrides).length > 0) {
    const definedFields: string[] = [];
    const deleteIndexes: number[] = [];

    // Override current fields' values
    data.forEach((item, index) => {
      definedFields.push(item.field);

      if (item.field in overrides) {
        // If value is undefined, then mark item for deletion
        if (!overrides[item.field]) {
          deleteIndexes.unshift(index);
        } else {
          Object.assign(item, overrides[item.field]);
        }
      }
    });

    // Delete any items from the array
    if (deleteIndexes.length > 0) {
      for (const index of deleteIndexes) {
        data.splice(index, 1);
      }
    }

    // Add any new fields to the data
    Object.entries(overrides).forEach(([field, fieldData]) => {
      if (!definedFields.includes(field)) {
        data.push({
          category: 'unknown',
          field: 'unknonwn',
          values: [],
          originalValue: [],
          isObjectArray: false,
          ...fieldData,
        });
      }
    });
  }

  return data;
};

/** @private */
const generateEndpointAlertDetailsItemDataMock = (
  overrides: AlertDetailsItemDataOverrides = {}
): TimelineEventsDetailsItem[] => {
  const data = [
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      values: ['b69d086c-325a-4f46-b17b-fb6d227006ba'],
      originalValue: ['b69d086c-325a-4f46-b17b-fb6d227006ba'],
      isObjectArray: false,
    },
    {
      category: 'agent',
      field: 'agent.type',
      values: ['endpoint'],
      originalValue: ['endpoint'],
      isObjectArray: false,
    },
    {
      category: parseEcsFieldPath(RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.endpoint[0]).category,
      field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.endpoint[0],
      values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      isObjectArray: false,
    },
    {
      category: 'event',
      field: 'event.module',
      values: ['endpoint'],
      originalValue: ['endpoint'],
      isObjectArray: false,
    },
    {
      category: 'event',
      field: 'event.dataset',
      values: ['endpoint'],
      originalValue: ['endpoint'],
      isObjectArray: false,
    },
    {
      category: 'event',
      field: 'event.category',
      originalValue: ['process'],
      values: ['process'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.name',
      values: ['elastic-host-win'],
      originalValue: ['windows-native'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.family',
      values: ['Windows Server'],
      originalValue: ['Windows Server'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.type',
      values: ['windows'],
      originalValue: ['windows'],
      isObjectArray: false,
    },
  ];

  setAlertDetailsItemDataOverrides(data, overrides);

  return data;
};

/** @private */
const generateSentinelOneAlertDetailsItemDataMock = (
  overrides: AlertDetailsItemDataOverrides = {}
): TimelineEventsDetailsItem[] => {
  const data = generateEndpointAlertDetailsItemDataMock(overrides);

  data.forEach((itemData) => {
    switch (itemData.field) {
      case 'event.module':
        itemData.values = ['sentinel_one'];
        itemData.originalValue = ['sentinel_one'];
        break;

      case 'event.dataset':
        itemData.values = ['sentinel_one.alert'];
        itemData.originalValue = ['sentinel_one.alert'];
        break;

      case 'agent.type':
        itemData.values = ['filebeat'];
        itemData.originalValue = ['filebeat'];
        break;
    }
  });

  data.push({
    category: parseEcsFieldPath(RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one[0]).category,
    field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.sentinel_one[0],
    values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
    isObjectArray: false,
  });

  setAlertDetailsItemDataOverrides(data, overrides);

  return data;
};

/** @private */
const generateCrowdStrikeAlertDetailsItemDataMock = (
  overrides: AlertDetailsItemDataOverrides = {}
): TimelineEventsDetailsItem[] => {
  const data = generateEndpointAlertDetailsItemDataMock();

  data.forEach((itemData) => {
    switch (itemData.field) {
      case 'event.module':
        itemData.values = ['crowdstrike'];
        itemData.originalValue = ['crowdstrike'];
        break;

      case 'event.dataset':
        itemData.values = ['crowdstrike.alert'];
        itemData.originalValue = ['crowdstrike.alert'];
        break;

      case 'agent.type':
        itemData.values = ['filebeat'];
        itemData.originalValue = ['filebeat'];
        break;
    }
  });

  data.push(
    {
      category: parseEcsFieldPath(RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.crowdstrike[0]).category,
      field: RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS.crowdstrike[0],
      values: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      originalValue: ['abfe4a35-d5b4-42a0-a539-bd054c791769'],
      isObjectArray: false,
    },
    {
      category: 'host',
      field: 'host.os.platform',
      values: ['windows'],
      originalValue: ['windows'],
      isObjectArray: false,
    }
  );

  setAlertDetailsItemDataOverrides(data, overrides);

  return data;
};

/**
 * Will return alert details item data for a known agent type or if unknown agent type is
 * pass, then data will be for `filebeat`
 * @param agentType
 * @param overrides
 */
const generateAlertDetailsItemDataForAgentTypeMock = (
  agentType?: ResponseActionAgentType | string,
  overrides: AlertDetailsItemDataOverrides = {}
): TimelineEventsDetailsItem[] => {
  const unSupportedAgentType = agentType ?? 'filebeat';

  switch (agentType) {
    case 'endpoint':
      return generateEndpointAlertDetailsItemDataMock(overrides);
    case 'sentinel_one':
      return generateSentinelOneAlertDetailsItemDataMock(overrides);
    case 'crowdstrike':
      return generateCrowdStrikeAlertDetailsItemDataMock(overrides);
    default:
      return generateEndpointAlertDetailsItemDataMock({
        'agent.type': { values: [unSupportedAgentType], originalValue: [unSupportedAgentType] },
        'event.module': { values: [unSupportedAgentType], originalValue: [unSupportedAgentType] },
        ...overrides,
      });
  }
};

export const endpointAlertDataMock = Object.freeze({
  generateEndpointAlertDetailsItemData: generateEndpointAlertDetailsItemDataMock,
  generateSentinelOneAlertDetailsItemData: generateSentinelOneAlertDetailsItemDataMock,
  generateCrowdStrikeAlertDetailsItemData: generateCrowdStrikeAlertDetailsItemDataMock,
  generateAlertDetailsItemDataForAgentType: generateAlertDetailsItemDataForAgentTypeMock,
});
