/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type {
  ERROR_CODE,
  FormSchema,
  ValidationError,
  ValidationFunc,
} from '../../../../shared_imports';
import { FIELD_TYPES, fieldValidators, VALIDATION_TYPES } from '../../../../shared_imports';
import type { AboutStepRiskScore, AboutStepRule } from '../../../common/types';
import { OptionalFieldLabel } from '../../../rule_creation/components/optional_field_label';
import { isUrlInvalid } from '../../../../common/utils/validators';
import { defaultRiskScoreValidator } from '../../validators/default_risk_score_validator';
import { maxSignalsValidatorFactory } from '../../validators/max_signals_validator_factory';
import * as I18n from './translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema<AboutStepRule> = {
  author: {
    type: FIELD_TYPES.COMBO_BOX,
    label: I18n.AUTHOR_FIELD_LABEL,
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldAuthorHelpText',
      {
        defaultMessage:
          'Type one or more authors for this rule. Press enter after each author to add a new one.',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.authorFieldEmptyError',
            {
              defaultMessage: 'An author must not be empty',
            }
          )
        ),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
    ],
  },
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldNameLabel',
      {
        defaultMessage: 'Name',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.nameFieldRequiredError',
            {
              defaultMessage: 'A name is required.',
            }
          )
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldDescriptionLabel',
      {
        defaultMessage: 'Description',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.descriptionFieldRequiredError',
            {
              defaultMessage: 'A description is required.',
            }
          )
        ),
      },
    ],
  },
  isBuildingBlock: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldBuildingBlockLabel',
      {
        defaultMessage: 'Mark all generated alerts as "building block" alerts',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  maxSignals: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRuleForm.fieldMaxAlertsLabel',
      {
        defaultMessage: 'Max alerts per run',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: maxSignalsValidatorFactory(),
      },
    ],
  },
  isAssociatedToEndpointList: {
    defaultValue: false,
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldAssociatedToEndpointListLabel',
      {
        defaultMessage: 'Add existing Endpoint exceptions to the rule',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  severity: {
    value: {},
    mapping: {},
    isMappingChecked: {},
  },
  riskScore: {
    value: {},
    mapping: {},
    isMappingChecked: {},
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc<{}, ERROR_CODE, AboutStepRiskScore>>
        ): ValidationError | undefined => {
          const [{ value: fieldValue, path }] = args;
          const defaultRiskScore = fieldValue.value;

          return defaultRiskScoreValidator(defaultRiskScore, path);
        },
      },
    ],
  },
  references: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldReferenceUrlsLabel',
      {
        defaultMessage: 'Reference URLs',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          let hasError = false;
          (value as string[]).forEach((url) => {
            if (isUrlInvalid(url)) {
              hasError = true;
            }
          });
          return hasError
            ? {
                code: 'ERR_FIELD_FORMAT',
                path,
                message: I18n.URL_FORMAT_INVALID,
              }
            : undefined;
        },
      },
    ],
  },
  falsePositives: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldFalsePositiveLabel',
      {
        defaultMessage: 'False positive examples',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  investigationFields: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldCustomHighlightedFieldsLabel',
      {
        defaultMessage: 'Custom highlighted fields',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  license: {
    type: FIELD_TYPES.TEXT,
    label: I18n.LICENSE_FIELD_LABEL,
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldLicenseHelpText',
      {
        defaultMessage: 'Add a license name',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  ruleNameOverride: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRuleNameOverrideLabel',
      {
        defaultMessage: 'Rule name override',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRuleNameOverrideHelpText',
      {
        defaultMessage:
          'Choose a field from the source event to populate the rule name in the alert list.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  threat: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldMitreThreatLabel',
      {
        defaultMessage: 'MITRE ATT&CK\u2122',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  threatIndicatorPath: {},
  timestampOverride: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimestampOverrideLabel',
      {
        defaultMessage: 'Timestamp override',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimestampOverrideHelpText',
      {
        defaultMessage:
          'Choose timestamp field used when executing rule. Pick field with timestamp closest to ingest time (e.g. event.ingested).',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  timestampOverrideFallbackDisabled: {
    type: FIELD_TYPES.CHECKBOX,
    defaultValue: false,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimestampOverrideFallbackDisabledLabel',
      {
        defaultMessage: 'Do not use @timestamp as a fallback timestamp field',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTagsLabel',
      {
        defaultMessage: 'Tags',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTagsHelpText',
      {
        defaultMessage:
          'Type one or more custom identifying tags for this rule. Press enter after each tag to begin a new one.',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.tagFieldEmptyError',
            {
              defaultMessage: 'A tag must not be empty',
            }
          )
        ),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
    ],
  },
  note: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.guideLabel',
      {
        defaultMessage: 'Investigation guide',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.guideHelpText',
      {
        defaultMessage:
          'Provide helpful information for analysts that are investigating detection alerts. This guide will appear on the rule details page and in timelines (as notes) created from detection alerts generated by this rule.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  setup: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.setupLabel',
      {
        defaultMessage: 'Setup guide',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.setupHelpText',
      {
        defaultMessage:
          'Provide instructions on rule prerequisites such as required integrations, configuration steps, and anything else needed for the rule to work correctly.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
};
