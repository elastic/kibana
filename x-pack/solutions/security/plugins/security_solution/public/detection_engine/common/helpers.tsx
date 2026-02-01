/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { useLocation } from 'react-router-dom';

import styled from '@emotion/styled';
import { EuiFlexItem } from '@elastic/eui';
import type {
  Severity,
  SeverityMapping,
  Threats,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { Filter } from '@kbn/es-query';
import type { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { requiredOptional } from '@kbn/zod-helpers';
import { toSimpleRuleSchedule } from '../../../common/api/detection_engine/model/rule_schema/to_simple_rule_schedule';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../rule_creation/components/alert_suppression_edit';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../rule_creation/components/threshold_alert_suppression_edit';
import type { ResponseAction } from '../../../common/api/detection_engine/model/rule_response_actions';
import { normalizeThresholdField } from '../../../common/detection_engine/utils';
import { assertUnreachable } from '../../../common/utility_types';
import {
  transformRuleToAlertAction,
  transformRuleToAlertResponseAction,
} from '../../../common/detection_engine/transform_actions';
import type {
  AboutStepRule,
  AboutStepRuleDetails,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from './types';
import { AlertSuppressionDurationType, DataSourceType } from './types';
import { SeverityLevel } from '../rule_creation_ui/components/step_about_rule/data';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../common/detection_engine/constants';
import type { RuleAction, RuleResponse } from '../../../common/api/detection_engine';
import { normalizeMachineLearningJobId } from '../../common/utils/normalize_machine_learning_job_id';
import { convertDateMathToDuration } from '../../common/utils/date_math';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../common/constants';

export interface GetStepsData {
  aboutRuleData: AboutStepRule;
  modifiedAboutRuleDetailsData: AboutStepRuleDetails;
  defineRuleData: DefineStepRule;
  scheduleRuleData: ScheduleStepRule;
  ruleActionsData: ActionsStepRule;
}

export const getStepsData = ({
  rule,
  detailsView = false,
}: {
  rule: RuleResponse;
  detailsView?: boolean;
}): GetStepsData => {
  const defineRuleData: DefineStepRule = getDefineStepsData(rule);
  const aboutRuleData: AboutStepRule = getAboutStepsData(rule, detailsView);
  const modifiedAboutRuleDetailsData: AboutStepRuleDetails = getModifiedAboutDetailsData(rule);
  const scheduleRuleData: ScheduleStepRule = getScheduleStepsData(rule);
  const ruleActionsData: ActionsStepRule = getActionsStepsData(rule);

  return {
    aboutRuleData,
    modifiedAboutRuleDetailsData,
    defineRuleData,
    scheduleRuleData,
    ruleActionsData,
  };
};

export const getActionsStepsData = (
  rule: Omit<RuleResponse, 'actions'> & {
    actions: RuleAction[];
    response_actions?: ResponseAction[];
  }
): ActionsStepRule => {
  const { enabled, meta, actions = [], response_actions: responseActions } = rule;

  return {
    actions: actions?.map((action) => transformRuleToAlertAction(action)),
    responseActions: responseActions?.map(transformRuleToAlertResponseAction),
    kibanaSiemAppUrl:
      typeof meta?.kibana_siem_app_url === 'string' ? meta.kibana_siem_app_url : undefined,
    enabled,
  };
};

export const getMachineLearningJobId = (rule: RuleResponse): string[] | undefined => {
  if (rule.type === 'machine_learning') {
    return normalizeMachineLearningJobId(rule.machine_learning_job_id);
  }
  return undefined;
};

/* eslint-disable complexity */
export const getDefineStepsData = (rule: RuleResponse): DefineStepRule => ({
  ruleType: rule.type,
  anomalyThreshold: 'anomaly_threshold' in rule ? rule.anomaly_threshold : 50,
  machineLearningJobId: getMachineLearningJobId(rule) || [],
  index: ('index' in rule && rule.index) || [],
  dataViewId: 'data_view_id' in rule ? rule.data_view_id : undefined,
  threatIndex: ('threat_index' in rule && rule.threat_index) || [],
  threatQueryBar: {
    query: {
      query: ('threat_query' in rule && rule.threat_query) || '',
      language: ('threat_language' in rule && rule.threat_language) || '',
    },
    filters: (('threat_filters' in rule && rule.threat_filters) || []) as Filter[],
    saved_id: null,
  },
  threatMapping: ('threat_mapping' in rule && rule.threat_mapping) || [],
  queryBar: {
    query: {
      query: ('query' in rule && rule.query) || '',
      language: ('language' in rule && rule.language) || '',
    },
    filters: (('filters' in rule && rule.filters) || []) as Filter[],
    saved_id: ('saved_id' in rule && rule.saved_id) || null,
  },
  relatedIntegrations: rule.related_integrations ?? [],
  requiredFields: rule.required_fields ?? [],
  timeline: {
    id: rule.timeline_id ?? null,
    title: rule.timeline_title ?? null,
  },
  threshold: {
    field: normalizeThresholdField('threshold' in rule ? rule.threshold?.field : undefined),
    value: `${('threshold' in rule && rule.threshold?.value) || 100}`,
    ...('threshold' in rule && rule.threshold?.cardinality?.length
      ? {
          cardinality: {
            field: [`${rule.threshold.cardinality[0].field}`],
            value: `${rule.threshold.cardinality[0].value}`,
          },
        }
      : {}),
  },
  eqlOptions: {
    timestampField: 'timestamp_field' in rule ? rule.timestamp_field : undefined,
    eventCategoryField:
      'event_category_override' in rule ? rule.event_category_override : undefined,
    tiebreakerField: 'tiebreaker_field' in rule ? rule.tiebreaker_field : undefined,
  },
  dataSourceType:
    'data_view_id' in rule && rule.data_view_id
      ? DataSourceType.DataView
      : DataSourceType.IndexPatterns,
  newTermsFields: ('new_terms_fields' in rule && rule.new_terms_fields) || [],
  historyWindowSize:
    'history_window_start' in rule && rule.history_window_start
      ? convertDateMathToDuration(rule.history_window_start)
      : DEFAULT_HISTORY_WINDOW_SIZE,
  shouldLoadQueryDynamically: Boolean(rule.type === 'saved_query' && rule.saved_id),
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]:
    ('alert_suppression' in rule &&
      rule.alert_suppression &&
      'group_by' in rule.alert_suppression &&
      rule.alert_suppression.group_by) ||
    [],
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]:
    'alert_suppression' in rule && rule.alert_suppression?.duration
      ? AlertSuppressionDurationType.PerTimePeriod
      : AlertSuppressionDurationType.PerRuleExecution,
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: ('alert_suppression' in rule &&
    rule.alert_suppression?.duration) || {
    value: 5,
    unit: 'm',
  },
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]:
    ('alert_suppression' in rule &&
      rule.alert_suppression &&
      'missing_fields_strategy' in rule.alert_suppression &&
      rule.alert_suppression.missing_fields_strategy) ||
    DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: Boolean(
    'alert_suppression' in rule && rule.alert_suppression?.duration
  ),
});

export const getScheduleStepsData = (rule: RuleResponse): ScheduleStepRule => {
  const simpleRuleSchedule = toSimpleRuleSchedule(rule);

  if (simpleRuleSchedule) {
    return {
      interval: simpleRuleSchedule.interval,
      from: simpleRuleSchedule.lookback,
    };
  }

  return {
    interval: rule.interval,
    // Fallback to zero look-back since UI isn't able to handle negative
    // look-back
    from: '0s',
  };
};

export const getAboutStepsData = (rule: RuleResponse, detailsView: boolean): AboutStepRule => {
  const { name, description, note, setup } = determineDetailsValue(rule, detailsView);
  const {
    author,
    building_block_type: buildingBlockType,
    exceptions_list: exceptionsList,
    license,
    risk_score_mapping: riskScoreMapping,
    rule_name_override: ruleNameOverride,
    severity_mapping: severityMapping,
    timestamp_override: timestampOverride,
    timestamp_override_fallback_disabled: timestampOverrideFallbackDisabled,
    references,
    severity,
    false_positives: falsePositives,
    risk_score: riskScore,
    investigation_fields: investigationFields,
    tags,
    threat,
    max_signals: maxSignals,
  } = rule;
  const threatIndicatorPath =
    'threat_indicator_path' in rule ? rule.threat_indicator_path : undefined;

  return {
    author,
    isAssociatedToEndpointList:
      exceptionsList?.some(({ id }) => id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id) ??
      false,
    isBuildingBlock: buildingBlockType !== undefined,
    license: license ?? '',
    ruleNameOverride: ruleNameOverride ?? '',
    timestampOverride: timestampOverride ?? '',
    timestampOverrideFallbackDisabled,
    name,
    description,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    note: note!,
    references,
    severity: {
      value: severity as Severity,
      mapping: fillEmptySeverityMappings(severityMapping),
      isMappingChecked: severityMapping.length > 0,
    },
    tags,
    riskScore: {
      value: riskScore,
      mapping: requiredOptional(riskScoreMapping),
      isMappingChecked: riskScoreMapping.length > 0,
    },
    falsePositives,
    investigationFields: investigationFields?.field_names ?? [],
    threat: threat as Threats,
    threatIndicatorPath,
    maxSignals,
    setup,
  };
};

const severitySortMapping = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const fillEmptySeverityMappings = (mappings: SeverityMapping): SeverityMapping => {
  const missingMappings: SeverityMapping = Object.values(SeverityLevel).flatMap((severityLevel) => {
    const isSeverityLevelInMappings = mappings.some(
      (mapping) => mapping.severity === severityLevel
    );
    return isSeverityLevelInMappings
      ? []
      : [{ field: '', value: '', operator: 'equals', severity: severityLevel }];
  });
  return [...mappings, ...missingMappings].sort(
    (a, b) => severitySortMapping[a.severity] - severitySortMapping[b.severity]
  );
};

export const determineDetailsValue = (
  rule: RuleResponse,
  detailsView: boolean
): Pick<RuleResponse, 'name' | 'description' | 'note' | 'setup'> => {
  const { name, description, note, setup } = rule;
  if (detailsView) {
    return { name: '', description: '', note: '', setup: '' };
  }

  return { name, description, setup, note: note ?? '' };
};

export const getModifiedAboutDetailsData = (rule: RuleResponse): AboutStepRuleDetails => ({
  note: rule.note ?? '',
  description: rule.description,
  setup: rule.setup ?? '',
});

export const useQuery = () => new URLSearchParams(useLocation().search);

type PrePackagedTimelineInstallationStatus =
  | 'timelinesNotInstalled'
  | 'timelinesInstalled'
  | 'someTimelineUninstall'
  | 'timelineNeedUpdate'
  | 'unknown';

export const getPrePackagedTimelineInstallationStatus = (
  timelinesInstalled?: number,
  timelinesNotInstalled?: number,
  timelinesNotUpdated?: number
): PrePackagedTimelineInstallationStatus => {
  if (
    timelinesNotInstalled != null &&
    timelinesInstalled === 0 &&
    timelinesNotInstalled > 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'timelinesNotInstalled';
  } else if (
    timelinesInstalled != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled === 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'timelinesInstalled';
  } else if (
    timelinesInstalled != null &&
    timelinesNotInstalled != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled > 0 &&
    timelinesNotUpdated === 0
  ) {
    return 'someTimelineUninstall';
  } else if (
    timelinesInstalled != null &&
    timelinesNotInstalled != null &&
    timelinesNotUpdated != null &&
    timelinesInstalled > 0 &&
    timelinesNotInstalled >= 0 &&
    timelinesNotUpdated > 0
  ) {
    return 'timelineNeedUpdate';
  }
  return 'unknown';
};

export const redirectToDetections = (
  isSignalIndexExists: boolean | null,
  isAuthenticated: boolean | null,
  hasEncryptionKey: boolean | null,
  needsListsConfiguration: boolean
) =>
  isSignalIndexExists === false ||
  isAuthenticated === false ||
  hasEncryptionKey === false ||
  needsListsConfiguration;

const commonRuleParamsKeys = [
  'id',
  'name',
  'description',
  'false_positives',
  'investigation_fields',
  'rule_id',
  'max_signals',
  'risk_score',
  'output_index',
  'references',
  'severity',
  'timeline_id',
  'timeline_title',
  'threat',
  'type',
  'version',
];
const queryRuleParams = ['index', 'filters', 'language', 'query', 'saved_id', 'response_actions'];
const esqlRuleParams = ['filters', 'language', 'query', 'response_actions'];
const machineLearningRuleParams = ['anomaly_threshold', 'machine_learning_job_id'];
const thresholdRuleParams = ['threshold', ...queryRuleParams];

const getAllRuleParamsKeys = (): string[] => {
  const allRuleParamsKeys = [
    ...commonRuleParamsKeys,
    ...queryRuleParams,
    ...machineLearningRuleParams,
    ...thresholdRuleParams,
  ].sort();

  return Array.from(new Set<string>(allRuleParamsKeys));
};

const getRuleSpecificRuleParamKeys = (ruleType: Type) => {
  switch (ruleType) {
    case 'machine_learning':
      return machineLearningRuleParams;
    case 'threshold':
      return thresholdRuleParams;
    case 'esql':
      return esqlRuleParams;
    case 'new_terms':
    case 'threat_match':
    case 'query':
    case 'saved_query':
    case 'eql':
      return queryRuleParams;
  }
  assertUnreachable(ruleType);
};

const getActionMessageRuleParams = (ruleType: Type): string[] => {
  const ruleParamsKeys = [
    ...commonRuleParamsKeys,
    ...getRuleSpecificRuleParamKeys(ruleType),
  ].sort();

  return ruleParamsKeys;
};

const transformRuleKeysToActionVariables = (actionMessageRuleParams: string[]): ActionVariables => {
  return {
    state: [{ name: 'signals_count', description: 'state.signals_count' }],
    params: [],
    context: [
      {
        name: 'results_link',
        description: 'context.results_link',
        useWithTripleBracesInTemplates: true,
      },
      { name: 'alerts', description: 'context.alerts' },
      ...actionMessageRuleParams.map((param) => {
        const extendedParam = `rule.${param}`;
        return { name: extendedParam, description: `context.${extendedParam}` };
      }),
    ],
  };
};

export const getActionMessageParams = memoizeOne((ruleType: Type | undefined): ActionVariables => {
  if (!ruleType) {
    return { state: [], params: [] };
  }
  const actionMessageRuleParams = getActionMessageRuleParams(ruleType);

  return transformRuleKeysToActionVariables(actionMessageRuleParams);
});

/**
 * returns action variables available for all rule types
 */
export const getAllActionMessageParams = () =>
  transformRuleKeysToActionVariables(getAllRuleParamsKeys());

export const MaxWidthEuiFlexItem = styled(EuiFlexItem)`
  max-width: 1000px;
  overflow: hidden;
`;
