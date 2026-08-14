/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, Global } from '@emotion/react';
import React from 'react';

/** Hides Kibana chrome and flattens page flex/grid so print is the report, not the shell. */
export function RumReportPrintStyles() {
  return (
    <Global
      styles={css`
        .uxRumCountryMapPrint {
          display: none;
        }

        @media print {
          @page {
            margin: 14mm;
          }

          html,
          body,
          .kbnBody,
          #kibana-body,
          #kibana-body > div,
          .kbnChromeLayoutApplication,
          .kbnChromeLayoutApplication > *,
          .kbnAppWrapper,
          .kbnPageTemplate,
          .kbnPageTemplate > *,
          .euiPage,
          .euiPageBody,
          .euiPageSection,
          [class*='euiPageOuter'],
          [class*='euiPageInner'] {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            float: none !important;
            flex: none !important;
            grid-template: none !important;
            grid-template-columns: none !important;
            grid-template-rows: none !important;
            background: #fff !important;
            color: #000 !important;
          }

          .kbnChromeLayoutHeader,
          .kbnChromeLayoutNavigation,
          .kbnChromeLayoutSidebar,
          .kbnChromeLayoutBanner,
          .kbnChromeLayoutFooter,
          .headerGlobalNav,
          .euiHeader,
          .euiPageHeader,
          .euiPageSidebar,
          [class*='euiPageSidebar'],
          .kbnSolutionNav,
          .kbnSolutionNav__sidebar,
          .euiFlyout,
          .euiCollapsibleNav,
          .euiBottomBar,
          .euiToast,
          .euiOverlayMask,
          [data-test-subj='globalToastList'],
          [data-test-subj='headerGlobalNav'],
          [data-test-subj='kbnAppWrapper'] > header,
          .uxRumReportNoPrint {
            display: none !important;
          }

          .euiBody--headerIsFixed {
            padding-top: 0 !important;
          }

          .uxRumReportRoot {
            color: #000;
            background: #fff;
            width: 100% !important;
          }

          .uxRumReportRoot .euiPanel {
            box-shadow: none !important;
            break-inside: avoid;
          }

          .uxRumReportCover,
          .uxRumReportKpis {
            break-inside: avoid;
          }

          .uxRumReportKpis {
            break-after: page;
          }

          .uxRumReportCoverTitle {
            min-width: 12em;
            flex: 1 1 auto !important;
          }

          .uxRumReportCoverTitle h2 {
            word-break: normal;
            overflow-wrap: break-word;
            white-space: normal;
          }

          .uxRumRankChip {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: #fff !important;
          }

          .uxRumSessionChip {
            break-inside: avoid;
          }

          .uxRumCountryMapPrint {
            display: block !important;
          }

          .uxRumCountryMapCanvas,
          .maplibregl-map,
          .mapEmbeddableContainer {
            display: none !important;
          }
        }
      `}
    />
  );
}
