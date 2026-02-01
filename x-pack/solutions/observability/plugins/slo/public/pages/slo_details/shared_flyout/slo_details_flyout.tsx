/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { SloTabId, SloDetailsLocatorParams } from '@kbn/deeplinks-observability';
import { sloDetailsLocatorID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useKibana } from '../../../hooks/use_kibana';
import {
  SloOverviewDetailsContent,
  SloOverviewDetailsFlyoutFooter,
} from '../../../embeddable/slo/common/slo_overview_details';

export interface SLODetailsFlyoutProps {
  sloId: string;
  sloInstanceId?: string;
  onClose: () => void;
  size?: EuiFlyoutProps['size'];
  hideFooter?: boolean;
  session?: 'start' | 'inherit';
  initialTabId?: SloTabId;
}

const TITLES = {
  error: i18n.translate('xpack.slo.sloDetailsFlyout.errorTitle', {
    defaultMessage: 'Unable to load SLO',
  }),
  notFound: i18n.translate('xpack.slo.sloDetailsFlyout.notFoundTitle', {
    defaultMessage: 'SLO not found',
  }),
  loading: i18n.translate('xpack.slo.sloDetailsFlyout.loadingTitle', {
    defaultMessage: 'Loading SLO...',
  }),
};

// eslint-disable-next-line import/no-default-export
export default function SLODetailsFlyout({
  sloId,
  sloInstanceId,
  onClose,
  size = 'm',
  hideFooter = false,
  session = 'inherit',
  initialTabId,
}: SLODetailsFlyoutProps) {
  const { share } = useKibana().services;

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'sloDetailsFlyout',
  });

  const {
    data: slo,
    isLoading,
    isError,
    isSuccess,
  } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
    shouldRefetch: false,
  });

  const isNotFound = isSuccess && !slo;

  const sloDetailsUrl = slo
    ? share?.url.locators
        .get<SloDetailsLocatorParams>(sloDetailsLocatorID)
        ?.getRedirectUrl({ sloId: slo.id, instanceId: slo.instanceId })
    : undefined;

  const title = useMemo(() => {
    if (isError) {
      return TITLES.error;
    }
    if (isNotFound) {
      return TITLES.notFound;
    }
    if (isLoading) {
      return TITLES.loading;
    }
    if (slo && sloDetailsUrl) {
      return (
        <EuiLink href={sloDetailsUrl} data-test-subj="sloDetailsFlyoutTitleLink" target="_blank">
          {slo.name}
        </EuiLink>
      );
    }
    return slo?.name ?? '';
  }, [isError, isNotFound, isLoading, slo, sloDetailsUrl]);

  const renderBody = useCallback(() => {
    if (isError) {
      return (
        <p>
          {i18n.translate('xpack.slo.sloDetailsFlyout.errorMessage', {
            defaultMessage: 'There was an error loading the SLO details. Please try again.',
          })}
        </p>
      );
    }

    if (isNotFound) {
      return (
        <EuiFlexGroup direction="column" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.slo.sloDetailsFlyout.notFoundMessage', {
                  defaultMessage: 'The requested SLO could not be found',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <p>
              {i18n.translate('xpack.slo.sloDetailsFlyout.notFoundDescription', {
                defaultMessage:
                  'The SLO with ID "{sloId}" does not exist or you do not have permission to view it.',
                values: { sloId },
              })}
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!slo) {
      return null;
    }

    return <SloOverviewDetailsContent slo={slo} initialTabId={initialTabId} />;
  }, [sloId, isError, isNotFound, isLoading, slo, initialTabId]);

  const renderFooter = useCallback(() => {
    if (isError || isNotFound || isLoading || !slo) {
      return (
        <EuiButton data-test-subj="sloDetailsFlyoutCloseButton" onClick={onClose}>
          {i18n.translate('xpack.slo.sloDetailsFlyout.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      );
    }

    return <SloOverviewDetailsFlyoutFooter slo={slo} onClose={onClose} />;
  }, [isError, isNotFound, isLoading, slo, onClose]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size={size}
      session={session}
      resizable
    >
      <EuiFlyoutHeader hasBorder={!slo}>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      {!hideFooter && <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>}
    </EuiFlyout>
  );
}
