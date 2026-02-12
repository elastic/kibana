/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { css } from '@emotion/css';
import { useSyncTimerangeUrlParam } from '../../common/hooks/search_bar/use_sync_timerange_url_param';
import { ValueReportExporter } from '../components/ai_value/value_report_exporter';
import { EXPORT_REPORT } from '../components/ai_value/translations';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { SuperDatePicker } from '../../common/components/super_date_picker';
import { AIValueMetrics } from '../components/ai_value';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import * as i18n from './translations';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { inputsSelectors } from '../../common/store';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useKibana } from '../../common/lib/kibana';
import { useDownloadAIValueReport } from '../hooks/use_download_ai_value_report';
import {
  AIValueExportProvider,
  useAIValueExportContext,
} from '../providers/ai_value/export_provider';

/**
 * The dashboard includes key performance metrics such as:
 * Cost savings (e.g., based on time saved × analyst hourly rate)
 * Analyst time saved (e.g., minutes saved per alert × volume)
 * Total alerts filtered vs escalated
 * Real attacks detected by AI
 * Alert response time trends
 *
 * Metrics are calculated using dynamic values from the user’s actual data and can be customized per deployment.
 * Visualizations are executive-friendly: concise, interactive, and exportable.
 * Time range selection and historical trend views are supported.
 * Data sources and calculation methods are transparent and documented for auditability.
 */

const BaseComponent = () => {
  const exportContext = useAIValueExportContext();
  const isExportMode = exportContext?.isExportMode === true;
  const timerange = useDeepEqualSelector(inputsSelectors.valueReportTimeRangeSelector);
  const { from, to } = timerange;

  const { status } = useDataView();

  const hasSocManagementCapability = useHasSecurityCapability('socManagement');

  const [hasAttackDiscoveries, setHasAttackDiscoveries] = useState(false);
  const exportPDFRef = useRef<(() => void) | null>(null);

  const { serverless } = useKibana().services;
  const isServerless = !!serverless;

  const [exportButtonElement, setExportButtonElement] = useState<
    HTMLAnchorElement | HTMLButtonElement | null
  >(null);

  // since we do not have a search bar in the AI Value page, we need to sync the timerange
  useSyncTimerangeUrlParam();

  const { toggleContextMenu, isExportEnabled } = useDownloadAIValueReport({
    anchorElement: exportButtonElement,
    timeRange: timerange,
  });

  const exportButton = useMemo(
    () =>
      isServerless ? (
        <EuiButtonEmpty
          className="exportPdfButton"
          iconType="export"
          onClick={() => exportPDFRef.current?.()}
          size="s"
          aria-label={EXPORT_REPORT}
        >
          {EXPORT_REPORT}
        </EuiButtonEmpty>
      ) : (
        <EuiButtonEmpty
          className="exportPdfButton"
          iconType="export"
          buttonRef={setExportButtonElement}
          size="s"
          aria-label={EXPORT_REPORT}
          onClick={toggleContextMenu}
          isLoading={!isExportEnabled}
        >
          {EXPORT_REPORT}
        </EuiButtonEmpty>
      ),
    [isServerless, isExportEnabled, toggleContextMenu]
  );

  if (!hasSocManagementCapability) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <SecuritySolutionPageWrapper
      data-test-subj="aiValuePage"
      className={css`
        max-width: 1440px;
        margin: 0 auto;
      `}
      data-shared-items-container
      // This indicate the number of elements that the export logic should wait for before taking a screenshot of the page
      // 6 lens components and 1 AI generated key insight
      data-shared-items-count="7"
    >
      {!isExportMode && (
        <HeaderPage
          title={i18n.AI_VALUE_DASHBOARD}
          rightSideItems={[
            <SuperDatePicker
              id={InputsModelId.valueReport}
              showUpdateButton="iconOnly"
              width="auto"
              compressed
            />,
            ...(hasAttackDiscoveries ? [exportButton] : []),
          ]}
        />
      )}
      {status !== 'ready' ? (
        <EuiLoadingSpinner size="l" data-test-subj="aiValueLoader" />
      ) : (
        <EuiFlexGroup direction="column" data-test-subj="aiValueSections">
          <EuiFlexItem>
            <ValueReportExporter>
              {(exportPDF) => {
                // Store the export function in the ref
                exportPDFRef.current = exportPDF;

                return (
                  <AIValueMetrics
                    from={from}
                    to={to}
                    setHasAttackDiscoveries={setHasAttackDiscoveries}
                  />
                );
              }}
            </ValueReportExporter>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </SecuritySolutionPageWrapper>
  );
};

const AIValueComponent = () => (
  <AIValueExportProvider>
    <BaseComponent />
  </AIValueExportProvider>
);

export const AIValue = React.memo(AIValueComponent);
