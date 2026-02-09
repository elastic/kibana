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
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import type { SloTabId } from '@kbn/deeplinks-observability';
import { OVERVIEW_TAB_ID } from '@kbn/deeplinks-observability';
import { HeaderTitle } from '../../../pages/slo_details/components/header_title';
import { SloDetails } from '../../../pages/slo_details/components/slo_details';
import { useSloDetailsTabs } from '../../../pages/slo_details/hooks/use_slo_details_tabs';
import { getSloFormattedSummary } from '../../../pages/slos/hooks/use_slo_summary';
import { useKibana } from '../../../hooks/use_kibana';

export interface SloOverviewDetailsContentProps {
  slo: SLOWithSummaryResponse;
  initialTabId?: SloTabId;
}

export function SloOverviewDetailsContent({
  slo,
  initialTabId = OVERVIEW_TAB_ID,
}: SloOverviewDetailsContentProps) {
  const [selectedTabId, setSelectedTabId] = useState<SloTabId>(initialTabId);

  const { tabs } = useSloDetailsTabs({
    slo,
    isAutoRefreshing: false,
    selectedTabId,
    setSelectedTabId,
  });

  return (
    <>
      <HeaderTitle slo={slo} isLoading={false} />
      <EuiTabs>
        {tabs.map(({ id, label, ...tab }) => (
          <EuiTab key={id} {...tab} isSelected={id === selectedTabId}>
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      <SloDetails slo={slo} isAutoRefreshing={false} selectedTabId={selectedTabId} />
    </>
  );
}

export interface SloOverviewDetailsFlyoutFooterProps {
  slo: SLOWithSummaryResponse;
  onClose: () => void;
}

export function SloOverviewDetailsFlyoutFooter({
  slo,
  onClose,
}: SloOverviewDetailsFlyoutFooterProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
  } = useKibana().services;

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButton data-test-subj="o11ySloOverviewDetailsCloseButton" onClick={onClose}>
          {i18n.translate('xpack.slo.sloOverviewDetails.button.closeLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={() => {
            const { sloDetailsUrl } = getSloFormattedSummary(slo, uiSettings, basePath);
            navigateToUrl(sloDetailsUrl);
          }}
          data-test-subj="o11ySloOverviewDetailsDetailsButton"
        >
          {i18n.translate('xpack.slo.sloOverviewDetails.button.detailsLabel', {
            defaultMessage: 'Details',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function SloOverviewDetails({
  slo,
  setSelectedSlo,
}: {
  slo: SLOWithSummaryResponse | null;
  setSelectedSlo: (slo: SLOWithSummaryResponse | null) => void;
}) {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'sloOverviewFlyout',
  });

  const onClose = () => {
    setSelectedSlo(null);
  };

  if (!slo) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.slo.sloOverviewDetails.h2.detailsLabel', {
              defaultMessage: '{sloName}',
              values: { sloName: slo.name },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SloOverviewDetailsContent slo={slo} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <SloOverviewDetailsFlyoutFooter slo={slo} onClose={onClose} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
