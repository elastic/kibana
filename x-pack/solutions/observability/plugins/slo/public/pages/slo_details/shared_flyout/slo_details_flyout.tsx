/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  euiContainerCSS,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSelect,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { SloTabId, SloDetailsLocatorParams } from '@kbn/deeplinks-observability';
import { sloDetailsLocatorID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import moment from 'moment';
import { SloStateBadge, SloStatusBadge, SloValueBadge } from '../../../components/slo/slo_badges';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useKibana } from '../../../hooks/use_kibana';
import { SloOverviewDetailsFlyoutFooter } from '../../../embeddable/slo/common/slo_overview_details';
import { useSloDetailsTabs } from '../hooks/use_slo_details_tabs';
import { SloDetails } from '../components/slo_details';
import { SloRemoteBadge } from '../../slos/components/badges/slo_remote_badge';
import { SloTagsBadge } from '../../../components/slo/slo_badges/slo_tags_badge';

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

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.slo.sloDetailsFlyout.header.notAvailableLabel', {
  defaultMessage: 'n/a',
});

// eslint-disable-next-line import/no-default-export
export default function SLODetailsFlyout({
  sloId,
  sloInstanceId,
  onClose,
  size = 'm',
  hideFooter = false,
  session = 'inherit',
  initialTabId = 'overview',
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

  const [selectedTabId, setSelectedTabId] = useState<SloTabId>(initialTabId);
  const { tabs } = useSloDetailsTabs({
    slo,
    isAutoRefreshing: false,
    selectedTabId,
    setSelectedTabId,
  });

  const isNotFound = isSuccess && !slo;

  const sloDetailsUrl = slo
    ? share?.url.locators
        .get<SloDetailsLocatorParams>(sloDetailsLocatorID)
        ?.getRedirectUrl({ sloId: slo.id, instanceId: slo.instanceId })
    : undefined;

  const renderHeader = () => {
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
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconSide="left" iconType="visGauge">
                {i18n.translate('xpack.slo.sloDetailsFlyout.sloBadgeLabel', {
                  defaultMessage: 'SLO',
                })}
              </EuiBadge>
            </EuiFlexItem>
            <SloValueBadge slo={slo} />
            <SloStatusBadge slo={slo} />
            <SloStateBadge slo={slo} />
            <SloRemoteBadge slo={slo} />
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3 id={flyoutTitleId}>
                  <EuiLink
                    href={sloDetailsUrl}
                    data-test-subj="sloDetailsFlyoutTitleLink"
                    target="_blank"
                  >
                    {slo.name}
                  </EuiLink>
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiMarkdownFormat textSize="xs" color="subdued">
                {i18n.translate('xpack.slo.sloDetailsFlyout.header.lastUpdatedLabel', {
                  defaultMessage: 'Last updated by **{updatedBy}** on **{updatedAt}**',
                  values: {
                    updatedBy: slo.updatedBy ?? NOT_AVAILABLE_LABEL,
                    updatedAt: moment(slo.updatedAt).format('ll'),
                  },
                })}
              </EuiMarkdownFormat>
            </EuiFlexItem>
          </EuiFlexGroup>
          {slo.tags.length > 0 && (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={true}>
              <SloTagsBadge slo={slo} color="hollow" />
            </EuiFlexGroup>
          )}
          {(slo.indicator.type === 'sli.apm.transactionDuration' ||
            slo.indicator.type === 'sli.apm.transactionErrorRate') && (
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  data-test-subj="sloDetailsFlyoutTransactionNameSelect"
                  value={slo.indicator.params.transactionName}
                  options={[
                    {
                      value: slo.indicator.params.transactionName,
                      text: slo.indicator.params.transactionName,
                    },
                  ]}
                  prepend="Transaction name"
                  aria-label={i18n.translate(
                    'xpack.slo.sloDetailsFlyout.header.select.transactionNameLabel',
                    { defaultMessage: 'Transaction name' }
                  )}
                  compressed
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiTabs bottomBorder={false} expand>
            {tabs.map(({ id, label, ...tab }) => (
              <EuiTab key={id} {...tab} isSelected={id === selectedTabId}>
                {label}
              </EuiTab>
            ))}
          </EuiTabs>
        </EuiFlexGroup>
      );
    }

    return slo?.name ?? '';
  };

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

    return <SloDetails slo={slo} isAutoRefreshing={false} selectedTabId={selectedTabId} isFlyout />;
  }, [sloId, isError, isNotFound, isLoading, slo, selectedTabId]);

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
      paddingSize="m"
      css={
        isSuccess && !!slo
          ? css`
              .euiFlyoutHeader {
                /* 
                Remove padding at the bottom of the flyout header when the SLO has loaded
                so the tabs are visually connected to the header border.
                */
                padding-block-end: 0px;
              }
            `
          : undefined
      }
    >
      <EuiFlyoutHeader hasBorder>{renderHeader()}</EuiFlyoutHeader>
      <EuiFlyoutBody css={euiContainerCSS('inline-size')}>{renderBody()}</EuiFlyoutBody>
      {!hideFooter && <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>}
    </EuiFlyout>
  );
}
