/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleMigrationVendorCopy } from './types';

export const QRADAR_RULE_MIGRATION_VENDOR_COPY: RuleMigrationVendorCopy = {
  originalRule: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.originalRuleTitle',
      {
        defaultMessage: 'QRadar rule definition',
      }
    ),
    tooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.originalRuleTooltip',
      {
        defaultMessage:
          'This is the original QRadar rule definition in XML format as exported from QRadar',
      }
    ),
  },
  missingResources: {
    readyDescription: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.missingResourcesReadyDescription',
      {
        defaultMessage: 'You can also upload the missing reference sets for more accurate results.',
      }
    ),
    uploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.missingResourcesUploadTitle',
      {
        defaultMessage: 'Upload missing reference sets',
      }
    ),
  },
  checkResources: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.checkResourcesTitle',
      {
        defaultMessage: 'Check for reference sets',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.checkResourcesDescription',
      {
        defaultMessage:
          'For best translation results, we will review the data for reference sets. If found, we will ask you to upload them next.',
      }
    ),
  },
  missingLookupsList: {
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.qradarAppSection',
      {
        defaultMessage:
          'Below are the reference set found in your rules. Export them from QRadar and upload here.',
      }
    ),
    copyNameTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.copyReferenceSetNameTooltip',
      { defaultMessage: 'Copy reference set name' }
    ),
    clearEmptyTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingReferenceSetsList.clearEmptyReferenceSetTooltip',
      { defaultMessage: 'Mark the reference set as empty' }
    ),
    copyNameTestId: 'referenceSetNameCopy',
    clearEmptyTestId: 'referenceSetNameClear',
  },
  lookupsFileUpload: {
    prompt: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.referenceSetsFileUpload.prompt',
      { defaultMessage: 'Select or drag and drop the exported reference set files' }
    ),
    label: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.referenceSetsFileUpload.label',
      { defaultMessage: 'Upload reference set files' }
    ),
    filePickerId: 'referenceSetsFilePicker',
  },
  resourceDataInputStep: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSet.title',
      { defaultMessage: 'Upload reference sets' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSet.description',
      {
        defaultMessage:
          "We've also found reference sets within your rules. To fully translate those rules containing these reference sets, upload them all.",
      }
    ),
    copyTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSet.missingReferenceSetList.title',
      { defaultMessage: 'Reference sets found in your rules' }
    ),
    fileUploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.referenceSets.referenceSetsFileUpload.title',
      { defaultMessage: 'Update your reference sets export' }
    ),
  },
  copyrightNotice: i18n.translate(
    'xpack.securitySolution.siemMigrations.common.qradar.copyrightNotice',
    {
      defaultMessage:
        'IBM® and QRadar® are registered trademarks of International Business Machines Corporation, registered in many jurisdictions worldwide.',
    }
  ),
};
