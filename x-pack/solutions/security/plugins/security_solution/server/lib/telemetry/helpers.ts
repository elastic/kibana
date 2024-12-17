/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models/package_policy';
import { merge } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { Logger, LogMeta } from '@kbn/core/server';
import { sha256 } from 'js-sha256';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { copyAllowlistedFields, filterList } from './filterlists';
import type { PolicyConfig, PolicyData, SafeEndpointEvent } from '../../../common/endpoint/types';
import type { ITelemetryReceiver } from './receiver';
import type {
  EnhancedAlertEvent,
  ESClusterInfo,
  ESLicense,
  ExceptionListItem,
  ExtraInfo,
  ListTemplate,
  Nullable,
  TelemetryEvent,
  TimeFrame,
  TimelineResult,
  TimelineTelemetryEvent,
  ValueListResponse,
} from './types';
import type { TaskExecutionPeriod } from './task';
import {
  LIST_DETECTION_RULE_EXCEPTION,
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
  DEFAULT_ADVANCED_POLICY_CONFIG_SETTINGS,
} from './constants';
import { tagsToEffectScope } from '../../../common/endpoint/service/trusted_apps/mapping';
import { resolverEntity } from '../../endpoint/routes/resolver/entity/utils/build_resolver_entity';
import {
  type TelemetryLogger,
  TelemetryLoggerImpl,
  tlog as telemetryLogger,
} from './telemetry_logger';

/**
 * Determines the when the last run was in order to execute to.
 *
 * @param executeTo
 * @param lastExecutionTimestamp
 * @returns the timestamp to search from
 */
export const getPreviousDiagTaskTimestamp = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => {
  if (lastExecutionTimestamp === undefined) {
    return moment(executeTo).subtract(5, 'minutes').toISOString();
  }

  if (moment(executeTo).diff(lastExecutionTimestamp, 'minutes') >= 10) {
    return moment(executeTo).subtract(10, 'minutes').toISOString();
  }

  return lastExecutionTimestamp;
};

/**
 * Determines the when the last run was in order to execute to.
 *
 * @param executeTo
 * @param lastExecutionTimestamp
 * @returns the timestamp to search from
 */
export const getPreviousDailyTaskTimestamp = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => {
  if (lastExecutionTimestamp === undefined) {
    return moment(executeTo).subtract(24, 'hours').toISOString();
  }

  if (moment(executeTo).diff(lastExecutionTimestamp, 'hours') >= 24) {
    return moment(executeTo).subtract(24, 'hours').toISOString();
  }

  return lastExecutionTimestamp;
};

export function safeValue<T>(promise: PromiseSettledResult<T>, defaultValue: unknown = {}): T {
  return promise.status === 'fulfilled' ? promise.value : (defaultValue as T);
}

/**
 * Chunks an Array<T> into an Array<Array<T>>
 * This is to prevent overloading the telemetry channel + user resources
 *
 * @param telemetryRecords
 * @param batchSize
 * @returns the batch of records
 */
export const batchTelemetryRecords = (
  telemetryRecords: unknown[],
  batchSize: number
): unknown[][] =>
  [...Array(Math.ceil(telemetryRecords.length / batchSize))].map((_) =>
    telemetryRecords.splice(0, batchSize)
  );

/**
 * User defined type guard for PackagePolicy
 *
 * @param data the union type of package policies
 * @returns type confirmation
 */
export function isPackagePolicyList(
  data: string[] | PackagePolicy[] | undefined
): data is PackagePolicy[] {
  if (data === undefined || data.length < 1) {
    return false;
  }

  return (data as PackagePolicy[])[0].inputs !== undefined;
}

/**
 * Maps trusted application to shared telemetry object
 *
 * @param trustedAppExceptionItem
 * @returns collection of trusted applications
 */
export const trustedApplicationToTelemetryEntry = (
  trustedAppExceptionItem: ExceptionListItemSchema
) => {
  return {
    id: trustedAppExceptionItem.id,
    name: trustedAppExceptionItem.name,
    created_at: trustedAppExceptionItem.created_at,
    updated_at: trustedAppExceptionItem.updated_at,
    entries: trustedAppExceptionItem.entries,
    os_types: trustedAppExceptionItem.os_types,
    scope: tagsToEffectScope(trustedAppExceptionItem.tags),
  } as ExceptionListItem;
};

/**
 * Maps endpoint lists to shared telemetry object
 *
 * @param exceptionListItem
 * @returns collection of endpoint exceptions
 */
export const exceptionListItemToTelemetryEntry = (exceptionListItem: ExceptionListItemSchema) => {
  return {
    id: exceptionListItem.id,
    name: exceptionListItem.name,
    created_at: exceptionListItem.created_at,
    updated_at: exceptionListItem.updated_at,
    entries: exceptionListItem.entries,
    os_types: exceptionListItem.os_types,
  } as ExceptionListItem;
};

/**
 * Maps detection rule exception list items to shared telemetry object
 *
 * @param exceptionListItem
 * @param ruleVersion
 * @returns collection of detection rule exceptions
 */
export const ruleExceptionListItemToTelemetryEvent = (
  exceptionListItem: ExceptionListItemSchema,
  ruleVersion: number
) => {
  return {
    id: exceptionListItem.item_id,
    name: exceptionListItem.description,
    rule_version: ruleVersion,
    created_at: exceptionListItem.created_at,
    updated_at: exceptionListItem.updated_at,
    entries: exceptionListItem.entries,
    os_types: exceptionListItem.os_types,
  } as ExceptionListItem;
};

/**
 * Consructs the list telemetry schema from a collection of endpoint exceptions
 *
 * @param listData
 * @param listType
 * @returns lists telemetry schema
 */
export const templateExceptionList = (
  listData: ExceptionListItem[],
  clusterInfo: ESClusterInfo,
  licenseInfo: Nullable<ESLicense>,
  listType: string
) => {
  return listData.map((item) => {
    const template: ListTemplate = {
      '@timestamp': moment().toISOString(),
      cluster_uuid: clusterInfo.cluster_uuid,
      cluster_name: clusterInfo.cluster_name,
      license_id: licenseInfo?.uid,
    };

    // cast exception list type to a TelemetryEvent for allowlist filtering
    const filteredListItem = copyAllowlistedFields(
      filterList.exceptionLists,
      item as unknown as TelemetryEvent
    );

    if (listType === LIST_DETECTION_RULE_EXCEPTION) {
      template.detection_rule = filteredListItem;
      return template;
    }

    if (listType === LIST_TRUSTED_APPLICATION) {
      template.trusted_application = filteredListItem;
      return template;
    }

    if (listType === LIST_ENDPOINT_EXCEPTION) {
      template.endpoint_exception = filteredListItem;
      return template;
    }

    if (listType === LIST_ENDPOINT_EVENT_FILTER) {
      template.endpoint_event_filter = filteredListItem;
      return template;
    }

    return null;
  });
};

/**
 * Convert counter label list to kebab case
 *
 * @param labelList the list of labels to create standardized UsageCounter from
 * @returns a string label for usage in the UsageCounter
 */
export const createUsageCounterLabel = (labelList: string[]): string => labelList.join('-');

/**
 * Resiliantly handles an edge case where the endpoint config details are not present
 *
 * @returns the endpoint policy configuration
 */
export const extractEndpointPolicyConfig = (policyData: PolicyData | null) => {
  const epPolicyConfig = policyData?.inputs[0]?.config?.policy;
  return epPolicyConfig ? epPolicyConfig : null;
};

export const addDefaultAdvancedPolicyConfigSettings = (policyConfig: PolicyConfig) => {
  return merge(DEFAULT_ADVANCED_POLICY_CONFIG_SETTINGS, policyConfig);
};

export const formatValueListMetaData = (
  valueListResponse: ValueListResponse,
  clusterInfo: ESClusterInfo,
  licenseInfo: Nullable<ESLicense>
) => ({
  '@timestamp': moment().toISOString(),
  cluster_uuid: clusterInfo.cluster_uuid,
  cluster_name: clusterInfo.cluster_name,
  license_id: licenseInfo?.uid,
  total_list_count:
    valueListResponse.listMetricsResponse?.aggregations?.total_value_list_count?.value ?? 0,
  types:
    valueListResponse.listMetricsResponse?.aggregations?.type_breakdown?.buckets.map(
      (breakdown) => ({
        type: breakdown.key,
        count: breakdown.doc_count,
      })
    ) ?? [],
  lists:
    valueListResponse.itemMetricsResponse?.aggregations?.value_list_item_count?.buckets.map(
      (itemCount) => ({
        id: itemCount.key,
        count: itemCount.doc_count,
      })
    ) ?? [],
  included_in_exception_lists_count:
    valueListResponse.exceptionListMetricsResponse?.aggregations
      ?.vl_included_in_exception_lists_count?.value ?? 0,
  used_in_indicator_match_rule_count:
    valueListResponse.indicatorMatchMetricsResponse?.aggregations
      ?.vl_used_in_indicator_match_rule_count?.value ?? 0,
});

export let isElasticCloudDeployment = false;
export let clusterInfo: Nullable<ESClusterInfo>;
export const setIsElasticCloudDeployment = (value: boolean) => {
  isElasticCloudDeployment = value;
};
export const setClusterInfo = (info: Nullable<ESClusterInfo>) => {
  clusterInfo = info;
};

/**
 * @deprecated use `new TelemetryLoggerImpl(...)` instead
 */
export const tlog = (logger: Logger, message: string, meta?: LogMeta) => {
  telemetryLogger(logger, message, meta);
};

export const newTelemetryLogger = (
  logger: Logger,
  mdc?: LogMeta | object | undefined
): TelemetryLogger => {
  return new TelemetryLoggerImpl(logger, mdc);
};

function obfuscateString(clusterId: string, toHash: string): string {
  const valueToObfuscate = toHash + clusterId;
  return sha256.create().update(valueToObfuscate).hex();
}

function isAllowlistK8sUsername(username: string) {
  return (
    username === 'edit' ||
    username === 'view' ||
    username === 'admin' ||
    username === 'elastic-agent' ||
    username === 'cluster-admin' ||
    username.startsWith('system')
  );
}

export const processK8sUsernames = (clusterId: string, event: TelemetryEvent): TelemetryEvent => {
  // if there is no kubernetes key, return the event as is
  if (event.kubernetes === undefined && event.kubernetes === null) {
    return event;
  }

  const username = event?.kubernetes?.audit?.user?.username;
  const impersonatedUser = event?.kubernetes?.audit?.impersonated_user?.username;

  if (username !== undefined && username !== null && !isAllowlistK8sUsername(username)) {
    set(event, 'kubernetes.audit.user.username', obfuscateString(clusterId, username));
  }

  if (
    impersonatedUser !== undefined &&
    impersonatedUser !== null &&
    !isAllowlistK8sUsername(impersonatedUser)
  ) {
    set(
      event,
      'kubernetes.audit.impersonated_user.username',
      obfuscateString(clusterId, impersonatedUser)
    );
  }

  return event;
};

export const ranges = (
  taskExecutionPeriod: TaskExecutionPeriod,
  defaultIntervalInHours: number = 3
) => {
  const rangeFrom = taskExecutionPeriod.last ?? `now-${defaultIntervalInHours}h`;
  const rangeTo = taskExecutionPeriod.current;

  return { rangeFrom, rangeTo };
};

export const copyLicenseFields = (lic: ESLicense) => {
  return {
    uid: lic.uid,
    status: lic.status,
    type: lic.type,
    ...(lic.issued_to ? { issued_to: lic.issued_to } : {}),
    ...(lic.issuer ? { issuer: lic.issuer } : {}),
  };
};

export class TelemetryTimelineFetcher {
  private receiver: ITelemetryReceiver;
  private extraInfo: Promise<ExtraInfo>;
  private timeFrame: TimeFrame;

  constructor(receiver: ITelemetryReceiver) {
    this.receiver = receiver;
    this.extraInfo = this.lookupExtraInfo();
    this.timeFrame = this.calculateTimeFrame();
  }

  async fetchTimeline(event: estypes.SearchHit<EnhancedAlertEvent>): Promise<TimelineResult> {
    const eventId = event._source ? event._source['event.id'] : 'unknown';
    const alertUUID = event._source ? event._source['kibana.alert.uuid'] : 'unknown';

    const entities = resolverEntity([event], this.receiver.getExperimentalFeatures());

    // Build Tree
    const tree = await this.receiver.buildProcessTree(
      entities[0].id,
      entities[0].schema,
      this.timeFrame.startOfDay,
      this.timeFrame.endOfDay,
      entities[0].agentId || ''
    );

    const nodeIds = Array.isArray(tree) ? tree.map((node) => node?.id.toString()) : [];

    const eventsStore = await this.fetchEventLineage(nodeIds);

    const telemetryTimeline: TimelineTelemetryEvent[] = Array.isArray(tree)
      ? tree.map((node) => {
          return {
            ...node,
            event: eventsStore.get(node.id.toString()),
          };
        })
      : [];

    let record;
    if (telemetryTimeline.length >= 1) {
      const extraInfo = await this.extraInfo;
      record = {
        '@timestamp': moment().toISOString(),
        version: extraInfo.clusterInfo.version?.number,
        cluster_name: extraInfo.clusterInfo.cluster_name,
        cluster_uuid: extraInfo.clusterInfo.cluster_uuid,
        license_uuid: extraInfo.licenseInfo?.uid,
        alert_id: alertUUID,
        event_id: eventId,
        timeline: telemetryTimeline,
      };
    }

    const result: TimelineResult = {
      nodes: nodeIds.length,
      events: eventsStore.size,
      timeline: record,
    };

    return result;
  }

  private async fetchEventLineage(nodeIds: string[]): Promise<Map<string, SafeEndpointEvent>> {
    const timelineEvents = await this.receiver.fetchTimelineEvents(nodeIds);
    const eventsStore = new Map<string, SafeEndpointEvent>();
    for (const event of timelineEvents.hits.hits) {
      const doc = event._source;

      if (doc !== null && doc !== undefined) {
        const entityId = doc?.process?.entity_id?.toString();
        if (entityId !== null && entityId !== undefined) eventsStore.set(entityId, doc);
      }
    }
    return eventsStore;
  }

  private async lookupExtraInfo(): Promise<ExtraInfo> {
    const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
      this.receiver.fetchClusterInfo(),
      this.receiver.fetchLicenseInfo(),
    ]);

    const _clusterInfo: ESClusterInfo =
      clusterInfoPromise.status === 'fulfilled' ? clusterInfoPromise.value : ({} as ESClusterInfo);

    const licenseInfo: Nullable<ESLicense> =
      licenseInfoPromise.status === 'fulfilled' ? licenseInfoPromise.value : ({} as ESLicense);

    return { clusterInfo: _clusterInfo, licenseInfo };
  }

  private calculateTimeFrame(): TimeFrame {
    const now = moment();
    const startOfDay = now.startOf('day').toISOString();
    const endOfDay = now.endOf('day').toISOString();
    return { startOfDay, endOfDay };
  }
}
