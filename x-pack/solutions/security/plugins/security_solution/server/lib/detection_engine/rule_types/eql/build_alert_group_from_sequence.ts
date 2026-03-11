/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import { ALERT_URL, ALERT_UUID } from '@kbn/rule-data-utils';
import { intersection as lodashIntersection, isArray } from 'lodash';
import { setWith } from '@kbn/safer-lodash-set';

import { getAlertDetailsUrl } from '../../../../../common/utils/alert_detail_path';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import type { Ancestor, SecuritySharedParams, SignalSource, SignalSourceHit } from '../types';
import { buildAlertFields, buildAncestors, generateAlertId } from '../factories/utils/build_alert';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';
import type { EqlSequence } from '../../../../../common/detection_engine/types';
import { generateBuildingBlockIds } from '../factories/utils/generate_building_block_ids';
import type { BuildReasonMessage } from '../utils/reason_formatters';
import type { CompleteRule, RuleParams } from '../../rule_schema';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '../../../../../common/field_maps/field_names';
import type {
  DetectionAlertLatest,
  EqlBuildingBlockAlertLatest,
  EqlShellAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { SuppressionTerm } from '../utils';

export interface ExtraFieldsForShellAlert {
  [ALERT_INSTANCE_ID]: string;
  [ALERT_SUPPRESSION_TERMS]: SuppressionTerm[];
  [ALERT_SUPPRESSION_START]: Date;
  [ALERT_SUPPRESSION_END]: Date;
  [ALERT_SUPPRESSION_DOCS_COUNT]: number;
}

export interface BuildAlertGroupFromSequence {
  sharedParams: SecuritySharedParams;
  sequence: EqlSequence<SignalSource>;
  buildReasonMessage: BuildReasonMessage;
  applyOverrides?: boolean;
}

// eql shell alerts can have a subAlerts property
// when suppression is used in EQL sequence queries
export type WrappedEqlShellOptionalSubAlertsType = WrappedAlert<EqlShellAlertLatest> & {
  subAlerts?: Array<WrappedAlert<EqlShellAlertLatest>>;
};

/**
 * Takes N raw documents from ES that form a sequence and builds them into N+1 signals ready to be indexed -
 * one signal for each event in the sequence, and a "shell" signal that ties them all together. All N+1 signals
 * share the same signal.group.id to make it easy to query them.
 * @param sequence The raw ES documents that make up the sequence
 * @param completeRule object representing the rule that found the sequence
 */
export const buildAlertGroupFromSequence = ({
  sharedParams,
  sequence,
  buildReasonMessage,
}: BuildAlertGroupFromSequence): {
  shellAlert: WrappedAlert<EqlShellAlertLatest> | undefined;
  buildingBlocks: Array<WrappedAlert<EqlBuildingBlockAlertLatest>>;
} => {
  const {
    alertTimestampOverride,
    intendedTimestamp,
    completeRule,
    spaceId,
    inputIndex: indicesToQuery,
    ruleExecutionLogger,
    publicBaseUrl,
  } = sharedParams;
  const sequenceWithoutMissingEvents = sequence.events.filter((event) => event.missing !== true);
  const ancestors: Ancestor[] = sequenceWithoutMissingEvents.flatMap((event) =>
    buildAncestors(event)
  );
  if (ancestors.some((ancestor) => ancestor?.rule === completeRule.alertId)) {
    return { shellAlert: undefined, buildingBlocks: [] };
  }

  // The "building block" alerts start out as regular BaseFields.
  // We'll add the group ID and index fields
  // after creating the shell alert later on
  // since that's when the group ID is determined.
  let baseAlerts: DetectionAlertLatest[] = [];
  try {
    baseAlerts = sequenceWithoutMissingEvents.map((event) =>
      transformHitToAlert({
        sharedParams,
        doc: event,
        applyOverrides: false,
        buildReasonMessage,
        alertUuid: 'placeholder-alert-uuid', // This is overriden below
      })
    );
  } catch (error) {
    ruleExecutionLogger.debug(`Error transforming matched events to alerts\nError: ${error}`);
    return { shellAlert: undefined, buildingBlocks: [] };
  }

  // The ID of each building block alert depends on all of the other building blocks as well,
  // so we generate the IDs after making all the BaseFields
  const buildingBlockIds = generateBuildingBlockIds(baseAlerts);
  const wrappedBaseFields: Array<WrappedAlert<DetectionAlertLatest>> = baseAlerts.map(
    (block, i): WrappedAlert<DetectionAlertLatest> => ({
      _id: buildingBlockIds[i],
      _index: '',
      _source: {
        ...block,
        [ALERT_UUID]: buildingBlockIds[i],
      },
    })
  );

  // Now that we have an array of building blocks for the events in the sequence,
  // we can build the signal that links the building blocks together
  // and also insert the group id (which is also the "shell" signal _id) in each building block
  const shellAlert = buildAlertRoot({
    wrappedBuildingBlocks: wrappedBaseFields,
    completeRule,
    spaceId,
    buildReasonMessage,
    indicesToQuery,
    alertTimestampOverride,
    publicBaseUrl,
    intendedTimestamp,
  });
  const sequenceAlert: WrappedAlert<EqlShellAlertLatest> = {
    _id: shellAlert[ALERT_UUID],
    _index: '',
    _source: shellAlert,
  };

  // Finally, we have the group id from the shell alert so we can convert the BaseFields into EqlBuildingBlocks
  const wrappedBuildingBlocks = wrappedBaseFields.map(
    (block, i): WrappedAlert<EqlBuildingBlockAlertLatest> => {
      const alertUrl = getAlertDetailsUrl({
        alertId: block._id,
        index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
        timestamp: block._source['@timestamp'],
        basePath: publicBaseUrl,
        spaceId,
      });

      return {
        ...block,
        _source: {
          ...block._source,
          [ALERT_BUILDING_BLOCK_TYPE]: 'default',
          [ALERT_GROUP_ID]: shellAlert[ALERT_GROUP_ID],
          [ALERT_GROUP_INDEX]: i,
          [ALERT_URL]: alertUrl,
        },
      };
    }
  );

  return { shellAlert: sequenceAlert, buildingBlocks: wrappedBuildingBlocks };
};

export interface BuildAlertRootParams {
  wrappedBuildingBlocks: Array<WrappedAlert<DetectionAlertLatest>>;
  completeRule: CompleteRule<RuleParams>;
  spaceId: string | null | undefined;
  buildReasonMessage: BuildReasonMessage;
  indicesToQuery: string[];
  alertTimestampOverride: Date | undefined;
  publicBaseUrl?: string;
  intendedTimestamp?: Date;
}

export const buildAlertRoot = ({
  wrappedBuildingBlocks,
  completeRule,
  spaceId,
  buildReasonMessage,
  indicesToQuery,
  alertTimestampOverride,
  publicBaseUrl,
  intendedTimestamp,
}: BuildAlertRootParams): EqlShellAlertLatest => {
  const mergedAlerts = objectArrayIntersection(wrappedBuildingBlocks.map((alert) => alert._source));
  const reason = buildReasonMessage({
    name: completeRule.ruleConfig.name,
    severity: completeRule.ruleParams.severity,
    mergedDoc: { _source: mergedAlerts } as SignalSourceHit,
  });
  const doc = buildAlertFields({
    docs: wrappedBuildingBlocks,
    completeRule,
    spaceId,
    reason,
    indicesToQuery,
    alertUuid: 'placeholder-uuid', // These will be overriden below
    publicBaseUrl, // Not necessary now, but when the ID is created ahead of time this can be passed
    alertTimestampOverride,
    intendedTimestamp,
  });
  const alertId = generateAlertId(doc);
  const alertUrl = getAlertDetailsUrl({
    alertId,
    index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
    timestamp: doc['@timestamp'],
    basePath: publicBaseUrl,
    spaceId,
  });

  return {
    ...mergedAlerts,
    ...doc,
    [ALERT_UUID]: alertId,
    [ALERT_GROUP_ID]: alertId,
    [ALERT_URL]: alertUrl,
  };
};

/**
 * Merges array of alert sources with the first item in the array
 * @param objects array of alert _source objects
 * @returns singular object
 */
export const objectArrayIntersection = (objects: object[]) => {
  if (objects.length === 0) {
    return undefined;
  } else if (objects.length === 1) {
    return objects[0];
  } else {
    return objects
      .slice(1)
      .reduce(
        (acc: object | undefined, obj): object | undefined => objectPairIntersection(acc, obj),
        objects[0]
      );
  }
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Flattens an object to path-value pairs and records which paths came from
 * dot-notation keys. A path is "from dot" when it was produced by expanding
 * a single key that contained '.'.
 */
const flattenToPathValuesWithNotation = (
  obj: object
): { pathValues: [string[], unknown][]; dotPaths: Set<string> } => {
  const pathValues: [string[], unknown][] = [];
  const dotPaths = new Set<string>();
  const stack: [object, string[]][] = [[obj, []]];
  while (stack.length > 0) {
    const [o, prefix] = stack.pop() as [object, string[]];
    for (const [k, v] of Object.entries(o)) {
      const path = prefix.concat(k.includes('.') ? k.split('.') : [k]);
      const keyWasDot = k.includes('.');
      if (isPlainObject(v)) {
        stack.push([v, path]);
      } else {
        pathValues.push([path, v]);
        if (keyWasDot) {
          dotPaths.add(path.join('.'));
        }
      }
    }
  }
  return { pathValues, dotPaths };
};

/**
 * Flattens an object to path-value pairs (paths as string arrays).
 * Dot-notation keys are expanded so 'user.email' and user: { email } yield the same path.
 */
const flattenToPathValues = (obj: object): [string[], unknown][] =>
  flattenToPathValuesWithNotation(obj).pathValues;

/**
 * Builds a nested object from path-value pairs.
 */
const unflatten = (pathValues: [string[], unknown][]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [path, value] of pathValues) {
    setWith(result, path, value);
  }
  return result;
};

/** Result of intersecting two values: either a literal value to set, or a nested pair to process later. */
type IntersectionResult =
  | { kind: 'value'; value: unknown }
  | { kind: 'nested'; a: Record<string, unknown>; b: Record<string, unknown> };

/**
 * Computes the intersection of two values (primitives, arrays, or nested objects).
 * For nested objects, returns a descriptor so the caller can push work onto the stack.
 */
const intersectValues = (aVal: unknown, bVal: unknown): IntersectionResult | undefined => {
  if (isPlainObject(aVal) && isPlainObject(bVal)) {
    return { kind: 'nested', a: aVal, b: bVal };
  }
  if (aVal === bVal) {
    return { kind: 'value', value: aVal };
  }
  if (isArray(aVal) || isArray(bVal)) {
    const arrA = isArray(aVal) ? aVal : [aVal];
    const arrB = isArray(bVal) ? bVal : [bVal];
    return { kind: 'value', value: lodashIntersection(arrA, arrB) };
  }
  return undefined;
};

const isEmptyOrAllUndefined = (o: Record<string, unknown>): boolean =>
  Object.keys(o).length === 0 || Object.values(o).every((v) => v === undefined);

/** Removes nested objects that are empty or have only undefined values (iterative). */
const pruneEmptyNestedObjects = (obj: Record<string, unknown>): void => {
  type PruneItem = [Record<string, unknown> | null, string | null, Record<string, unknown>];
  const pruneStack: PruneItem[] = [[null, null, obj]];
  const toPrune: PruneItem[] = [];
  while (pruneStack.length > 0) {
    const item = pruneStack.pop() as PruneItem;
    toPrune.push(item);
    const [, , o] = item;
    for (const [k, v] of Object.entries(o)) {
      if (isPlainObject(v)) {
        pruneStack.push([o, k, v]);
      }
    }
  }
  for (let i = toPrune.length - 1; i >= 0; i--) {
    const [parent, key, o] = toPrune[i];
    if (parent !== null && key !== null && isEmptyOrAllUndefined(o)) {
      delete parent[key];
    }
  }
};

const hasDefinedValues = (obj: Record<string, unknown>): boolean =>
  Object.values(obj).some((v) => v !== undefined);

/**
 * Converts a normalized (nested) intersection result to output form:
 * paths that were dot notation in both inputs stay as dot keys; others stay nested.
 */
const applyNotationPreference = (
  intersectionNested: Record<string, unknown>,
  aDotPaths: Set<string>,
  bDotPaths: Set<string>
): Record<string, unknown> => {
  const pathValues = flattenToPathValues(intersectionNested);
  const result: Record<string, unknown> = {};
  for (const [path, value] of pathValues) {
    const pathStr = path.join('.');
    if (aDotPaths.has(pathStr) && bDotPaths.has(pathStr)) {
      result[pathStr] = value;
    } else {
      setWith(result, path, value);
    }
  }
  return result;
};

/**
 * Finds the intersection of two objects iteratively by
 * finding the "intersection" of each of their common keys'
 * values. If an intersection cannot be found between a key's
 * values, the value will be undefined in the returned object.
 * Dot-notation keys (e.g. 'user.email') and nested notation
 * (e.g. user: { email }) are treated as the same; the result
 * is always in nested form.
 *
 * @param a object
 * @param b object
 * @returns intersection of the two objects
 */
export const objectPairIntersection = (a: object | undefined, b: object | undefined) => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  const { pathValues: aPathValues, dotPaths: aDotPaths } = flattenToPathValuesWithNotation(a);
  const { pathValues: bPathValues, dotPaths: bDotPaths } = flattenToPathValuesWithNotation(b);
  const aNorm = unflatten(aPathValues);
  const bNorm = unflatten(bPathValues);
  const intersectionNested: Record<string, unknown> = {};
  const stack: [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>][] = [
    [intersectionNested, aNorm, bNorm],
  ];
  while (stack.length > 0) {
    const [target, aObj, bObj] = stack.pop() as [
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>
    ];
    for (const [key, aVal] of Object.entries(aObj)) {
      if (key in bObj) {
        const result = intersectValues(aVal, bObj[key]);
        if (result === undefined) {
          // eslint-disable-next-line no-continue
          continue;
        }
        if (result.kind === 'nested') {
          const nextTarget: Record<string, unknown> = {};
          target[key] = nextTarget;
          stack.push([nextTarget, result.a, result.b]);
        } else {
          target[key] = result.value;
        }
      }
    }
  }
  pruneEmptyNestedObjects(intersectionNested);
  if (!hasDefinedValues(intersectionNested)) {
    return undefined;
  }
  return applyNotationPreference(intersectionNested, aDotPaths, bDotPaths);
};
