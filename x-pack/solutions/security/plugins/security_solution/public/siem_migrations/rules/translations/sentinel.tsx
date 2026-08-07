/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleMigrationVendorCopy } from './types';

export const SENTINEL_RULE_MIGRATION_VENDOR_COPY: RuleMigrationVendorCopy = {
  originalRule: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.originalRuleTitle',
      {
        defaultMessage: 'Microsoft Sentinel KQL query',
      }
    ),
    tooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.originalRuleTooltip',
      {
        defaultMessage:
          'This is the original Microsoft Sentinel KQL query in ARM template JSON format as exported from Microsoft Sentinel',
      }
    ),
  },
  missingResources: {
    readyDescription: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.missingResourcesReadyDescription',
      {
        defaultMessage: 'You can also upload the missing watchlists for more accurate results.',
      }
    ),
    uploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.missingResourcesUploadTitle',
      {
        defaultMessage: 'Upload missing watchlists',
      }
    ),
  },
  checkResources: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.checkResourcesTitle',
      {
        defaultMessage: 'Check for watchlists',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.checkResourcesDescription',
      {
        defaultMessage:
          'For best translation results, we will review the data for watchlists. If found, we will ask you to upload them next.',
      }
    ),
  },
  missingLookupsList: {
    description: (
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingWatchlistsList.sentinelAppSection"
        defaultMessage="Below are the watchlists found in your rules. Export them from Microsoft Sentinel and upload here. Exported Watchlist must be in <armlink>ARM Resource format</armlink>. CSV content should be included in the <code>rawContent</code> property of the watchlist."
        values={{
          armlink: (child) => (
            <EuiLink
              href="https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/watchlists?pivots=deployment-language-arm-template#resource-format-1"
              target="_blank"
            >
              {child}
            </EuiLink>
          ),
          code: (child) => <EuiCode>{child}</EuiCode>,
        }}
      />
    ),
    copyNameTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingWatchlistsList.copyWatchlistNameTooltip',
      { defaultMessage: 'Copy watchlist name' }
    ),
    clearEmptyTooltip: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.missingWatchlistsList.clearEmptyWatchlistTooltip',
      { defaultMessage: 'Mark the watchlist as empty' }
    ),
    copyNameTestId: 'watchlistNameCopy',
    clearEmptyTestId: 'watchlistNameClear',
  },
  lookupsFileUpload: {
    prompt: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.watchlistsFileUpload.prompt',
      { defaultMessage: 'Select or drag and drop the exported watchlist files' }
    ),
    label: i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.lookups.watchlistsFileUpload.label',
      { defaultMessage: 'Upload watchlist files' }
    ),
    filePickerId: 'watchlistsFilePicker',
  },
  resourceDataInputStep: {
    title: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.watchlists.title',
      { defaultMessage: 'Upload watchlists' }
    ),
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.watchlists.description',
      {
        defaultMessage:
          "We've also found watchlists within your rules. To fully translate those rules containing these watchlists, follow the step-by-step guide to export and upload them all.",
      }
    ),
    copyTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingSentinelWatchlistsList.title',
      { defaultMessage: 'Watchlists found in your rules' }
    ),
    fileUploadTitle: i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.watchlistsFileUpload.title',
      { defaultMessage: 'Upload your watchlists export' }
    ),
  },
  copyrightNotice: i18n.translate(
    'xpack.securitySolution.siemMigrations.common.sentinel.copyrightNotice',
    {
      defaultMessage:
        'Microsoft, Microsoft Azure, and Microsoft Sentinel are trademarks or registered trademarks of Microsoft Corporation in the United States and other countries.',
    }
  ),
};
