/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash/fp';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import useToggle from 'react-use/lib/useToggle';
import type {
  AlertSuppressionMissingFieldsStrategy,
  EqlOptionalFields,
  RequiredFieldArray,
  RuleResponse,
  Threshold as ThresholdType,
  ThreatMapping as ThreatMappingType,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { assertUnreachable } from '../../../../../common/utility_types';
import * as descriptionStepI18n from '../../../rule_creation_ui/components/description_step/translations';
import { RelatedIntegrationsDescription } from '../../../common/components/related_integrations/integrations_description';
import { AlertSuppressionLabel } from '../../../rule_creation_ui/components/description_step/alert_suppression_label';
import { useGetSavedQuery } from '../../../common/use_get_saved_query';
import * as threatMatchI18n from '../../../../common/components/threat_match/translations';
import * as timelinesI18n from '../../../../timelines/components/timeline/translations';
import type { Duration } from '../../../common/types';
import { MlJobsDescription } from '../../../rule_creation/components/ml_jobs_description/ml_jobs_description';
import { MlJobLink } from '../../../rule_creation/components/ml_job_link/ml_job_link';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { BadgeList } from './badge_list';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from './constants';
import * as i18n from './translations';
import { useAlertSuppression } from '../../logic/use_alert_suppression';
import { RequiredFieldIcon } from './required_field_icon';
import {
  filtersStyles,
  queryStyles,
  useRequiredFieldsStyles,
} from './rule_definition_section.styles';
import { getQueryLanguageLabel } from './helpers';
import { useDefaultIndexPattern } from '../../hooks/use_default_index_pattern';
import { convertDateMathToDuration } from '../../../../common/utils/date_math';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../../../common/constants';
import {
  EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL,
  EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL,
} from '../../../rule_creation/components/eql_query_edit/translations';
import { useDataView } from './three_way_diff/final_edit/fields/hooks/use_data_view';
import { matchFiltersToIndexPattern } from '../../../../common/components/query_bar/match_filters_to_index_pattern';
import { RuleFieldName } from './rule_field_name';

interface SavedQueryNameProps {
  savedQueryName: string;
}

export const SavedQueryName = ({ savedQueryName }: SavedQueryNameProps) => (
  <EuiText size="s" data-test-subj="savedQueryNamePropertyValue">
    {savedQueryName}
  </EuiText>
);

interface FiltersProps {
  filters: Filter[];
  dataViewId?: string;
  index?: string[];
  'data-test-subj'?: string;
}

export const Filters = ({
  filters,
  dataViewId,
  index,
  'data-test-subj': dataTestSubj,
}: FiltersProps) => {
  const defaultIndexPattern = useDefaultIndexPattern();
  const useDataViewParams = dataViewId
    ? { dataViewId }
    : { indexPatterns: index ?? defaultIndexPattern };
  const { dataView } = useDataView(useDataViewParams);

  const isEsql = filters.some((filter) => filter?.query?.language === 'esql');

  if (!dataView?.id || isEsql) {
    return null;
  }

  const flattenedFilters = mapAndFlattenFilters(filters);
  const matchedFilters = matchFiltersToIndexPattern(dataView.id, flattenedFilters);

  const styles = filtersStyles;

  return (
    <EuiFlexGroup
      data-test-subj={dataTestSubj}
      className={styles.flexGroup}
      wrap
      responsive={false}
      gutterSize="xs"
    >
      <FilterItems filters={matchedFilters} indexPatterns={[dataView]} readOnly />
    </EuiFlexGroup>
  );
};

interface QueryProps {
  query: string;
  'data-test-subj'?: string;
}

export const Query = ({ query, 'data-test-subj': dataTestSubj = 'query' }: QueryProps) => {
  const styles = queryStyles;
  return (
    <div data-test-subj={dataTestSubj} className={styles.content}>
      {query}
    </div>
  );
};

interface IndexProps {
  index: string[];
}

export const Index = ({ index }: IndexProps) => (
  <BadgeList badges={index} data-test-subj="indexPropertyValue" />
);

interface DataViewIdProps {
  dataViewId: string;
}

export const DataViewId = ({ dataViewId }: DataViewIdProps) => (
  <EuiText size="s" data-test-subj="dataViewIdPropertyValue">
    {dataViewId}
  </EuiText>
);

interface DataViewIndexPatternProps {
  dataViewId: string;
}

export const DataViewIndexPattern = ({ dataViewId }: DataViewIndexPatternProps) => {
  const { data } = useKibana().services;
  const [indexPattern, setIndexPattern] = React.useState('');
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    data.dataViews
      .get(dataViewId)
      .then((dataView) => {
        setIndexPattern(dataView.getIndexPattern());
      })
      .catch(() => {
        setHasError(true);
      });
  }, [data, dataViewId]);

  if (hasError) {
    return <EuiText size="s">{i18n.DATA_VIEW_INDEX_PATTERN_FETCH_ERROR_MESSAGE}</EuiText>;
  }

  if (!indexPattern) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiText size="s" data-test-subj="dataViewIndexPatternPropertyValue">
      {indexPattern}
    </EuiText>
  );
};

interface ThresholdProps {
  threshold: ThresholdType;
}

export const Threshold = ({ threshold }: ThresholdProps) => {
  let thresholdDescription = isEmpty(threshold.field[0])
    ? `${descriptionStepI18n.THRESHOLD_RESULTS_ALL} >= ${threshold.value}`
    : `${descriptionStepI18n.THRESHOLD_RESULTS_AGGREGATED_BY} ${
        Array.isArray(threshold.field) ? threshold.field.join(',') : threshold.field
      } >= ${threshold.value}`;

  if (threshold.cardinality && threshold.cardinality.length > 0) {
    thresholdDescription = descriptionStepI18n.THRESHOLD_CARDINALITY(
      thresholdDescription,
      threshold.cardinality[0].field,
      threshold.cardinality[0].value
    );
  }

  return <div data-test-subj="thresholdPropertyValue">{thresholdDescription}</div>;
};

interface AnomalyThresholdProps {
  anomalyThreshold: number;
}

export const AnomalyThreshold = ({ anomalyThreshold }: AnomalyThresholdProps) => (
  <EuiText size="s" data-test-subj="anomalyThresholdPropertyValue">
    {anomalyThreshold}
  </EuiText>
);

interface MachineLearningJobListProps {
  jobIds?: string | string[];
  isInteractive: boolean;
}

export const MachineLearningJobList = ({ jobIds, isInteractive }: MachineLearningJobListProps) => {
  const { jobs: availableJobs } = useSecurityJobs();

  if (!jobIds) {
    return null;
  }

  const jobIdsArray = Array.isArray(jobIds) ? jobIds : [jobIds];

  const unavailableJobIds = jobIdsArray.filter(
    (jobId) => !availableJobs.some((job) => job.id === jobId)
  );

  if (isInteractive) {
    return (
      <>
        <MlJobsDescription jobIds={jobIdsArray} />
        <UnavailableMlJobs unavailableJobIds={unavailableJobIds} />
      </>
    );
  }

  const relevantJobs = availableJobs.filter((job) => jobIdsArray.includes(job.id));

  return (
    <>
      {relevantJobs.map((job) => (
        <MlJobLink
          key={job.id}
          jobId={job.id}
          jobName={job.customSettings?.security_app_display_name}
        />
      ))}
      <UnavailableMlJobs unavailableJobIds={unavailableJobIds} />
    </>
  );
};

interface UnavailableMlJobsProps {
  unavailableJobIds: string[];
}

const UnavailableMlJobs = ({ unavailableJobIds }: UnavailableMlJobsProps) => {
  return unavailableJobIds.map((jobId) => (
    <div key={jobId}>
      <UnavailableMlJobLink jobId={jobId} />
    </div>
  ));
};

interface UnavailableMlJobLinkProps {
  jobId: string;
}

const UnavailableMlJobLink: React.FC<UnavailableMlJobLinkProps> = ({ jobId }) => {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const button = (
    <EuiButtonIcon
      iconType="question"
      onClick={togglePopover}
      aria-label={i18n.MACHINE_LEARNING_JOB_NOT_AVAILABLE}
    />
  );

  return (
    <EuiText component="span" color="subdued" size="s">
      {jobId}
      <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
        {i18n.MACHINE_LEARNING_JOB_NOT_AVAILABLE}
      </EuiPopover>
    </EuiText>
  );
};

const getRuleTypeDescription = (ruleType: Type) => {
  switch (ruleType) {
    case 'machine_learning':
      return descriptionStepI18n.ML_TYPE_DESCRIPTION;
    case 'query':
    case 'saved_query':
      return descriptionStepI18n.QUERY_TYPE_DESCRIPTION;
    case 'threshold':
      return descriptionStepI18n.THRESHOLD_TYPE_DESCRIPTION;
    case 'eql':
      return descriptionStepI18n.EQL_TYPE_DESCRIPTION;
    case 'esql':
      return descriptionStepI18n.ESQL_TYPE_DESCRIPTION;
    case 'threat_match':
      return descriptionStepI18n.THREAT_MATCH_TYPE_DESCRIPTION;
    case 'new_terms':
      return descriptionStepI18n.NEW_TERMS_TYPE_DESCRIPTION;
    default:
      return assertUnreachable(ruleType);
  }
};

interface RuleTypeProps {
  type: Type;
}

export const RuleType = ({ type }: RuleTypeProps) => (
  <EuiText size="s">{getRuleTypeDescription(type)}</EuiText>
);

interface RequiredFieldsProps {
  requiredFields: RequiredFieldArray;
}

export const RequiredFields = ({ requiredFields }: RequiredFieldsProps) => {
  const styles = useRequiredFieldsStyles();

  return (
    <EuiFlexGrid data-test-subj="requiredFieldsPropertyValue" gutterSize={'s'}>
      {requiredFields.map((rF, index) => (
        <EuiFlexItem grow={false} key={rF.name}>
          <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
            <EuiFlexItem grow={false}>
              <RequiredFieldIcon type={rF.type} data-test-subj="field-type-icon" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                data-test-subj="requiredFieldsPropertyValueItem"
                className={styles.fieldNameText}
                grow={false}
                size="xs"
              >
                {` ${rF.name}${index + 1 !== requiredFields.length ? ', ' : ''}`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};

interface TimelineTitleProps {
  timelineTitle: string;
}

export const TimelineTitle = ({ timelineTitle }: TimelineTitleProps) => (
  <EuiText size="s" data-test-subj="timelineTemplatePropertyValue">
    {timelineTitle}
  </EuiText>
);

interface ThreatIndexProps {
  threatIndex: string[];
}

export const ThreatIndex = ({ threatIndex }: ThreatIndexProps) => (
  <BadgeList badges={threatIndex} data-test-subj="threatIndexPropertyValue" />
);

interface ThreatMappingProps {
  threatMapping: ThreatMappingType;
}

export const ThreatMapping = ({ threatMapping }: ThreatMappingProps) => {
  const description = threatMapping.reduce<string>(
    (accumThreatMaps, threatMap, threatMapIndex, { length: threatMappingLength }) => {
      const matches = threatMap.entries.reduce<string>(
        (accumItems, item, itemsIndex, { length: threatMapLength }) => {
          const matchOperator = item.negate
            ? threatMatchI18n.DOES_NOT_MATCH
            : threatMatchI18n.MATCHES;

          if (threatMapLength === 1) {
            return `${item.field} ${matchOperator} ${item.value}`;
          } else if (itemsIndex === 0) {
            return `(${item.field} ${matchOperator} ${item.value})`;
          } else {
            return `${accumItems} ${threatMatchI18n.AND} (${item.field} ${matchOperator} ${item.value})`;
          }
        },
        ''
      );

      if (threatMappingLength === 1) {
        return `${matches}`;
      } else if (threatMapIndex === 0) {
        return `(${matches})`;
      } else {
        return `${accumThreatMaps} ${threatMatchI18n.OR} (${matches})`;
      }
    },
    ''
  );

  return (
    <EuiText size="s" data-test-subj="threatMappingPropertyValue">
      {description}
    </EuiText>
  );
};

interface SuppressAlertsByFieldProps {
  fields: string[];
}

export const SuppressAlertsByField = ({ fields }: SuppressAlertsByFieldProps) => (
  <BadgeList badges={fields} data-test-subj="alertSuppressionGroupByPropertyValue" />
);

interface SuppressAlertsDurationProps {
  duration?: Duration;
}

export const SuppressAlertsDuration = ({ duration }: SuppressAlertsDurationProps) => {
  const durationDescription = duration
    ? `${duration.value}${duration.unit}`
    : descriptionStepI18n.ALERT_SUPPRESSION_PER_RULE_EXECUTION;

  return (
    <EuiText size="s" data-test-subj="alertSuppressionDurationPropertyValue">
      {durationDescription}
    </EuiText>
  );
};

interface MissingFieldsStrategyProps {
  missingFieldsStrategy?: AlertSuppressionMissingFieldsStrategy;
}

export const MissingFieldsStrategy = ({ missingFieldsStrategy }: MissingFieldsStrategyProps) => {
  const missingFieldsDescription =
    missingFieldsStrategy === AlertSuppressionMissingFieldsStrategyEnum.suppress
      ? descriptionStepI18n.ALERT_SUPPRESSION_SUPPRESS_ON_MISSING_FIELDS
      : descriptionStepI18n.ALERT_SUPPRESSION_DO_NOT_SUPPRESS_ON_MISSING_FIELDS;

  return (
    <EuiText size="s" data-test-subj="alertSuppressionMissingFieldsPropertyValue">
      {missingFieldsDescription}
    </EuiText>
  );
};

interface NewTermsFieldsProps {
  newTermsFields: string[];
}

export const NewTermsFields = ({ newTermsFields }: NewTermsFieldsProps) => (
  <BadgeList badges={newTermsFields} data-test-subj="newTermsFieldsPropertyValue" />
);

interface HistoryWindowSizeProps {
  historyWindowStart?: string;
}

export const HistoryWindowSize = ({ historyWindowStart }: HistoryWindowSizeProps) => {
  const size = historyWindowStart
    ? convertDateMathToDuration(historyWindowStart)
    : DEFAULT_HISTORY_WINDOW_SIZE;

  return (
    <EuiText size="s" data-test-subj={`newTermsWindowSizePropertyValue-${historyWindowStart}`}>
      {size}
    </EuiText>
  );
};

interface PrepareDefinitionSectionListItemsProps {
  rule: Partial<RuleResponse>;
  isInteractive: boolean;
  savedQuery: SavedQuery | undefined;
  isSuppressionEnabled: boolean;
  showModifiedFields?: boolean;
}

// eslint-disable-next-line complexity
const prepareDefinitionSectionListItems = ({
  rule,
  isInteractive,
  savedQuery,
  isSuppressionEnabled,
  showModifiedFields = false,
}: PrepareDefinitionSectionListItemsProps): EuiDescriptionListProps['listItems'] => {
  const definitionSectionListItems: EuiDescriptionListProps['listItems'] = [];

  if ('index' in rule && rule.index && rule.index.length > 0) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="indexPropertyTitle">
          <RuleFieldName
            label={i18n.INDEX_FIELD_LABEL}
            fieldName="data_source"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: <Index index={rule.index} />,
    });
  }

  if ('data_view_id' in rule && rule.data_view_id) {
    definitionSectionListItems.push(
      {
        title: (
          <span data-test-subj="dataViewIdPropertyTitle">
            <RuleFieldName
              label={i18n.DATA_VIEW_ID_FIELD_LABEL}
              fieldName="data_source"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: <DataViewId dataViewId={rule.data_view_id} />,
      },
      {
        title: (
          <span data-test-subj="dataViewIndexPatternPropertyTitle">
            <RuleFieldName
              label={i18n.DATA_VIEW_INDEX_PATTERN_FIELD_LABEL}
              fieldName="data_source"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: <DataViewIndexPattern dataViewId={rule.data_view_id} />,
      }
    );
  }

  if (savedQuery) {
    definitionSectionListItems.push(
      {
        title: (
          <span data-test-subj="savedQueryNamePropertyTitle">
            <RuleFieldName
              label={descriptionStepI18n.SAVED_QUERY_NAME_LABEL}
              fieldName="kql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: <SavedQueryName savedQueryName={savedQuery.attributes.title} />,
      },
      {
        title: (
          <span data-test-subj="savedQueryLanguagePropertyTitle">
            <RuleFieldName
              label={i18n.SAVED_QUERY_LANGUAGE_LABEL}
              fieldName="kql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: (
          <span data-test-subj="savedQueryLanguagePropertyValue">
            {getQueryLanguageLabel(savedQuery.attributes.query.language)}
          </span>
        ),
      }
    );

    if (savedQuery.attributes.filters) {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="savedQueryFiltersPropertyTitle">
            <RuleFieldName
              label={descriptionStepI18n.SAVED_QUERY_FILTERS_LABEL}
              fieldName="kql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: (
          <Filters
            filters={savedQuery.attributes.filters}
            data-test-subj="savedQueryFiltersPropertyValue"
            dataViewId={'data_view_id' in rule ? rule.data_view_id : undefined}
            index={'index' in rule ? rule.index : undefined}
          />
        ),
      });
    }

    if (typeof savedQuery.attributes.query.query === 'string') {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="savedQueryContentPropertyTitle">
            <RuleFieldName
              label={descriptionStepI18n.SAVED_QUERY_LABEL}
              fieldName="kql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: (
          <Query
            query={savedQuery.attributes.query.query}
            data-test-subj="savedQueryContentPropertyValue"
          />
        ),
      });
    }
  }

  if ('filters' in rule && rule.filters?.length) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="filtersPropertyTitle">
          <RuleFieldName
            label={descriptionStepI18n.FILTERS_LABEL}
            fieldName="kql_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <Filters
          filters={rule.filters as Filter[]}
          dataViewId={rule.data_view_id}
          index={rule.index}
          data-test-subj="filtersPropertyValue"
        />
      ),
    });
  }

  if ('query' in rule && rule.query) {
    if (rule.type === 'eql') {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="eqlQueryPropertyTitle">
            <RuleFieldName
              label={descriptionStepI18n.EQL_QUERY_LABEL}
              fieldName="eql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: <Query query={rule.query} data-test-subj="eqlQueryPropertyValue" />,
      });
    } else if (rule.type === 'esql') {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="esqlQueryPropertyTitle">
            <RuleFieldName
              label={descriptionStepI18n.ESQL_QUERY_LABEL}
              fieldName="esql_query"
              showModifiedFields={showModifiedFields}
            />
          </span>
        ),
        description: <Query query={rule.query} data-test-subj="esqlQueryPropertyValue" />,
      });
    } else {
      definitionSectionListItems.push(
        {
          title: (
            <span data-test-subj="customQueryPropertyTitle">
              <RuleFieldName
                label={descriptionStepI18n.QUERY_LABEL}
                fieldName="kql_query"
                showModifiedFields={showModifiedFields}
              />
            </span>
          ),
          description: <Query query={rule.query} data-test-subj="customQueryPropertyValue" />,
        },
        {
          title: (
            <span data-test-subj="customQueryLanguagePropertyTitle">
              <RuleFieldName
                label={i18n.QUERY_LANGUAGE_LABEL}
                fieldName="kql_query"
                showModifiedFields={showModifiedFields}
              />
            </span>
          ),
          description: (
            <span data-test-subj="customQueryLanguagePropertyValue">
              {getQueryLanguageLabel(rule.language || '')}
            </span>
          ),
        }
      );
    }
  }

  if ((rule as EqlOptionalFields).event_category_override) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="eqlOptionsEventCategoryOverrideTitle">
          <RuleFieldName
            label={EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL}
            fieldName="eql_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <span data-test-subj="eqlOptionsEventCategoryOverrideValue">
          {(rule as EqlOptionalFields).event_category_override}
        </span>
      ),
    });
  }

  if ((rule as EqlOptionalFields).tiebreaker_field) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="eqlOptionsTiebreakerFieldTitle">
          <RuleFieldName
            label={EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL}
            fieldName="eql_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <span data-test-subj="eqlOptionsEventTiebreakerFieldValue">
          {(rule as EqlOptionalFields).tiebreaker_field}
        </span>
      ),
    });
  }

  if ((rule as EqlOptionalFields).timestamp_field) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="eqlOptionsTimestampFieldTitle">
          <RuleFieldName
            label={EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL}
            fieldName="eql_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <span data-test-subj="eqlOptionsTimestampFieldValue">
          {(rule as EqlOptionalFields).timestamp_field}
        </span>
      ),
    });
  }

  if (rule.type) {
    definitionSectionListItems.push({
      title: <RuleFieldName fieldName="type" showModifiedFields={showModifiedFields} />,
      description: <RuleType type={rule.type} />,
    });
  }

  if ('anomaly_threshold' in rule && rule.anomaly_threshold) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="anomalyThresholdPropertyTitle">
          <RuleFieldName fieldName="anomaly_threshold" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <AnomalyThreshold anomalyThreshold={rule.anomaly_threshold} />,
    });
  }

  if ('machine_learning_job_id' in rule) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="mlJobPropertyTitle">
          <RuleFieldName
            fieldName="machine_learning_job_id"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <MachineLearningJobList
          jobIds={rule.machine_learning_job_id}
          isInteractive={isInteractive}
        />
      ),
    });
  }

  if (rule.related_integrations && rule.related_integrations.length > 0) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="relatedIntegrationsPropertyTitle">
          <RuleFieldName fieldName="related_integrations" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: (
        <RelatedIntegrationsDescription
          relatedIntegrations={rule.related_integrations}
          dataTestSubj="relatedIntegrationsPropertyValue"
        />
      ),
    });
  }

  if (rule.required_fields && rule.required_fields.length > 0) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="requiredFieldsPropertyTitle">
          <RuleFieldName fieldName="required_fields" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <RequiredFields requiredFields={rule.required_fields} />,
    });
  }

  definitionSectionListItems.push({
    title: (
      <span data-test-subj="timelineTemplatePropertyTitle">
        <RuleFieldName fieldName="timeline_template" showModifiedFields={showModifiedFields} />
      </span>
    ),
    description: (
      <TimelineTitle timelineTitle={rule.timeline_title || timelinesI18n.DEFAULT_TIMELINE_TITLE} />
    ),
  });

  if ('threshold' in rule && rule.threshold) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="thresholdPropertyTitle">
          <RuleFieldName fieldName="threshold" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <Threshold threshold={rule.threshold} />,
    });
  }

  if ('threat_index' in rule && rule.threat_index) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="threatIndexPropertyTitle">
          <RuleFieldName fieldName="threat_index" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <ThreatIndex threatIndex={rule.threat_index} />,
    });
  }

  if ('threat_filters' in rule && rule.threat_filters && rule.threat_filters.length > 0) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="threatFiltersPropertyTitle">
          <RuleFieldName
            label={i18n.THREAT_FILTERS_FIELD_LABEL}
            fieldName="threat_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <Filters
          filters={rule.threat_filters as Filter[]}
          dataViewId={rule.data_view_id}
          index={rule.index}
          data-test-subj="threatFiltersPropertyValue"
        />
      ),
    });
  }

  if ('threat_query' in rule && rule.threat_query) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="threatQueryPropertyTitle">
          <RuleFieldName
            label={descriptionStepI18n.THREAT_QUERY_LABEL}
            fieldName="threat_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: <Query query={rule.threat_query} data-test-subj="threatQueryPropertyValue" />,
    });
  }

  if ('threat_language' in rule && rule.threat_language) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="threatQueryLanguagePropertyTitle">
          <RuleFieldName
            label={i18n.THREAT_QUERY_LANGUAGE_LABEL}
            fieldName="threat_query"
            showModifiedFields={showModifiedFields}
          />
        </span>
      ),
      description: (
        <span data-test-subj="threatQueryLanguagePropertyValue">
          {getQueryLanguageLabel(rule.threat_language)}
        </span>
      ),
    });
  }

  if ('threat_mapping' in rule && rule.threat_mapping) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="threatMappingPropertyTitle">
          <RuleFieldName fieldName="threat_mapping" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <ThreatMapping threatMapping={rule.threat_mapping} />,
    });
  }

  if ('new_terms_fields' in rule && rule.new_terms_fields && rule.new_terms_fields.length > 0) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="newTermsFieldsPropertyTitle">
          <RuleFieldName fieldName="new_terms_fields" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <NewTermsFields newTermsFields={rule.new_terms_fields} />,
    });
  }

  if ('history_window_start' in rule) {
    definitionSectionListItems.push({
      title: (
        <span data-test-subj="newTermsWindowSizePropertyTitle">
          <RuleFieldName fieldName="history_window_start" showModifiedFields={showModifiedFields} />
        </span>
      ),
      description: <HistoryWindowSize historyWindowStart={rule.history_window_start} />,
    });
  }

  if (isSuppressionEnabled && 'alert_suppression' in rule && rule.alert_suppression) {
    if ('group_by' in rule.alert_suppression) {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="alertSuppressionGroupByPropertyTitle">
            <AlertSuppressionLabel
              label={i18n.SUPPRESS_ALERTS_BY_FIELD_LABEL}
              ruleType={rule.type}
            />
          </span>
        ),
        description: <SuppressAlertsByField fields={rule.alert_suppression.group_by} />,
      });
    }

    definitionSectionListItems.push({
      title: (
        <span data-test-subj="alertSuppressionDurationPropertyTitle">
          <AlertSuppressionLabel
            label={i18n.SUPPRESS_ALERTS_DURATION_FIELD_LABEL}
            ruleType={rule.type}
          />
        </span>
      ),
      description: <SuppressAlertsDuration duration={rule.alert_suppression.duration} />,
    });

    if ('missing_fields_strategy' in rule.alert_suppression) {
      definitionSectionListItems.push({
        title: (
          <span data-test-subj="alertSuppressionMissingFieldPropertyTitle">
            <AlertSuppressionLabel
              label={i18n.SUPPRESSION_FIELD_MISSING_FIELD_LABEL}
              ruleType={rule.type}
            />
          </span>
        ),
        description: (
          <MissingFieldsStrategy
            missingFieldsStrategy={rule.alert_suppression.missing_fields_strategy}
          />
        ),
      });
    }
  }

  return definitionSectionListItems;
};

export interface RuleDefinitionSectionProps
  extends React.ComponentProps<typeof EuiDescriptionList> {
  rule: Partial<RuleResponse>;
  columnWidths?: EuiDescriptionListProps['columnWidths'];
  isInteractive?: boolean;
  dataTestSubj?: string;
  showModifiedFields?: boolean;
}

export const RuleDefinitionSection = ({
  rule,
  isInteractive = false,
  columnWidths = DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  dataTestSubj,
  showModifiedFields,
  ...descriptionListProps
}: RuleDefinitionSectionProps) => {
  const { savedQuery } = useGetSavedQuery({
    savedQueryId: rule.type === 'saved_query' ? rule.saved_id : '',
    ruleType: rule.type,
  });

  const { isSuppressionEnabled } = useAlertSuppression(rule.type);

  const definitionSectionListItems = prepareDefinitionSectionListItems({
    rule,
    isInteractive,
    savedQuery,
    isSuppressionEnabled,
    showModifiedFields,
  });

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiDescriptionList
        type={descriptionListProps.type ?? 'column'}
        rowGutterSize={descriptionListProps.rowGutterSize ?? 'm'}
        listItems={definitionSectionListItems}
        columnWidths={columnWidths}
        data-test-subj="listItemColumnStepRuleDescription"
        {...descriptionListProps}
      />
    </div>
  );
};
