/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ArtifactListPageLabels } from '../../components/artifact_list_page';

export const CUSTOM_YARA_SIGNATURES_PAGE_LABELS: ArtifactListPageLabels = {
  pageTitle: i18n.translate('xpack.securitySolution.customYaraSignatures.list.pageTitle', {
    defaultMessage: 'Custom YARA signatures',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.customYaraSignatures.list.pageAboutInfo', {
    defaultMessage:
      'Add and manage custom YARA signatures to enhance endpoint threat detection by scanning files and memory for patterns unique to your environment.',
  }),
  pageAddButtonTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageAddButtonTitle',
    {
      defaultMessage: 'Add YARA signature',
    }
  ),
  pageImportButtonTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageImportButtonTitle',
    {
      defaultMessage: 'Import YARA signatures',
    }
  ),
  pageExportButtonTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageExportButtonTitle',
    {
      defaultMessage: 'Export YARA signatures',
    }
  ),
  pageExportSuccessToastTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageExportSuccessToastTitle',
    {
      defaultMessage: 'YARA signatures exported successfully',
    }
  ),
  pageExportErrorToastTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageExportErrorToastTitle',
    {
      defaultMessage: 'YARA signatures export failed',
    }
  ),
  pageImportOnlyCurrentArtifactCanBeImportedError: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.pageImportOnlyCurrentArtifactCanBeImportedError',
    {
      defaultMessage: 'You can only import custom YARA signatures here.',
    }
  ),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.customYaraSignatures.list.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {YARA signature} other {YARA signatures}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.cardActionEditLabel',
    {
      defaultMessage: 'Edit YARA signature',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.cardActionDeleteLabel',
    {
      defaultMessage: 'Remove from YARA signatures list',
    }
  ),
  flyoutCreateTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.flyoutCreateTitle',
    {
      defaultMessage: 'Add YARA signature',
    }
  ),
  flyoutEditTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.flyoutEditTitle',
    {
      defaultMessage: 'Edit YARA signature',
    }
  ),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.flyoutCreateSubmitButtonLabel',
    {
      defaultMessage: 'Add YARA signature',
    }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.customYaraSignatures.list.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your custom YARA signatures list.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.customYaraSignatures.list.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: () => null,
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.customYaraSignatures.list.deleteActionSuccess', {
      defaultMessage: '"{itemName}" has been removed from the custom YARA signatures list',
      values: { itemName },
    }),
  emptyStateTitleNoEntries: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.emptyStateTitleNoEntries',
    {
      defaultMessage: 'There are no custom YARA signatures to display.',
    }
  ),
  emptyStateTitle: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.emptyStateTitle',
    {
      defaultMessage: 'Add your first YARA signature',
    }
  ),
  emptyStateInfo: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.emptyStateInfo',
    {
      defaultMessage:
        'YARA signatures help detect known malware and suspicious file patterns. Add a signature to start identifying threats in your environment.',
    }
  ),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.emptyStatePrimaryButtonLabel',
    {
      defaultMessage: 'Add YARA signature',
    }
  ),
  emptyStateImportButtonLabel: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.emptyStateImportButtonLabel',
    { defaultMessage: 'Import YARA signatures' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.customYaraSignatures.list.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
};
