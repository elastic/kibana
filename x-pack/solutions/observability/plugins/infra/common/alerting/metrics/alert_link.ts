/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import moment from 'moment';
import { encode } from '@kbn/rison';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { type InventoryItemType, findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { SupportedEntityTypes } from '@kbn/observability-shared-plugin/common';
import type { MetricsExplorerLocatorParams } from '@kbn/observability-shared-plugin/common';
import {
  type AssetDetailsLocatorParams,
  type InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { castArray } from 'lodash';
import { fifteenMinutesInMilliseconds } from '../../constants';

const ALERT_RULE_PARAMTERS_INVENTORY_METRIC_ID = `${ALERT_RULE_PARAMETERS}.criteria.metric`;
export const ALERT_RULE_PARAMETERS_NODE_TYPE = `${ALERT_RULE_PARAMETERS}.nodeType`;
const CUSTOM_METRIC_TYPE = 'custom';

export const flatAlertRuleParams = (params: {}, pKey = ''): Record<string, unknown[]> => {
  return Object.entries(params).reduce((acc, [key, field]) => {
    const objectKey = pKey.length ? `${pKey}.${key}` : key;
    if (typeof field === 'object' && field != null) {
      if (Array.isArray(field) && field.length > 0) {
        return Object.assign(acc, flatAlertRuleParams(field[0] as {}, objectKey));
      } else {
        return Object.assign(acc, flatAlertRuleParams(field as {}, objectKey));
      }
    }
    acc[objectKey] = Array.isArray(field) ? field : [field];
    return acc;
  }, {} as Record<string, unknown[]>);
};

export const getInventoryViewInAppUrl = ({
  fields,
  assetDetailsLocator,
  inventoryLocator,
}: {
  fields: ParsedTechnicalFields & Record<string, any>;
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  inventoryLocator?: LocatorPublic<InventoryLocatorParams>;
}): string => {
  if (!assetDetailsLocator || !inventoryLocator) {
    throw new Error('Locators for Asset Details and Inventory are required');
  }

  /* Temporary Solution -> https://github.com/elastic/kibana/issues/137033
   * In the alert table from timelines plugin (old table), we are using an API who is flattening all the response
   * from elasticsearch to Record<string, string[]>, The new alert table API from TriggersActionUI is not doing that
   * anymore, it is trusting and returning the way it has been done from the field API from elasticsearch. I think
   * it is better to trust elasticsearch and the mapping of the doc. When o11y will only use the new alert table from
   * triggersActionUI then we will stop using this flattening way and we will update the code to work with fields API,
   * it will be less magic.
   */
  const inventoryFields = fields[ALERT_RULE_PARAMETERS]
    ? {
        ...fields,
        ...flatAlertRuleParams(fields[ALERT_RULE_PARAMETERS] as {}, ALERT_RULE_PARAMETERS),
      }
    : fields;

  const nodeType = castArray(inventoryFields[ALERT_RULE_PARAMETERS_NODE_TYPE])[0];

  if (!nodeType) {
    return '';
  }

  const entityIdField = findInventoryModel(nodeType).fields.id;
  const entityId = inventoryFields[entityIdField];
  const assetDetailsSupported = Object.values(SupportedEntityTypes).includes(
    nodeType as SupportedEntityTypes
  );
  const criteriaMetric = inventoryFields[ALERT_RULE_PARAMTERS_INVENTORY_METRIC_ID][0];

  if (entityId && assetDetailsSupported) {
    return getLinkToAssetDetails({
      entityId,
      entityType: nodeType,
      timestamp: inventoryFields[TIMESTAMP],
      alertMetric: criteriaMetric,
      assetDetailsLocator,
    });
  }

  const linkToParams = {
    nodeType,
    timestamp: Date.parse(inventoryFields[TIMESTAMP]),
    customMetric: '',
    metric: '',
  };

  // We always pick the first criteria metric for the URL

  if (criteriaMetric === CUSTOM_METRIC_TYPE) {
    const criteriaCustomMetricId =
      inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`][0];
    const criteriaCustomMetricAggregation =
      inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`][0];
    const criteriaCustomMetricField =
      inventoryFields[`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`][0];

    const customMetric = encode({
      id: criteriaCustomMetricId,
      type: CUSTOM_METRIC_TYPE,
      field: criteriaCustomMetricField,
      aggregation: criteriaCustomMetricAggregation,
    });
    linkToParams.customMetric = customMetric;
    linkToParams.metric = customMetric;
  } else {
    linkToParams.metric = encode({ type: criteriaMetric });
  }

  return inventoryLocator.getRedirectUrl({
    ...linkToParams,
  });
};

export const getMetricsViewInAppUrl = ({
  fields,
  groupBy,
  assetDetailsLocator,
  metricsExplorerLocator,
}: {
  fields: ParsedTechnicalFields & Record<string, any>;
  groupBy?: string[];
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  metricsExplorerLocator?: LocatorPublic<MetricsExplorerLocatorParams>;
}) => {
  if (!assetDetailsLocator || !metricsExplorerLocator) {
    throw new Error('Locators for Asset Details and Metrics Explorer are required');
  }

  if (!groupBy) {
    return metricsExplorerLocator.getRedirectUrl({});
  }

  // creates an object of asset details supported entityType by their entityId field name
  const entityTypeByEntityIdField = Object.values(SupportedEntityTypes).reduce((acc, curr) => {
    acc[findInventoryModel(curr).fields.id] = curr;
    return acc;
  }, {} as Record<string, InventoryItemType>);

  // detemines if the groupBy has a field that the asset details supports
  const supportedEntityId = groupBy.find((field) => !!entityTypeByEntityIdField[field]);
  // assigns a nodeType if the groupBy field is supported by asset details
  const supportedEntityType = supportedEntityId
    ? entityTypeByEntityIdField[supportedEntityId]
    : undefined;

  if (supportedEntityType) {
    const entityId = fields[findInventoryModel(supportedEntityType).fields.id];

    // A supported asset type can still return no id. In such a case, we can't
    // generate a valid link, so we redirect to Metrics Explorer.
    if (!entityId) {
      return metricsExplorerLocator.getRedirectUrl({});
    }

    const timestamp = fields[TIMESTAMP];

    return getLinkToAssetDetails({
      entityId,
      entityType: supportedEntityType,
      timestamp,
      assetDetailsLocator,
    });
  } else {
    return metricsExplorerLocator.getRedirectUrl({});
  }
};

function getLinkToAssetDetails({
  entityId,
  entityType,
  timestamp,
  alertMetric,
  assetDetailsLocator,
}: {
  entityId: string;
  entityType: InventoryItemType;
  timestamp: string;
  alertMetric?: string;
  assetDetailsLocator: LocatorPublic<AssetDetailsLocatorParams>;
}): string {
  return assetDetailsLocator.getRedirectUrl({
    entityId,
    entityType,
    assetDetails: {
      dateRange: {
        from: timestamp,
        to: moment(timestamp).add(fifteenMinutesInMilliseconds, 'ms').toISOString(),
      },
      ...(alertMetric && alertMetric !== CUSTOM_METRIC_TYPE ? { alertMetric } : undefined),
    },
  });
}
