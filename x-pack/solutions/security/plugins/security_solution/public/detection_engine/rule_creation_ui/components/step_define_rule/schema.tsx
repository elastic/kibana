/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import React from 'react';

import {
  singleEntryThreat,
  containsInvalidItems,
  customValidators,
} from '../../../../common/components/threat_match/helpers';
import {
  isEsqlRule,
  isThreatMatchRule,
  isSuppressionRuleConfiguredWithGroupBy,
} from '../../../../../common/detection_engine/utils';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import type { ERROR_CODE, FormSchema, ValidationFunc } from '../../../../shared_imports';
import { FIELD_TYPES, fieldValidators } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { dataViewIdValidatorFactory } from '../../validators/data_view_id_validator_factory';
import { indexPatternValidatorFactory } from '../../validators/index_pattern_validator_factory';
import { alertSuppressionFieldsValidatorFactory } from '../../validators/alert_suppression_fields_validator_factory';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../rule_creation/components/alert_suppression_edit';
import * as alertSuppressionEditI81n from '../../../rule_creation/components/alert_suppression_edit/components/translations';
import {
  INDEX_HELPER_TEXT,
  THREAT_MATCH_INDEX_HELPER_TEXT,
  THREAT_MATCH_REQUIRED,
  THREAT_MATCH_EMPTIES,
} from './translations';
import { queryRequiredValidatorFactory } from '../../validators/query_required_validator_factory';
import { kueryValidatorFactory } from '../../validators/kuery_validator_factory';

export const schema: FormSchema<DefineStepRule> = {
  index: {
    defaultValue: [],
    fieldsToValidateOnChange: ['index', 'queryBar'],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fiedIndexPatternsLabel',
      {
        defaultMessage: 'Index patterns',
      }
    ),
    helpText: <EuiText size="xs">{INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (...args) => {
          const [{ formData }] = args;

          if (
            isMlRule(formData.ruleType) ||
            isEsqlRule(formData.ruleType) ||
            formData.dataSourceType !== DataSourceType.IndexPatterns
          ) {
            return;
          }

          return indexPatternValidatorFactory()(...args);
        },
      },
    ],
  },
  dataViewId: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.dataViewSelector',
      {
        defaultMessage: 'Data view',
      }
    ),
    fieldsToValidateOnChange: ['dataViewId'],
    validations: [
      {
        validator: (...args) => {
          const [{ formData }] = args;

          if (isMlRule(formData.ruleType) || formData.dataSourceType !== DataSourceType.DataView) {
            return;
          }

          return dataViewIdValidatorFactory()(...args);
        },
      },
    ],
  },
  dataViewTitle: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.dataViewTitleSelector',
      {
        defaultMessage: 'Data view index pattern',
      }
    ),
    validations: [],
  },
  eqlOptions: {
    fieldsToValidateOnChange: ['eqlOptions', 'queryBar'],
  },
  queryBar: {
    fieldsToValidateOnChange: ['queryBar', ALERT_SUPPRESSION_FIELDS_FIELD_NAME],
    validations: [
      {
        validator: (...args) => {
          const [{ value, formData }] = args;

          if (isMlRule(formData.ruleType) || value.saved_id) {
            // Ignore field validation error in this case.
            // Instead, we show the error toast when saved query object does not exist.
            // https://github.com/elastic/kibana/issues/159060
            return;
          }

          return queryRequiredValidatorFactory(formData.ruleType)(...args);
        },
      },
      {
        validator: kueryValidatorFactory(),
      },
    ],
  },
  ruleType: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldRuleTypeLabel',
      {
        defaultMessage: 'Rule type',
      }
    ),
    validations: [],
  },
  anomalyThreshold: {},
  machineLearningJobId: {},
  relatedIntegrations: {
    type: FIELD_TYPES.JSON,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRelatedIntegrationsLabel',
      {
        defaultMessage: 'Related integrations',
      }
    ),
  },
  requiredFields: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRequiredFieldsLabel',
      {
        defaultMessage: 'Required fields',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRequiredFieldsHelpText',
      {
        defaultMessage: 'Fields required for this Rule to function.',
      }
    ),
  },
  timeline: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimelineTemplateLabel',
      {
        defaultMessage: 'Timeline template',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimelineTemplateHelpText',
      {
        defaultMessage: 'Select which timeline to use when investigating generated alerts.',
      }
    ),
  },
  threshold: {},
  threatIndex: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatIndexPatternsLabel',
      {
        defaultMessage: 'Indicator index patterns',
      }
    ),
    helpText: <EuiText size="xs">{THREAT_MATCH_INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchoutputIndiceNameFieldRequiredError',
              {
                defaultMessage: 'A minimum of one index pattern is required.',
              }
            )
          )(...args);
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData, value }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          return customValidators.forbiddenField(value, '*');
        },
      },
    ],
  },
  threatMapping: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatMappingLabel',
      {
        defaultMessage: 'Indicator mapping',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ path, formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          if (singleEntryThreat(formData.threatMapping)) {
            return {
              code: 'ERR_FIELD_MISSING',
              path,
              message: THREAT_MATCH_REQUIRED,
            };
          } else if (containsInvalidItems(formData.threatMapping)) {
            return {
              code: 'ERR_FIELD_MISSING',
              path,
              message: THREAT_MATCH_EMPTIES,
            };
          } else {
            return undefined;
          }
        },
      },
    ],
  },
  threatQueryBar: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatQueryBarLabel',
      {
        defaultMessage: 'Indicator index query',
      }
    ),
    validations: [
      {
        validator: (...args) => {
          const [{ formData }] = args;
          if (!isThreatMatchRule(formData.ruleType)) {
            return;
          }

          return queryRequiredValidatorFactory(formData.ruleType)(...args);
        },
      },
      {
        validator: kueryValidatorFactory(),
      },
    ],
  },
  newTermsFields: {},
  historyWindowSize: {},
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: {
    validations: [
      {
        validator: (...args: Parameters<ValidationFunc>) => {
          const [{ formData }] = args;
          const needsValidation = isSuppressionRuleConfiguredWithGroupBy(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          return alertSuppressionFieldsValidatorFactory()(...args);
        },
      },
    ],
  },
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.groupByDurationValueLabel',
      {
        defaultMessage: 'Suppress alerts for',
      }
    ),
  },
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: {
    label: alertSuppressionEditI81n.ALERT_SUPPRESSION_MISSING_FIELDS_LABEL,
  },
  shouldLoadQueryDynamically: {
    type: FIELD_TYPES.CHECKBOX,
    defaultValue: false,
  },
};
