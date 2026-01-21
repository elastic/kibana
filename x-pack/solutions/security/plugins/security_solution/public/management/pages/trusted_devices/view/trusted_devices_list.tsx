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
import type {
  ArtifactListPageProps,
  ArtifactListPageLabels,
} from '../../../components/artifact_list_page';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { TrustedDevicesApiClient } from '../service/api_client';
import { TrustedDevicesForm } from './components/form';
import { useHttp } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { SEARCHABLE_FIELDS } from '../constants';
import { TrustedDevicesArtifactsDocsLink } from './components/artifacts_docs_link';

type TrustedDevicesListProps = Omit<
  ArtifactListPageProps,
  'apiClient' | 'ArtifactFormComponent' | 'labels' | 'data-test-subj'
>;

const TRUSTED_DEVICES_PAGE_LABELS: ArtifactListPageLabels = {
  pageTitle: i18n.translate('xpack.securitySolution.trustedDevices.list.pageTitle', {
    defaultMessage: 'Trusted devices',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.trustedDevices.list.pageAboutInfo', {
    defaultMessage:
      'Allow a specific external device to connect to your endpoints, even when Device Control is enabled.',
  }),
  pageAddButtonTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.pageAddButtonTitle',
    {
      defaultMessage: 'Add trusted device',
    }
  ),
  pageImportButtonTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.pageImportButtonTitle',
    {
      defaultMessage: 'Import trusted device list',
    }
  ),
  pageExportButtonTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.pageExportButtonTitle',
    {
      defaultMessage: 'Export trusted device list',
    }
  ),
  pageExportSuccessToastTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.pageExportSuccessToastTitle',
    {
      defaultMessage: 'Trusted device list exported successfully',
    }
  ),
  pageExportErrorToastTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.pageExportErrorToastTitle',
    {
      defaultMessage: 'Trusted device list export failed',
    }
  ),
  getShowingCountLabel: (total) =>
    i18n.translate('xpack.securitySolution.trustedDevices.list.showingTotal', {
      defaultMessage:
        'Showing {total} {total, plural, one {trusted device} other {trusted devices}}',
      values: { total },
    }),
  cardActionEditLabel: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.cardActionEditLabel',
    {
      defaultMessage: 'Edit trusted device',
    }
  ),
  cardActionDeleteLabel: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.cardActionDeleteLabel',
    {
      defaultMessage: 'Remove from trusted devices list',
    }
  ),
  flyoutCreateTitle: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.flyoutCreateTitle',
    {
      defaultMessage: 'Add trusted device',
    }
  ),
  flyoutEditTitle: i18n.translate('xpack.securitySolution.trustedDevices.list.flyoutEditTitle', {
    defaultMessage: 'Edit trusted device',
  }),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.flyoutCreateSubmitButtonLabel',
    {
      defaultMessage: 'Add trusted device',
    }
  ),
  flyoutCreateSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.trustedDevices.list.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your trusted devices list.',
      values: { name },
    }),
  flyoutEditSubmitSuccess: ({ name }) =>
    i18n.translate('xpack.securitySolution.trustedDevices.list.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
  flyoutDowngradedLicenseDocsInfo: (
    securitySolutionDocsLinks: DocLinks['securitySolution']
  ): React.ReactNode => {
    return (
      <>
        <FormattedMessage
          id="xpack.securitySolution.trustedDevices.list.flyoutDowngradedLicenseDocsInfo"
          defaultMessage="For more information, see our "
        />
        <EuiLink target="_blank" href={`${securitySolutionDocsLinks.trustedDevices}`}>
          <FormattedMessage
            id="xpack.securitySolution.trustedDevices.list.flyoutDowngradedLicenseDocsLink"
            defaultMessage="trusted devices documentation."
          />
        </EuiLink>
      </>
    );
  },
  deleteActionSuccess: (itemName) =>
    i18n.translate('xpack.securitySolution.trustedDevices.list.deleteActionSuccess', {
      defaultMessage: '"{itemName}" has been removed from the trusted devices list',
      values: { itemName },
    }),
  emptyStateTitleNoEntries: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.emptyStateTitleNoEntries',
    {
      defaultMessage: 'There are no trusted devices to display.',
    }
  ),
  emptyStateTitle: i18n.translate('xpack.securitySolution.trustedDevices.list.emptyStateTitle', {
    defaultMessage: 'Add your first trusted device',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.trustedDevices.list.emptyStateInfo', {
    defaultMessage:
      'Add trusted devices to allow specific external devices to connect to your endpoints even when Device Control is enabled.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.emptyStatePrimaryButtonLabel',
    {
      defaultMessage: 'Add trusted device',
    }
  ),
  searchPlaceholderInfo: i18n.translate(
    'xpack.securitySolution.trustedDevices.list.searchPlaceholderInfo',
    {
      defaultMessage: 'Search on the fields below: name, description, value',
    }
  ),
};

export const TrustedDevicesList = memo<TrustedDevicesListProps>((props) => {
  const http = useHttp();
  const isTrustedDevicesEnabled = useIsExperimentalFeatureEnabled('trustedDevices');

  const trustedDevicesListApiClient = TrustedDevicesApiClient.getInstance(http);

  const { canWriteTrustedDevices } = useUserPrivileges().endpointPrivileges;

  if (!isTrustedDevicesEnabled) {
    return null;
  }

  return (
    <ArtifactListPage
      apiClient={trustedDevicesListApiClient}
      ArtifactFormComponent={TrustedDevicesForm}
      labels={TRUSTED_DEVICES_PAGE_LABELS}
      data-test-subj="trustedDevicesList"
      searchableFields={SEARCHABLE_FIELDS}
      secondaryPageInfo={<TrustedDevicesArtifactsDocsLink />}
      allowCardDeleteAction={canWriteTrustedDevices}
      allowCardEditAction={canWriteTrustedDevices}
      allowCardCreateAction={canWriteTrustedDevices}
    />
  );
});

TrustedDevicesList.displayName = 'TrustedDevicesList';
