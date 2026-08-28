/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleMigrationVendorCopy } from './types';

const LOOKUPS_SPLUNK_APP = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.appSection',
  { defaultMessage: 'Splunk App for Lookup File Editing' }
);

const RULES_SPLUNK_APP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.copyExportQuery.description.section',
  { defaultMessage: 'Search and Reporting' }
);

export const SPLUNK_RULE_MIGRATION_VENDOR_COPY: RuleMigrationVendorCopy = {
  originalRule: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.originalRuleTitle',
      {
        defaultMessage: 'Splunk query',
      }
    ),
    tooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.originalRuleTooltip',
      {
        defaultMessage:
          'This is the rule name detected in the export file uploaded for translation',
      }
    ),
  },
  missingResources: {
    readyDescription: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.missingResourcesReadyDescription',
      {
        defaultMessage:
          'You can also upload the missing macros & lookups for more accurate results.',
      }
    ),
    uploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.missingResourcesUploadTitle',
      {
        defaultMessage: 'Upload missing macros and lookup lists.',
      }
    ),
  },
  checkResources: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.checkResourcesTitle',
      {
        defaultMessage: 'Check for macros and lookups',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.checkResourcesDescription',
      {
        defaultMessage:
          'For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.',
      }
    ),
  },
  missingLookupsList: {
    description: (
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.copyExportQuery.splunk.description"
        defaultMessage="Log in to your Splunk admin account, go to the {app}, download the following lookups individually and upload them below. You can also omit lookups that are empty or not needed, and they will be ignored in the translation."
        values={{ app: <b>{LOOKUPS_SPLUNK_APP}</b> }}
      />
    ),
    copyNameTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.copyLookupNameTooltip',
      { defaultMessage: 'Copy lookup name' }
    ),
    clearEmptyTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingLookupsList.clearEmptyLookupTooltip',
      { defaultMessage: 'Mark the lookup as empty' }
    ),
    copyNameTestId: 'lookupNameCopy',
    clearEmptyTestId: 'lookupNameClear',
  },
  lookupsFileUpload: {
    prompt: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupsFileUpload.prompt',
      { defaultMessage: 'Select or drag and drop the exported lookup files' }
    ),
    label: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.lookupsFileUpload.label',
      { defaultMessage: 'Upload lookups files' }
    ),
    filePickerId: 'lookupsFilePicker',
  },
  resourceDataInputStep: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.title',
      { defaultMessage: 'Upload lookups' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.description',
      {
        defaultMessage:
          "We've also found lookups within your rules. To fully translate those rules containing these lookups, follow the step-by-step guide to export and upload them all.",
      }
    ),
    copyTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.title',
      { defaultMessage: 'Lookups found in your rules' }
    ),
    fileUploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.title',
      { defaultMessage: 'Update your lookups export' }
    ),
  },
  rulesFileUpload: {
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.rulesFileUploadDescription',
      {
        defaultMessage:
          'For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.',
      }
    ),
    prompt: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.promptSplunk',
      { defaultMessage: 'Select or drag and drop the exported JSON file' }
    ),
  },
  copyExportQuery: {
    description: (
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.copyExportQuery.splunk.description"
        defaultMessage="Log in to your Splunk admin account, go to the {section} app and run the following query. Export your results as {format}."
        values={{
          section: <b>{RULES_SPLUNK_APP}</b>,
          format: <b>{'JSON'}</b>,
        }}
      />
    ),
    details: {
      queryLimitDisclaimer: (
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rulesFileUpload.disclaimer"
          defaultMessage="Note: To avoid exceeding your LLM API rate limit when translating a large number of queries, consider exporting rules in batches, for example by adding {operator} to the query above"
          values={{ operator: <EuiCode>{'| head'}</EuiCode> }}
        />
      ),
    },
  },
  copyrightNotice: i18n.translate(
    'xpack.securitySolution.siemMigrations.common.splunk.copyrightNotice',
    {
      defaultMessage:
        'Splunk and related marks are trademarks or registered trademarks of Splunk LLC in the United States and other countries.',
    }
  ),
};
