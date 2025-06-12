/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HISTORY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexCheckFlyout.historyTab',
  {
    defaultMessage: 'History',
  }
);

export const LATEST_CHECK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexCheckFlyout.latestCheckTab',
  {
    defaultMessage: 'Latest Check',
  }
);

export const ADD_TO_NEW_CASE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.addToNewCaseButton',
  {
    defaultMessage: 'Add to new case',
  }
);

export const ALL_CALLOUT = (version: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.indexProperties.allCallout', {
    values: { version },
    defaultMessage:
      "All mappings for the fields in this index, including fields that comply with the Elastic Common Schema (ECS), version {version}, and fields that don't",
  });

export const ALL_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.allCalloutTitle',
    {
      values: { fieldCount },
      defaultMessage:
        'All {fieldCount} {fieldCount, plural, =1 {field mapping} other {field mappings}}',
    }
  );

export const ALL_EMPTY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.allCalloutEmptyContent',
  {
    defaultMessage: 'This index does not contain any mappings',
  }
);

export const ALL_EMPTY_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.allCalloutEmptyTitle',
  {
    defaultMessage: 'No mappings',
  }
);

export const ALL_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.allTab.allFieldsTableTitle', {
    values: { indexName },
    defaultMessage: 'All fields - {indexName}',
  });

export const SUMMARY_MARKDOWN_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.summaryMarkdownTitle',
  {
    defaultMessage: 'Data quality',
  }
);

export const SUMMARY_MARKDOWN_DESCRIPTION = ({
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  indexName,
  mappingUrl,
  version,
}: {
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  indexName: string;
  mappingUrl: string;
  version: string;
}) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.summaryMarkdownDescription',
    {
      values: { ecsFieldReferenceUrl, ecsReferenceUrl, indexName, mappingUrl, version },
      defaultMessage:
        'The `{indexName}` index has [mappings]({mappingUrl}) or field values that are different than the [Elastic Common Schema]({ecsReferenceUrl}) (ECS), version `{version}` [definitions]({ecsFieldReferenceUrl}).',
    }
  );

export const COPY_TO_CLIPBOARD = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.copyToClipboardButton',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const CUSTOM_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.customTab.customFieldsTableTitle',
    {
      values: { indexName },
      defaultMessage: 'Custom fields - {indexName}',
    }
  );

export const CUSTOM_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.custonDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Custom detection engine rules work',
  }
);

export const ECS_COMPLIANT_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsCompliantCallout',
    {
      values: { fieldCount, version },
      defaultMessage:
        'The {fieldCount, plural, =1 {index mapping type and document values for this field comply} other {index mapping types and document values of these fields comply}} with the Elastic Common Schema (ECS), version {version}',
    }
  );

export const ECS_COMPLIANT_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsCompliantCalloutTitle',
    {
      values: { fieldCount },
      defaultMessage: '{fieldCount} ECS compliant {fieldCount, plural, =1 {field} other {fields}}',
    }
  );

export const ECS_COMPLIANT_EMPTY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsCompliantEmptyContent',
  {
    defaultMessage:
      'None of the field mappings in this index comply with the Elastic Common Schema (ECS). The index must (at least) contain an @timestamp date field.',
  }
);

export const ECS_VERSION_MARKDOWN_COMMENT = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsVersionMarkdownComment',
  {
    defaultMessage: 'Elastic Common Schema (ECS) version',
  }
);

export const INDEX = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.indexMarkdown',
  {
    defaultMessage: 'Index',
  }
);

export const ECS_COMPLIANT_EMPTY_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsCompliantEmptyTitle',
  {
    defaultMessage: 'No ECS compliant Mappings',
  }
);

export const ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsCompliantMappingsAreFullySupportedMessage',
  {
    defaultMessage: '✅ ECS compliant mappings and field values are fully supported',
  }
);

export const ERROR_LOADING_MAPPINGS_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMappingsTitle',
  {
    defaultMessage: 'Unable to load index mappings',
  }
);

export const ERROR_LOADING_MAPPINGS_BODY = (error: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMappingsBody',
    {
      values: { error },
      defaultMessage: 'There was a problem loading mappings: {error}',
    }
  );

export const ERROR_LOADING_UNALLOWED_VALUES_BODY = (error: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingUnallowedValuesBody',
    {
      values: { error },
      defaultMessage: 'There was a problem loading unallowed values: {error}',
    }
  );

export const ERROR_LOADING_UNALLOWED_VALUES_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingUnallowedValuesTitle',
  {
    defaultMessage: 'Unable to load unallowed values',
  }
);

export const ERROR_GENERIC_CHECK_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorGenericCheckTitle',
  {
    defaultMessage: 'An error occurred during the check',
  }
);

export const ECS_COMPLIANT_FIELDS_TABLE_TITLE = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.customTab.ecsComplaintFieldsTableTitle',
    {
      values: { indexName },
      defaultMessage: 'ECS complaint fields - {indexName}',
    }
  );

export const LOADING_MAPPINGS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyLoadingPrompt.loadingMappingsPrompt',
  {
    defaultMessage: 'Loading mappings',
  }
);

export const LOADING_UNALLOWED_VALUES = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyLoadingPrompt.loadingUnallowedValuesPrompt',
  {
    defaultMessage: 'Loading unallowed values',
  }
);

export const CHECKING_INDEX = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyLoadingPrompt.checkingIndexPrompt',
  {
    defaultMessage: 'Checking index',
  }
);

export const CUSTOM_CALLOUT = ({ fieldCount, version }: { fieldCount: number; version: string }) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.indexProperties.customCallout', {
    values: { fieldCount, version },
    defaultMessage:
      '{fieldCount, plural, =1 {This field is not} other {These fields are not}} defined by the Elastic Common Schema (ECS), version {version}.',
  });

export const SAME_FAMILY_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.sameFamilyCallout',
    {
      values: { fieldCount, version },
      defaultMessage:
        "{fieldCount, plural, =1 {This field is} other {These fields are}} defined by the Elastic Common Schema (ECS), version {version}, but {fieldCount, plural, =1 {its mapping type doesn't} other {their mapping types don't}} exactly match.",
    }
  );

export const CUSTOM_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.customCalloutTitle',
    {
      values: { fieldCount },
      defaultMessage:
        '{fieldCount} Custom {fieldCount, plural, =1 {field mapping} other {field mappings}}',
    }
  );

export const SAME_FAMILY_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.sameFamilyCalloutTitle',
    {
      values: { fieldCount },
      defaultMessage:
        '{fieldCount} Same family {fieldCount, plural, =1 {field mapping} other {field mappings}}',
    }
  );

export const CUSTOM_EMPTY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.customEmptyContent',
  {
    defaultMessage: 'All the field mappings in this index are defined by the Elastic Common Schema',
  }
);

export const CUSTOM_EMPTY_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.customEmptyTitle',
  {
    defaultMessage: 'All field mappings defined by ECS',
  }
);

export const FIELDS_WITH_MAPPINGS_SAME_FAMILY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.incompatibleCallout.fieldsWithMappingsSameFamilyLabel',
  {
    defaultMessage:
      'Fields with mappings in the same family have exactly the same search behavior as the type specified by ECS, but may have different space usage or performance characteristics.',
  }
);

export const WHEN_A_FIELD_IS_INCOMPATIBLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.incompatibleCallout.whenAFieldIsIncompatibleLabel',
  {
    defaultMessage: 'When a field is incompatible:',
  }
);

export const DETECTION_ENGINE_RULES_WILL_WORK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.detectionEngineRulesWillWorkMessage',
  {
    defaultMessage: '✅ Detection engine rules will work for these fields',
  }
);

export const OTHER_APP_CAPABILITIES_WORK_PROPERLY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.otherAppCapabilitiesWorkProperlyMessage',
  {
    defaultMessage: '✅ Other app capabilities work properly',
  }
);

export const SAME_FAMILY_EMPTY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.sameFamilyEmptyContent',
  {
    defaultMessage:
      'All of the field mappings and document values in this index are compliant with the Elastic Common Schema (ECS).',
  }
);

export const SAME_FAMILY_EMPTY_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.sameFamilyEmptyTitle',
  {
    defaultMessage: 'All field mappings and values are ECS compliant',
  }
);

export const PAGES_DISPLAY_EVENTS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.pagesDisplayEventsMessage',
  {
    defaultMessage: '✅ Pages display events and fields correctly',
  }
);

export const PAGES_MAY_NOT_DISPLAY_FIELDS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.pagesMayNotDisplayFieldsMessage',
  {
    defaultMessage: '🌕 Some pages and features may not display these fields',
  }
);

export const PRE_BUILT_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.preBuiltDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Pre-built detection engine rules work',
  }
);

export const ECS_IS_A_PERMISSIVE_SCHEMA = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.ecsIsAPermissiveSchemaMessage',
  {
    defaultMessage:
      'ECS is a permissive schema. If your events have additional data that cannot be mapped to ECS, you can simply add them to your events, using custom field names.',
  }
);

export const SOMETIMES_INDICES_CREATED_BY_OLDER = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.sometimesIndicesCreatedByOlderDescription',
  {
    defaultMessage:
      'Sometimes, indices created by older integrations will have mappings or values that were, but are no longer compliant.',
  }
);

export const UNKNOWN = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.indexProperties.unknownCategoryLabel',
  {
    defaultMessage: 'Unknown',
  }
);

export const ECS_DESCRIPTION = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.ecsDescription',
  {
    defaultMessage: 'ECS description',
  }
);

export const SEARCH_FIELDS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.compareFieldsTable.searchFieldsPlaceholder',
  {
    defaultMessage: 'Search fields',
  }
);

export const SAME_FAMILY_FIELD_MAPPINGS_TABLE_TITLE = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.sameFamilyTab.sameFamilyFieldMappingsTableTitle',
    {
      values: { indexName },
      defaultMessage: 'Same family field mappings - {indexName}',
    }
  );
