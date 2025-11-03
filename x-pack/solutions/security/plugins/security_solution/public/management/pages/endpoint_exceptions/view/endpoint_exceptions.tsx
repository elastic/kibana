/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinks } from '@kbn/doc-links';
import { EuiLink } from '@elastic/eui';

import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useHttp } from '../../../../common/lib/kibana';
import type { ArtifactListPageProps } from '../../../components/artifact_list_page';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { EndpointExceptionsForm } from './components/endpoint_exceptions_form';
import { EndpointExceptionsApiClient } from '../service/api_client';
import { SEARCHABLE_FIELDS } from '../constants';

const ENDPOINT_EXCEPTIONS_PAGE_LABELS: ArtifactListPageProps['labels'] = {
  pageTitle: i18n.translate('xpack.securitySolution.endpointExceptions.pageTitle', {
    defaultMessage: 'Endpoint exceptions',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.endpointExceptions.pageAboutInfo', {
    defaultMessage:
      'Endpoint exceptions prevent generating an alert by Defend integration on the host.',
  }),
  pageAddButtonTitle: i18n.translate(
    'xpack.securitySolution.endpointExceptions.pageAddButtonTitle',
    { defaultMessage: 'Add endpoint exception' }
  ),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.endpointExceptions.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {endpoint exception} other {endpoint exceptions}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.endpointExceptions.cardActionEditLabel',
    {
      defaultMessage: 'Edit endpoint exception',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.endpointExceptions.cardActionDeleteLabel',
    {
      defaultMessage: 'Delete endpoint exception',
    }
  ),
  flyoutCreateTitle: i18n.translate('xpack.securitySolution.endpointExceptions.flyoutCreateTitle', {
    defaultMessage: 'Add endpoint exception',
  }),
  flyoutEditTitle: i18n.translate('xpack.securitySolution.endpointExceptions.flyoutEditTitle', {
    defaultMessage: 'Edit endpoint exception',
  }),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.endpointExceptions.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add endpoint exception' }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.endpointExceptions.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your endpoint exceptions.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.endpointExceptions.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: (
    securitySolutionDocsLinks: DocLinks['securitySolution']
  ): React.ReactNode => {
    return (
      <>
        <FormattedMessage
          id="xpack.securitySolution.endpointExceptions.flyoutDowngradedLicenseDocsInfo"
          defaultMessage="For more information, see our "
        />
        <EuiLink target="_blank" href={`${securitySolutionDocsLinks.endpointArtifacts}`}>
          <FormattedMessage
            id="xpack.securitySolution.endpointExceptions.flyoutDowngradedLicenseDocsLink"
            defaultMessage="endpoint exceptions documentation."
          />
        </EuiLink>
      </>
    );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.endpointExceptions.deleteSuccess', {
      defaultMessage: '"{itemName}" has been removed from endpoint exceptions.',
      values: { itemName },
    }),
  emptyStateTitleNoEntries: i18n.translate(
    'xpack.securitySolution.endpointExceptions.emptyStateTitleNoEntries',
    {
      defaultMessage: 'There are no endpoint exceptions to display.',
    }
  ),
  emptyStateTitle: i18n.translate('xpack.securitySolution.endpointExceptions.emptyStateTitle', {
    defaultMessage: 'Add your first endpoint exception entry',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.endpointExceptions.emptyStateInfo', {
    defaultMessage:
      'Endpoint exceptions prevent generating an alert by Defend integration on the host.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.endpointExceptions.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Add endpoint exception' }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.endpointExceptions.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
};

export const EndpointExceptions = memo(() => {
  const { canWriteEndpointExceptions } = useUserPrivileges().endpointPrivileges;
  const http = useHttp();
  const endpointExceptionsApiClient = EndpointExceptionsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={endpointExceptionsApiClient}
      ArtifactFormComponent={EndpointExceptionsForm}
      labels={ENDPOINT_EXCEPTIONS_PAGE_LABELS}
      data-test-subj="endpointExceptionsPage"
      searchableFields={SEARCHABLE_FIELDS}
      flyoutSize="l"
      allowCardCreateAction={canWriteEndpointExceptions}
      allowCardEditAction={canWriteEndpointExceptions}
      allowCardDeleteAction={canWriteEndpointExceptions}
    />
  );
});

EndpointExceptions.displayName = 'EndpointExceptions';
