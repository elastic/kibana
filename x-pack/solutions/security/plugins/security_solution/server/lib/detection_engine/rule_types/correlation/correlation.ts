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
import { compileCorrelationQuery } from './compile_correlation_query';
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
    const selfRuleId = completeRule.ruleParams.ruleId;

    const compiledQuery = compileCorrelationQuery(ruleParams.correlation, selfRuleId);
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
        excludedDocuments: {},
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

      const wrappedAlerts: Array<{
        _id: string;
        _index: string;
        _source: Record<string, unknown>;
      }> = [];

      for (const group of correlationGroups) {
        const shellId = uuidv4();
        const alertIds = Array.isArray(group.alert_ids) ? group.alert_ids : [group.alert_ids];
        const ruleNames = Array.isArray(group.rule_names) ? group.rule_names : [group.rule_names];
        const maxRisk = typeof group.max_risk === 'number' ? group.max_risk : 0;
        const severityList = Array.isArray(group.severity_list) ? group.severity_list : [];
        const highestSeverity = computeHighestSeverity(severityList as string[]);

        const groupByValues: Record<string, unknown> = {};
        for (const field of ruleParams.correlation.groupBy) {
          if (group[field] !== undefined) {
            groupByValues[field] = group[field];
          }
        }

        const boostMultiplier =
          ruleParams.correlation.type === 'temporal' ||
          ruleParams.correlation.type === 'temporal_ordered'
            ? Math.min(alertIds.length, 5) * 0.1
            : 0;
        const compositeRiskScore = Math.min(Math.round(maxRisk * (1 + boostMultiplier)), 100);

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
            alertIds.length
          } alerts grouped by ${ruleParams.correlation.groupBy.join(', ')}`,
          'kibana.alert.correlated_alerts': alertIds,
          'kibana.alert.correlated_rule_names': ruleNames,
          'kibana.alert.workflow_status': 'open',
          ...flattenGroupByValues(groupByValues),
        };

        wrappedAlerts.push({
          _id: shellId,
          _index: '',
          _source: shellAlert,
        });

        for (let i = 0; i < alertIds.length; i++) {
          const bbId = uuidv4();
          const buildingBlock: Record<string, unknown> = {
            [ALERT_UUID]: bbId,
            [ALERT_BUILDING_BLOCK_TYPE]: 'default',
            [ALERT_GROUP_ID]: shellId,
            [ALERT_GROUP_INDEX]: i,
            '@timestamp': new Date().toISOString(),
            'kibana.alert.rule.uuid': completeRule.alertId,
            'kibana.alert.rule.name': completeRule.ruleConfig.name,
            'kibana.alert.rule.type': 'correlation',
            'kibana.alert.original_alert.uuid': alertIds[i],
            'kibana.alert.risk_score': maxRisk,
            'kibana.alert.severity': highestSeverity,
            'kibana.alert.reason': `Building block for correlation: contributing alert ${alertIds[i]}`,
            'kibana.alert.workflow_status': 'open',
            ...flattenGroupByValues(groupByValues),
          };
          wrappedAlerts.push({
            _id: bbId,
            _index: '',
            _source: buildingBlock,
          });
        }
      }

      const typedAlerts = wrappedAlerts as unknown as Array<WrappedAlert<DetectionAlertLatest>>;

      const bulkCreateResult = await bulkCreate({
        wrappedAlerts: typedAlerts,
        services,
        sharedParams: sharedParams as SecuritySharedParams,
        maxAlerts: tuple.maxSignals,
      });

      addToSearchAfterReturn({ current: result, next: bulkCreateResult });

      ruleExecutionLogger.debug(
        `Correlation alerts created: ${bulkCreateResult.createdItemsCount}`
      );

      scheduleNotificationResponseActionsService({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: completeRule.ruleParams.responseActions,
      });
    } catch (error) {
      result.errors.push(error.message);
      result.success = false;
    }

    return {
      ...result,
      state: { ...state },
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

const flattenGroupByValues = (values: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    result[key] = value;
  }
  return result;
};
