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
import type { SloTabId } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
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
  const {
    http: { basePath },
  } = useKibana().services;

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
    ? basePath.prepend(paths.sloDetails(slo.id, slo.instanceId))
    : undefined;

  const getTitle = () => {
    if (isError) {
      return i18n.translate('xpack.slo.sloDetailsFlyout.errorTitle', {
        defaultMessage: 'Unable to load SLO',
      });
    }
    if (isNotFound) {
      return i18n.translate('xpack.slo.sloDetailsFlyout.notFoundTitle', {
        defaultMessage: 'SLO not found',
      });
    }
    if (isLoading) {
      return i18n.translate('xpack.slo.sloDetailsFlyout.loadingTitle', {
        defaultMessage: 'Loading SLO...',
      });
    }
    if (slo && sloDetailsUrl) {
      return (
        <EuiLink href={sloDetailsUrl} data-test-subj="sloDetailsFlyoutTitleLink" target="_blank">
          {slo.name}
        </EuiLink>
      );
    }
    return slo?.name ?? '';
  };

  const renderBody = () => {
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
  };

  const renderFooter = () => {
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
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size={size} session={session}>
      <EuiFlyoutHeader hasBorder={!slo}>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{getTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      {!hideFooter && <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>}
    </EuiFlyout>
  );
}
