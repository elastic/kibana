/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_TRUSTED_DEVICES_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.list.removeDialog.title',
    {
      defaultMessage: 'Remove trusted device from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This trusted device will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove trusted device',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} trusted devices are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no trusted devices that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.title',
    {
      defaultMessage: 'Assign trusted devices',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.subtitle', {
      defaultMessage: 'Select trusted devices to add to {policyName}',
      values: { policyName },
    }),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.search.label',
    {
      defaultMessage: 'Search trusted devices',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating trusted devices`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} trusted devices have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedDevices.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" has been added to your trusted device list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unassigned.title',
    { defaultMessage: 'No assigned trusted devices' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unassigned.content',
      {
        defaultMessage:
          'There are currently no trusted devices assigned to {policyName}. Assign trusted devices now or add and manage them on the trusted devices page.',
        values: { policyName },
      }
    ),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign trusted devices',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage trusted devices',
    }
  ),
  emptyUnassignedNoPrivilegesMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unassigned.noPrivileges.content',
      {
        defaultMessage: 'There are currently no trusted devices assigned to {policyName}.',
        values: { policyName },
      }
    ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unexisting.title',
    { defaultMessage: 'No trusted devices exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unexisting.content',
    { defaultMessage: 'There are currently no trusted devices applied to your endpoints.' }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.empty.unexisting.action',
    { defaultMessage: 'Add trusted devices' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.trustedDevices.list.totalItemCount', {
      defaultMessage:
        'Showing {totalItemsCount, plural, one {# trusted device} other {# trusted devices}}',
      values: { totalItemsCount },
    }),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied trusted device cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, value`,
    }
  ),
  layoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.title',
    {
      defaultMessage: 'Assigned trusted devices',
    }
  ),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.assignToPolicy',
    {
      defaultMessage: 'Assign trusted devices to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.trustedDevices.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all trusted devices',
    }
  ),
});
