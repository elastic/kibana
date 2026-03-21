/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { v4 as uuidv4 } from 'uuid';

import { buildEsqlSearchRequest } from '../esql/build_esql_search_request';
import { performEsqlRequest } from '../esql/esql_request';
import { rowToDocument } from '../esql/utils';
import { compileCorrelationQuery, buildEnrichmentIndices } from './compile_correlation_query';
import {
  fetchContributingAlerts,
  extractEnrichmentFields,
  computeShellEnrichment,
} from './enrich_building_blocks';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '../../../../../common/field_maps/field_names';
import { bulkCreate } from '../factories';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { CorrelationRuleParams } from '../../rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { CorrelationState } from './types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  makeFloatString,
} from '../utils/utils';
import type { ScheduleNotificationResponseActionsService } from '../../rule_response_actions/schedule_notification_response_actions';

const MAX_BUILDING_BLOCKS_PER_GROUP = 500;
const MAX_TOTAL_ENRICHMENT = 10_000;

export const correlationExecutor = async ({
  sharedParams,
  services,
  state,
  licensing,
  scheduleNotificationResponseActionsService,
  ruleExecutionTimeout,
}: {
  sharedParams: SecuritySharedParams<CorrelationRuleParams>;
  services: SecurityRuleServices;
  state: CorrelationState;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
  ruleExecutionTimeout?: string;
}) => {
  const {
    completeRule,
    tuple,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    ruleExecutionLogger,
  } = sharedParams;
  const loggedRequests: RulePreviewLoggedRequest[] = [];
  const ruleParams = completeRule.ruleParams;
  const isLoggedRequestsEnabled = state?.isLoggedRequestsEnabled ?? false;

  return withSecuritySpan('correlationExecutor', async () => {
    const result = createSearchAfterReturnType();
    const selfRuleId = completeRule.alertId;
    const executionStart = performance.now();

    // Track updated state (avoid mutation for atomic updates)
    let updatedState = { ...state };

    // Circuit breaker: Skip execution if too many consecutive timeouts
    const consecutiveTimeouts = updatedState.consecutiveTimeouts ?? 0;
    if (consecutiveTimeouts >= 3 && updatedState.lastTimeoutTimestamp) {
      const hoursSinceLastTimeout =
        (Date.now() - new Date(updatedState.lastTimeoutTimestamp).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastTimeout < 1) {
        ruleExecutionLogger.warn(
          `Skipping execution due to circuit breaker: ${consecutiveTimeouts} consecutive ` +
            `timeouts in last hour. Rule may need tuning (reduce time window or add filters).`
        );
        return {
          ...result,
          success: false,
          warning: 'Circuit breaker triggered - rule execution skipped due to consecutive timeouts',
          state: updatedState,
          ...(isLoggedRequestsEnabled ? { loggedRequests: [] } : {}),
        };
      } else {
        // Reset circuit breaker after 1 hour
        ruleExecutionLogger.info(
          `Resetting circuit breaker after 1 hour cooldown (had ${consecutiveTimeouts} timeouts)`
        );
        updatedState = {
          ...updatedState,
          consecutiveTimeouts: 0,
          lastTimeoutTimestamp: undefined,
        };
      }
    }

    // Track phase timings for observability
    const phaseTiming = {
      esqlQuery: 0,
      enrichment: 0,
      alertConstruction: 0,
      bulkCreate: 0,
    };

    const compiledQuery = compileCorrelationQuery(
      ruleParams.correlation,
      selfRuleId,
      sharedParams.spaceId,
      tuple.maxSignals + 1
    );
    ruleExecutionLogger.debug(`Compiled correlation ES|QL query:\n${compiledQuery}`);

    try {
      const esqlRequest = buildEsqlSearchRequest({
        query: compiledQuery,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        size: tuple.maxSignals + 1,
        filters: [],
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
        excludedDocuments: updatedState.excludedDocuments ?? {},
        ruleExecutionTimeout,
      });

      const esqlSearchStart = performance.now();

      const response = await performEsqlRequest({
        esClient: services.scopedClusterClient.asCurrentUser,
        requestBody: esqlRequest,
        requestQueryParams: { drop_null_columns: true },
        shouldStopExecution: services.shouldStopExecution,
        ruleExecutionLogger,
        loggedRequests: isLoggedRequestsEnabled ? loggedRequests : undefined,
      });

      const esqlSearchDuration = performance.now() - esqlSearchStart;
      phaseTiming.esqlQuery = esqlSearchDuration;
      result.searchAfterTimes.push(makeFloatString(esqlSearchDuration));

      ruleExecutionLogger.debug(
        `Correlation query completed in ${esqlSearchDuration}ms. Found ${response.values.length} correlation groups.`
      );

      const correlationGroups = response.values.map((row) => rowToDocument(response.columns, row));
      result.totalEventsFound = correlationGroups.length;

      if (correlationGroups.length === 0) {
        return {
          ...result,
          state: { ...state },
          ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
        };
      }

      const allAlertIds = new Set<string>();
      for (const group of correlationGroups) {
        if (allAlertIds.size >= MAX_TOTAL_ENRICHMENT) {
          ruleExecutionLogger.warn(
            `Reached global enrichment cap of ${MAX_TOTAL_ENRICHMENT} alerts. ` +
              `Remaining ${
                correlationGroups.length - correlationGroups.indexOf(group)
              } groups will not be fully enriched.`
          );
          break;
        }
        const ids = Array.isArray(group.alert_ids) ? group.alert_ids : [];
        for (const id of (ids as string[]).slice(0, MAX_BUILDING_BLOCKS_PER_GROUP)) {
          if (allAlertIds.size >= MAX_TOTAL_ENRICHMENT) {
            break;
          }
          allAlertIds.add(id);
        }
      }

      const enrichmentIndices = buildEnrichmentIndices(
        sharedParams.spaceId,
        ruleParams.correlation.targetSpaces
      );

      const enrichmentStart = performance.now();
      const contributingAlerts = await fetchContributingAlerts(
        services.scopedClusterClient.asCurrentUser,
        allAlertIds,
        enrichmentIndices,
        ruleExecutionLogger
      );
      phaseTiming.enrichment = performance.now() - enrichmentStart;

      const wrappedAlerts: Array<{
        _id: string;
        _index: string;
        _source: Record<string, unknown>;
      }> = [];

      let totalAlertsCreated = 0;
      let groupsProcessed = 0;
      const alertConstructionStart = performance.now();

      for (const [groupIndex, group] of correlationGroups.entries()) {
        const shellId = uuidv4();
        const rawMaxRisk =
          typeof group.max_risk === 'string'
            ? Number(group.max_risk)
            : typeof group.max_risk === 'number'
            ? group.max_risk
            : 0;
        const maxRisk = Number.isFinite(rawMaxRisk) ? rawMaxRisk : 0;
        const alertIds = (
          Array.isArray(group.alert_ids)
            ? group.alert_ids
            : group.alert_ids
            ? [group.alert_ids]
            : []
        ).filter((id): id is string => typeof id === 'string' && id.length > 0);
        const ruleNames = Array.isArray(group.rule_names)
          ? group.rule_names
          : group.rule_names
          ? [group.rule_names]
          : [];
        const severityList = Array.isArray(group.severity_list)
          ? group.severity_list
          : group.severity_list
          ? [group.severity_list]
          : [];
        const highestSeverity = computeHighestSeverity(severityList as string[]);

        const cappedAlertIds = alertIds.slice(0, MAX_BUILDING_BLOCKS_PER_GROUP);
        if (alertIds.length > MAX_BUILDING_BLOCKS_PER_GROUP) {
          ruleExecutionLogger.warn(
            `Correlation group has ${alertIds.length} alert IDs, capping to ${MAX_BUILDING_BLOCKS_PER_GROUP}`
          );
        }

        const groupByValues: Record<string, unknown> = {};
        for (const field of ruleParams.correlation.groupBy) {
          if (group[field] !== undefined) {
            groupByValues[field] = group[field];
          }
        }

        const boostMultiplier =
          ruleParams.correlation.type === 'temporal' ||
          ruleParams.correlation.type === 'temporal_ordered'
            ? Math.min(cappedAlertIds.length, 5) * 0.1
            : 0;
        const compositeRiskScore = Math.min(Math.round(maxRisk * (1 + boostMultiplier)), 100);

        const groupContributingDocs = cappedAlertIds
          .map((id) => contributingAlerts.get(id as string))
          .filter((doc): doc is Record<string, unknown> => doc != null);
        const shellEnrichment = computeShellEnrichment(groupContributingDocs);

        const shellAlert: Record<string, unknown> = {
          [ALERT_UUID]: shellId,
          [ALERT_GROUP_ID]: shellId,
          '@timestamp': new Date().toISOString(),
          'kibana.alert.rule.uuid': completeRule.alertId,
          'kibana.alert.rule.name': completeRule.ruleConfig.name,
          'kibana.alert.rule.type': 'correlation',
          'kibana.alert.risk_score': compositeRiskScore,
          'kibana.alert.severity': highestSeverity,
          'kibana.alert.reason': `Correlation rule "${completeRule.ruleConfig.name}" matched ${
            cappedAlertIds.length
          } alerts grouped by ${ruleParams.correlation.groupBy.join(', ')}`,
          'kibana.alert.correlated_alerts': cappedAlertIds,
          'kibana.alert.correlated_rule_names': ruleNames,
          'kibana.alert.workflow_status': 'open',
          ...shellEnrichment,
          ...groupByValues,
        };

        wrappedAlerts.push({
          _id: shellId,
          _index: '',
          _source: shellAlert,
        });

        for (let i = 0; i < cappedAlertIds.length; i++) {
          const bbId = uuidv4();
          const contributingDoc = contributingAlerts.get(cappedAlertIds[i] as string);
          const enrichedFields = contributingDoc ? extractEnrichmentFields(contributingDoc) : {};
          const buildingBlock: Record<string, unknown> = {
            [ALERT_UUID]: bbId,
            [ALERT_BUILDING_BLOCK_TYPE]: 'default',
            [ALERT_GROUP_ID]: shellId,
            [ALERT_GROUP_INDEX]: i,
            '@timestamp': new Date().toISOString(),
            'kibana.alert.rule.uuid': completeRule.alertId,
            'kibana.alert.rule.name': completeRule.ruleConfig.name,
            'kibana.alert.rule.type': 'correlation',
            'kibana.alert.original_alert.uuid': cappedAlertIds[i],
            'kibana.alert.risk_score': maxRisk,
            'kibana.alert.severity': highestSeverity,
            'kibana.alert.reason': `Building block for correlation: contributing alert ${cappedAlertIds[i]}`,
            'kibana.alert.workflow_status': 'open',
            ...enrichedFields,
            ...groupByValues,
          };
          wrappedAlerts.push({
            _id: bbId,
            _index: '',
            _source: buildingBlock,
          });
        }

        totalAlertsCreated += 1 + cappedAlertIds.length;
        groupsProcessed = groupIndex + 1;
        if (totalAlertsCreated >= tuple.maxSignals) {
          ruleExecutionLogger.warn(
            `Reached maxSignals limit (${tuple.maxSignals}) after processing ${groupIndex + 1} of ${
              correlationGroups.length
            } correlation groups`
          );
          break;
        }
      }

      const alertConstructionDuration = performance.now() - alertConstructionStart;
      phaseTiming.alertConstruction = alertConstructionDuration;
      ruleExecutionLogger.debug(
        `Alert construction completed in ${alertConstructionDuration.toFixed(
          1
        )}ms. Created ${totalAlertsCreated} alerts from ${groupsProcessed} groups.`
      );

      const typedAlerts = wrappedAlerts.slice(0, tuple.maxSignals) as unknown as Array<
        WrappedAlert<DetectionAlertLatest>
      >;

      const bulkCreateStart = performance.now();
      const bulkCreateResult = await bulkCreate({
        wrappedAlerts: typedAlerts,
        services,
        sharedParams: sharedParams as SecuritySharedParams,
        maxAlerts: tuple.maxSignals,
      });
      phaseTiming.bulkCreate = performance.now() - bulkCreateStart;

      addToSearchAfterReturn({ current: result, next: bulkCreateResult });

      ruleExecutionLogger.debug(
        `Correlation alerts created: ${bulkCreateResult.createdItemsCount}`
      );

      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });

      // Log phase timing breakdown for observability
      const totalExecutionTime = performance.now() - executionStart;
      ruleExecutionLogger.info(
        `Correlation execution completed in ${totalExecutionTime.toFixed(1)}ms ` +
          `(query: ${phaseTiming.esqlQuery.toFixed(1)}ms, ` +
          `enrichment: ${phaseTiming.enrichment.toFixed(1)}ms, ` +
          `construction: ${phaseTiming.alertConstruction.toFixed(1)}ms, ` +
          `bulk: ${phaseTiming.bulkCreate.toFixed(1)}ms)`
      );

      // Reset circuit breaker on successful execution
      updatedState = {
        ...updatedState,
        consecutiveTimeouts: 0,
        lastTimeoutTimestamp: undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.success = false;

      // Update circuit breaker state if this was a timeout
      const isTimeout =
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('timed out');
      if (isTimeout) {
        const newTimeoutCount = (updatedState.consecutiveTimeouts ?? 0) + 1;
        updatedState = {
          ...updatedState,
          consecutiveTimeouts: newTimeoutCount,
          lastTimeoutTimestamp: new Date().toISOString(),
        };
        ruleExecutionLogger.warn(
          `Correlation execution timeout (${newTimeoutCount} consecutive). ` +
            `Circuit breaker will trigger after 3 timeouts within 1 hour.`
        );
      } else {
        // Reset on non-timeout errors
        updatedState = {
          ...updatedState,
          consecutiveTimeouts: 0,
          lastTimeoutTimestamp: undefined,
        };
      }
    }

    return {
      ...result,
      state: updatedState,
      ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
    };
  });
};

const computeHighestSeverity = (severities: string[]): string => {
  const order = ['critical', 'high', 'medium', 'low'];
  for (const s of order) {
    if (severities.includes(s)) return s;
  }
  return 'low';
};
