/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import {
  SloOverviewDetailsContent,
  SloOverviewDetailsFlyoutFooter,
} from '../../../embeddable/slo/common/slo_overview_details';

export interface SLODetailsFlyoutProps {
  sloId: string;
  sloInstanceId?: string;
  onClose: () => void;
}

// eslint-disable-next-line import/no-default-export
export default function SLODetailsFlyout({ sloId, sloInstanceId, onClose }: SLODetailsFlyoutProps) {
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

  // Determine if SLO was not found (success but no data)
  const isNotFound = isSuccess && !slo;

  // Determine the title based on state
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
    return slo?.name ?? '';
  };

  // Render the body content based on state
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

    // Success state - use the shared content component
    return <SloOverviewDetailsContent slo={slo} />;
  };

  // Render footer based on state
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

    // Success state - use the shared footer component
    return <SloOverviewDetailsFlyoutFooter slo={slo} onClose={onClose} />;
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder={!slo}>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{getTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
}
