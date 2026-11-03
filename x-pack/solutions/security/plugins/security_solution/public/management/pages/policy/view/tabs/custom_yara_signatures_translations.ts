/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyArtifactsPageLabels } from '../artifacts/translations';

export const POLICY_ARTIFACT_CUSTOM_YARA_SIGNATURES_LABELS: Omit<
  PolicyArtifactsPageLabels,
  'layoutAboutMessage'
> = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.removeDialog.title',
    {
      defaultMessage: 'Remove custom YARA signature from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This custom YARA signature will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove custom YARA signature',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} custom YARA signatures are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no custom YARA signatures that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.title',
    {
      defaultMessage: 'Assign custom YARA signatures',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.subtitle',
      {
        defaultMessage: 'Select custom YARA signatures to add to {policyName}',
        values: { policyName },
      }
    ),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.search.label',
    {
      defaultMessage: 'Search custom YARA signatures',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.toastError.text',
    {
      defaultMessage: 'An error occurred updating custom YARA signature',
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} custom YARA signatures have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your custom YARA signatures list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unassigned.title',
    { defaultMessage: 'No assigned custom YARA signatures' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unassigned.content',
      {
        defaultMessage:
          'There are currently no custom YARA signatures assigned to {policyName}. Assign custom YARA signatures now or add and manage them on the custom YARA signatures page.',
        values: { policyName },
      }
    ),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign custom YARA signature',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage custom YARA signatures',
    }
  ),
  emptyUnassignedNoPrivilegesMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unassigned.noPrivileges.content',
      {
        defaultMessage: 'There are currently no custom YARA signatures assigned to {policyName}.',
        values: { policyName },
      }
    ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unexisting.title',
    { defaultMessage: 'No custom YARA signatures exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unexisting.content',
    {
      defaultMessage: 'There are currently no custom YARA signatures applied to your endpoints.',
    }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unexisting.action',
    { defaultMessage: 'Add custom YARA signature' }
  ),
  emptyUnexistingImportButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.empty.unexisting.importAction',
    { defaultMessage: 'Import custom YARA signatures' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.totalItemCount',
      {
        defaultMessage:
          'Showing {totalItemsCount, plural, one {# custom YARA signature} other {# custom YARA signatures}}',
        values: { totalItemsCount },
      }
    ),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied custom YARA signatures cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.list.search.placeholder',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
  layoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.title',
    {
      defaultMessage: 'Assigned custom YARA signatures',
    }
  ),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.assignToPolicy',
    {
      defaultMessage: 'Assign custom YARA signature to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.customYaraSignatures.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all custom YARA signatures',
    }
  ),
});
