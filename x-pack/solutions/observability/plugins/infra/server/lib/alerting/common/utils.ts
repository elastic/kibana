/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isError } from 'lodash';
import type { Logger, LogMeta } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ObservabilityConfig } from '@kbn/observability-plugin/server';
import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { parseTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { set } from '@kbn/safer-lodash-set';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { type Group } from '@kbn/alerting-rule-utils';
import type { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type {
  AssetDetailsLocatorParams,
  InventoryLocatorParams,
  MetricsExplorerLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import {
  ALERT_RULE_PARAMETERS_NODE_TYPE,
  getInventoryViewInAppUrl,
  getMetricsViewInAppUrl,
} from '../../../../common/alerting/metrics/alert_link';
import type {
  AlertExecutionDetails,
  InventoryMetricConditions,
} from '../../../../common/alerting/metrics/types';

const ALERT_CONTEXT_CONTAINER = 'container';
const ALERT_CONTEXT_ORCHESTRATOR = 'orchestrator';
const ALERT_CONTEXT_CLOUD = 'cloud';
const ALERT_CONTEXT_HOST = 'host';
const ALERT_CONTEXT_LABELS = 'labels';
const ALERT_CONTEXT_TAGS = 'tags';

const HOST_NAME = 'host.name';
const HOST_HOSTNAME = 'host.hostname';
const HOST_ID = 'host.id';
const CONTAINER_ID = 'container.id';

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

export const UNGROUPED_FACTORY_KEY = '*';

export const createScopedLogger = (
  logger: Logger,
  scope: string,
  alertExecutionDetails: AlertExecutionDetails
): Logger => {
  const scopedLogger = logger.get(scope);
  const fmtMsg = (msg: string) =>
    `[AlertId: ${alertExecutionDetails.alertId}][ExecutionId: ${alertExecutionDetails.executionId}] ${msg}`;
  return {
    ...scopedLogger,
    info: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.info(fmtMsg(msg), meta),
    debug: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.debug(fmtMsg(msg), meta),
    trace: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.trace(fmtMsg(msg), meta),
    warn: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.warn(errorOrMessage, meta);
      } else {
        scopedLogger.warn(fmtMsg(errorOrMessage), meta);
      }
    },
    error: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.error(errorOrMessage, meta);
      } else {
        scopedLogger.error(fmtMsg(errorOrMessage), meta);
      }
    },
    fatal: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.fatal(errorOrMessage, meta);
      } else {
        scopedLogger.fatal(fmtMsg(errorOrMessage), meta);
      }
    },
  };
};

export const getAlertDetailsPageEnabledForApp = (
  config: ObservabilityConfig['unsafe']['alertDetails'] | null,
  appName: keyof ObservabilityConfig['unsafe']['alertDetails']
): boolean => {
  if (!config) return false;

  return config[appName].enabled;
};

export const getInventoryViewInAppUrlWithSpaceId = ({
  criteria,
  nodeType,
  timestamp,
  hostName,
  assetDetailsLocator,
  inventoryLocator,
}: {
  criteria: InventoryMetricConditions[];
  nodeType: string;
  timestamp: string;
  hostName?: string;
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  inventoryLocator?: LocatorPublic<InventoryLocatorParams>;
}) => {
  const { metric, customMetric } = criteria[0];

  const fields = {
    [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: [metric],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`]: [customMetric?.id],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`]: [customMetric?.aggregation],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`]: [customMetric?.field],
    [ALERT_RULE_PARAMETERS_NODE_TYPE]: [nodeType],
    [TIMESTAMP]: timestamp,
    [HOST_NAME]: hostName,
  };

  return getInventoryViewInAppUrl({
    fields: parseTechnicalFields(fields, true),
    assetDetailsLocator,
    inventoryLocator,
  });
};

export const getMetricsViewInAppUrlWithSpaceId = ({
  timestamp,
  groupBy,
  assetDetailsLocator,
  metricsExplorerLocator,
  additionalContext,
}: {
  timestamp: string;
  groupBy?: string[];
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  metricsExplorerLocator?: LocatorPublic<MetricsExplorerLocatorParams>;
  additionalContext?: AdditionalContext;
}) => {
  const fields = {
    ...flattenAdditionalContext(additionalContext),
    [TIMESTAMP]: timestamp,
  };

  return getMetricsViewInAppUrl({
    fields: parseTechnicalFields(fields, true),
    groupBy,
    assetDetailsLocator,
    metricsExplorerLocator,
  });
};

export const KUBERNETES_POD_UID = 'kubernetes.pod.uid';
export const NUMBER_OF_DOCUMENTS = 10;
export const termsAggField: Record<string, string> = { [KUBERNETES_POD_UID]: CONTAINER_ID };

export interface AdditionalContext {
  [x: string]: any;
}

export const doFieldsExist = async (
  esClient: ElasticsearchClient,
  fields: string[],
  index: string
): Promise<Record<string, boolean>> => {
  // Get all supported fields
  const respMapping = await esClient.fieldCaps({
    index,
    fields,
  });

  const fieldsExisted: Record<string, boolean> = {};
  const acceptableFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));

    // Check if fieldName is something we can aggregate on
    if (isSupportedType) {
      acceptableFields.add(key);
    }
  });

  fields.forEach((field) => {
    fieldsExisted[field] = acceptableFields.has(field);
  });

  return fieldsExisted;
};

export const validGroupByForContext: string[] = [
  HOST_NAME,
  HOST_HOSTNAME,
  HOST_ID,
  KUBERNETES_POD_UID,
  CONTAINER_ID,
];

export const hasAdditionalContext = (
  groupBy: string | string[] | undefined,
  validGroups: string[]
): boolean => {
  return groupBy
    ? Array.isArray(groupBy)
      ? groupBy.some((group) => validGroups.includes(group))
      : validGroups.includes(groupBy)
    : false;
};

export const shouldTermsAggOnContainer = (groupBy: string | string[] | undefined) => {
  return groupBy && Array.isArray(groupBy)
    ? groupBy.includes(KUBERNETES_POD_UID)
    : groupBy === KUBERNETES_POD_UID;
};

export const flattenAdditionalContext = (
  additionalContext: AdditionalContext | undefined | null
): AdditionalContext => {
  return additionalContext ? flattenObject(additionalContext) : {};
};

export const getContextForRecoveredAlerts = <
  T extends Alert | (ParsedTechnicalFields & ParsedExperimentalFields)
>(
  alertHitSource: Partial<T> | undefined | null
): AdditionalContext => {
  const alert = alertHitSource ? unflattenObject(alertHitSource) : undefined;

  return {
    cloud: alert?.[ALERT_CONTEXT_CLOUD],
    host: alert?.[ALERT_CONTEXT_HOST],
    orchestrator: alert?.[ALERT_CONTEXT_ORCHESTRATOR],
    container: alert?.[ALERT_CONTEXT_CONTAINER],
    labels: alert?.[ALERT_CONTEXT_LABELS],
    tags: alert?.[ALERT_CONTEXT_TAGS],
  };
};

export const unflattenObject = <T extends object = AdditionalContext>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

export const flattenObject = (obj: AdditionalContext, prefix: string = ''): AdditionalContext =>
  Object.keys(obj).reduce<AdditionalContext>((acc, key) => {
    const nextValue = obj[key];

    if (nextValue) {
      if (typeof nextValue === 'object' && !Array.isArray(nextValue)) {
        const dotSuffix = '.';
        if (Object.keys(nextValue).length > 0) {
          return {
            ...acc,
            ...flattenObject(nextValue, `${prefix}${key}${dotSuffix}`),
          };
        }
      }

      const fullPath = `${prefix}${key}`;
      acc[fullPath] = nextValue;
    }

    return acc;
  }, {});

export const getGroupByObject = (
  groupBy: string | string[] | undefined,
  resultGroupSet: Set<string>
): Record<string, object> => {
  const groupByKeysObjectMapping: Record<string, object> = {};
  if (groupBy) {
    resultGroupSet.forEach((groupSet) => {
      const groupSetKeys = groupSet.split(',');
      groupByKeysObjectMapping[groupSet] = unflattenObject(
        Array.isArray(groupBy)
          ? groupBy.reduce((result, group, index) => {
              return { ...result, [group]: groupSetKeys[index]?.trim() };
            }, {})
          : { [groupBy]: groupSet }
      );
    });
  }
  return groupByKeysObjectMapping;
};

export const getFormattedGroupBy = (
  groupBy: string | string[] | undefined,
  groupSet: Set<string>
): Record<string, Group[]> => {
  const groupByKeysObjectMapping: Record<string, Group[]> = {};
  if (groupBy) {
    groupSet.forEach((group) => {
      const groupSetKeys = group.split(',');
      groupByKeysObjectMapping[group] = Array.isArray(groupBy)
        ? groupBy.reduce((result: Group[], groupByItem, index) => {
            result.push({ field: groupByItem, value: groupSetKeys[index]?.trim() });
            return result;
          }, [])
        : [{ field: groupBy, value: group }];
    });
  }
  return groupByKeysObjectMapping;
};
