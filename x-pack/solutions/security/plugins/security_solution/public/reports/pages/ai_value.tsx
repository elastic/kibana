/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  EuiContext,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { css } from '@emotion/css';
import { css as cssReact } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useNavigation } from '@kbn/security-solution-navigation';
import { useSyncTimerangeUrlParam } from '../../common/hooks/search_bar/use_sync_timerange_url_param';
import { ValueReportExporter } from '../components/ai_value/value_report_exporter';
import {
  EXPORT_REPORT,
  SAMPLE_REPORT_DATE_PICKER_DISABLED_TOOLTIP,
  SETTINGS,
} from '../components/ai_value/translations';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { SuperDatePicker } from '../../common/components/super_date_picker';
import { AIValueReport } from '../components/ai_value';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import * as i18n from './translations';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { inputsSelectors } from '../../common/store';
import { useHasSecurityCapability } from '../../helper_hooks';
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
  const { euiTheme } = useEuiTheme();
  const { navigateTo } = useNavigation();

  const { status } = useDataView();

  const isSourcererLoading = status !== 'ready';

  const hasSocManagementCapability = useHasSecurityCapability('socManagement');

  const [hasReportData, setHasReportData] = useState(false);
  const [isDatePickerDisabled, setIsDatePickerDisabled] = useState(true);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const exportPDFRef = useRef<(() => void) | null>(null);

  // since we do not have a search bar in the AI Value page, we need to sync the timerange
  useSyncTimerangeUrlParam();

  const { openExportMenu, isExportEnabled, isServerless } = useDownloadAIValueReport({
    timeRange: timerange,
  });

  const goToValueReportSettings = useCallback(() => {
    navigateTo({ appId: 'management', path: '/kibana/settings?query=defaultValueReport' });
  }, [navigateTo]);

  // Order matches Old/Figma: Export PDF → Settings → kebab → date picker.
  // Export + Settings are visible items (not primary) so they sit left of the kebab;
  // the date picker sits in a sticky sibling slot to the right of AppMenu.
  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'exportReport',
          label: EXPORT_REPORT,
          iconType: 'export',
          testId: 'aiValueExportButton',
          disableButton: !hasReportData || (!isServerless && !isExportEnabled),
          run: (params) => {
            if (isServerless) {
              exportPDFRef.current?.();
              return;
            }
            if (params?.triggerElement) {
              openExportMenu(params.triggerElement);
            }
          },
        },
        {
          id: 'valueReportSettings',
          label: SETTINGS,
          iconType: 'gear',
          testId: 'aiValueSettingsButton',
          run: () => {
            goToValueReportSettings();
          },
        },
      ],
    }),
    [goToValueReportSettings, hasReportData, isExportEnabled, isServerless, openExportMenu]
  );

  const datePicker = useMemo(
    () =>
      isSampleMode ? (
        <EuiContext
          i18n={{
            mapping: {
              'euiSuperUpdateButton.cannotUpdateTooltip': SAMPLE_REPORT_DATE_PICKER_DISABLED_TOOLTIP,
            },
          }}
        >
          <SuperDatePicker
            id={InputsModelId.valueReport}
            showUpdateButton="iconOnly"
            width="auto"
            compressed
            disabled={isSourcererLoading || isDatePickerDisabled}
          />
        </EuiContext>
      ) : (
        <SuperDatePicker
          id={InputsModelId.valueReport}
          showUpdateButton="iconOnly"
          width="auto"
          compressed
          disabled={isSourcererLoading || isDatePickerDisabled}
        />
      ),
    [isSampleMode, isSourcererLoading, isDatePickerDisabled]
  );

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  const chromeNextPage = cssReact`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  // Flex row owns the full-bleed divider (same edge-to-edge border as AppHeader bleed).
  // Date picker sits in-flow after the kebab with only `gap` — no reserved absolute slot.
  const headerWithDatePicker = cssReact`
    position: sticky;
    top: 0;
    z-index: ${euiTheme.levels.mask};
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    margin-inline: -${euiTheme.size.base};
    margin-top: -${euiTheme.size.base};
    padding-inline: ${euiTheme.size.base};
    background: ${euiTheme.colors.backgroundBasePlain};
    border-bottom: ${euiTheme.border.thin};
    margin-bottom: -${euiTheme.border.width.thin};

    [data-test-subj='appHeader'] {
      flex: 1;
      min-width: 0;
      border-bottom: none;
      margin-bottom: 0;
    }
  `;

  if (!hasSocManagementCapability) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  if (status === 'pristine') {
    return <PageLoader />;
  }

  if (status === 'error') {
    return (
      <SecuritySolutionPageWrapper data-test-subj="aiValuePage">
        <EuiEmptyPrompt
          color="danger"
          iconType="error"
          title={<h2>{i18n.AI_VALUE_LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.AI_VALUE_LOAD_ERROR_BODY}</p>}
        />
      </SecuritySolutionPageWrapper>
    );
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
      <div css={chromeNextPage}>
        {!isExportMode && (
          <div css={headerWithDatePicker}>
            {/* [Chrome Next] Migrated header — Export PDF → Settings → kebab → date picker. */}
            <AppHeader
              title={i18n.AI_VALUE_DASHBOARD}
              menu={menu}
              spacing="flush"
              sticky={false}
            />
            <div data-test-subj="aiValueHeaderDatePicker">{datePicker}</div>
          </div>
        )}
        {/* 16px between header and report body (Figma page grid). */}
        {!isExportMode && <EuiSpacer size="m" />}
        <EuiFlexGroup direction="column" data-test-subj="aiValueSections">
          <EuiFlexItem>
            <ValueReportExporter>
              {(exportPDF) => {
                // Store the export function in the ref
                exportPDFRef.current = exportPDF;

                return (
                  <AIValueReport
                    from={from}
                    to={to}
                    setHasReportData={setHasReportData}
                    setIsDatePickerDisabled={setIsDatePickerDisabled}
                    setIsSampleMode={setIsSampleMode}
                    isSourcererLoading={isSourcererLoading}
                  />
                );
              }}
            </ValueReportExporter>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </SecuritySolutionPageWrapper>
  );
};

const AIValueComponent = () => (
  <AIValueExportProvider>
    <BaseComponent />
  </AIValueExportProvider>
);

export const AIValue = React.memo(AIValueComponent);
