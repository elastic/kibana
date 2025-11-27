/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export const POLICY_ARTIFACT_ENDPOINT_EXCEPTIONS_LABELS = Object.freeze({
  deleteModalTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.list.removeDialog.title',
    {
      defaultMessage: 'Remove endpoint exception from policy',
    }
  ),
  deleteModalImpactInfo: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.list.removeDialog.messageCallout',
    {
      defaultMessage:
        'This endpoint exception will be removed only from this policy and can still be found and managed from the artifact page.',
    }
  ),
  deleteModalErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.list.removeDialog.errorToastTitle',
    {
      defaultMessage: 'Error while attempting to remove endpoint exception',
    }
  ),
  flyoutWarningCalloutMessage: (maxNumber: number) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.searchWarning.text',
      {
        defaultMessage:
          'Only the first {maxNumber} endpoint exceptions are displayed. Please use the search bar to refine the results.',
        values: { maxNumber },
      }
    ),
  flyoutNoArtifactsToBeAssignedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.noAssignable',
    {
      defaultMessage: 'There are no endpoint exceptions that can be assigned to this policy.',
    }
  ),
  flyoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.title',
    {
      defaultMessage: 'Assign endpoint exceptions',
    }
  ),
  flyoutSubtitle: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.subtitle',
      {
        defaultMessage: 'Select endpoint exceptions to add to {policyName}',
        values: { policyName },
      }
    ),
  flyoutSearchPlaceholder: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.search.label',
    {
      defaultMessage: 'Search endpoint exceptions',
    }
  ),
  flyoutErrorMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.toastError.text',
    {
      defaultMessage: `An error occurred updating endpoint exception`,
    }
  ),
  flyoutSuccessMessageText: (updatedExceptions: ExceptionListItemSchema[]): string =>
    updatedExceptions.length > 1
      ? i18n.translate(
          'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.toastSuccess.textMultiples',
          {
            defaultMessage: '{count} endpoint exceptions have been added to your list.',
            values: { count: updatedExceptions.length },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.flyout.toastSuccess.textSingle',
          {
            defaultMessage: '"{name}" endpoint exception has been added to your list.',
            values: { name: updatedExceptions[0].name },
          }
        ),
  emptyUnassignedTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unassigned.title',
    { defaultMessage: 'No assigned endpoint exceptions' }
  ),
  emptyUnassignedMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unassigned.content',
      {
        defaultMessage:
          'There are currently no endpoint exceptions assigned to {policyName}. Assign endpoint exceptions now or add and manage them on the endpoint exceptions page.',
        values: { policyName },
      }
    ),
  emptyUnassignedPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unassigned.primaryAction',
    {
      defaultMessage: 'Assign endpoint exception',
    }
  ),
  emptyUnassignedSecondaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unassigned.secondaryAction',
    {
      defaultMessage: 'Manage endpoint exceptions',
    }
  ),
  emptyUnassignedNoPrivilegesMessage: (policyName: string): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unassigned.noPrivileges.content',
      {
        defaultMessage: 'There are currently no endpoint exceptions assigned to {policyName}.',
        values: { policyName },
      }
    ),
  emptyUnexistingTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unexisting.title',
    { defaultMessage: 'No endpoint exceptions exist' }
  ),
  emptyUnexistingMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unexisting.content',
    {
      defaultMessage: 'There are currently no endpoint exceptions applied to your endpoints.',
    }
  ),
  emptyUnexistingPrimaryActionButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.empty.unexisting.action',
    { defaultMessage: 'Add endpoint exception' }
  ),
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate(
      'xpack.securitySolution.endpoint.policy.endpointExceptionss.list.totalItemCount',
      {
        defaultMessage:
          'Showing {totalItemsCount, plural, one {# endpoint exception} other {# endpoint exceptions}}',
        values: { totalItemsCount },
      }
    ),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied endpoint exceptions cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, value`,
    }
  ),
  layoutTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.title',
    {
      defaultMessage: 'Assigned endpoint exceptions',
    }
  ),
  layoutAssignButtonTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.assignToPolicy',
    {
      defaultMessage: 'Assign endpoint exception to policy',
    }
  ),
  layoutViewAllLinkMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.endpointExceptions.layout.about.viewAllLinkLabel',
    {
      defaultMessage: 'view all endpoint exceptions',
    }
  ),
});
