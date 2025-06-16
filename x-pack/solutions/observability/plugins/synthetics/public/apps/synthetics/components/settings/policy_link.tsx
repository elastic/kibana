/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLink, EuiSkeletonText, EuiToolTip, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../contexts';
import { ClientPluginsStart } from '../../../../plugin';

export const PolicyLink = ({ name }: { name: string }) => {
  const { share, application } = useKibana<ClientPluginsStart>().services;
  const canManageILM = application.capabilities.management?.data?.index_lifecycle_management;

  const ilmLocator = share.url.locators.get(ILM_LOCATOR_ID);

  const { basePath } = useSyntheticsSettingsContext();

  const { data } = useFetcher(async () => {
    return ilmLocator?.getLocation({ page: 'policy_edit', policyName: name });
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Synthetics folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (!data) {
    return <EuiSkeletonText lines={1} />;
  }

  if (!name) {
    return <>{i18n.translate('xpack.synthetics.policyLink.Label', { defaultMessage: '--' })}</>;
  }

  if (!canManageILM) {
    return (
      <EuiToolTip content={PERMISSIONS_NEEDED}>
        <EuiText size="m">{name}</EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiLink
      href={`${basePath}/app/${data.app}${data.path}`}
      target="_blank"
      data-test-subj={name + 'PolicyLink'}
    >
      {name}
    </EuiLink>
  );
};

export const PolicyNameLabel = () => {
  const { application } = useKibana<ClientPluginsStart>().services;

  const canManageILM = application.capabilities.management?.data?.index_lifecycle_management;

  if (canManageILM) {
    return <>{POLICY_LABEL}</>;
  }

  return (
    <>
      {POLICY_LABEL} <EuiIconTip content={PERMISSIONS_NEEDED} position="right" />
    </>
  );
};

const POLICY_LABEL = i18n.translate('xpack.synthetics.settingsRoute.table.policy', {
  defaultMessage: 'Policy',
});

const PERMISSIONS_NEEDED = i18n.translate('xpack.synthetics.settingsRoute.policy.manageILM', {
  defaultMessage: 'You need the "manage_ilm" cluster permission to manage ILM policies.',
});
