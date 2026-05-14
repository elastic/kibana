/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import { i18n } from '@kbn/i18n';
import { useToasts } from '../../../common/lib/kibana';

interface Props {
  children: (exportPDF: () => void, isExporting: boolean) => React.ReactNode;
}

const EXPORT_CONTAINER_WIDTH = 1200;

const SiemReadinessExporterComponent: React.FC<Props> = ({ children }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const toasts = useToasts();

  const uiAdjuster = useCallback((eRef: HTMLDivElement) => {
    const exportButton = eRef.querySelector('[data-test-subj="exportReportButton"]');
    const configButton = eRef.querySelector('[data-test-subj="configurationsButton"]');
    const tabNavigation = eRef.querySelector('[data-test-subj="visibilitySectionTabs"]');
    const pageHeader = eRef.querySelector('.euiPageHeader__rightSideItems');

    const elementsToHide = [exportButton, configButton, tabNavigation, pageHeader].filter(Boolean);

    const adjustUI = () => {
      elementsToHide.forEach((e) => {
        if (e) {
          e.setAttribute('data-original-style', e.getAttribute('style') || '');
          (e as HTMLElement).style.display = 'none';
        }
      });
    };

    const restoreUI = () => {
      elementsToHide.forEach((e) => {
        if (e) {
          const original = e.getAttribute('data-original-style');
          if (original) {
            e.setAttribute('style', original);
          } else {
            e.removeAttribute('style');
          }
        }
      });
    };

    return { adjustUI, restoreUI };
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);

    // Wait for export mode view to render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { adjustUI, restoreUI } = uiAdjuster(exportRef.current);
    adjustUI();

    try {
      const scale = 2;
      const element = exportRef.current;

      const blob = await domtoimage.toBlob(element, {
        quality: 1,
        bgcolor: '#ffffff',
        cacheBust: true,
        width: element.offsetWidth * scale,
        height: element.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${element.offsetWidth}px`,
          height: `${element.offsetHeight}px`,
        },
        styleFilter: (style: CSSStyleSheet) => {
          try {
            void style.cssRules;
            return true;
          } catch {
            return false;
          }
        },
      });

      const imageBytes = await blob.arrayBuffer();
      const pdfDoc = await PDFDocument.create();

      const pngImage = await pdfDoc.embedPng(imageBytes);
      const originalWidth = pngImage.width;
      const originalHeight = pngImage.height;

      // Use A4 width but allow variable height for long content
      const pageWidth = 595.28; // A4 width in points
      const padding = 20;
      const maxWidth = pageWidth - padding * 2;

      // Scale image to fit page width
      const pdfScale = maxWidth / originalWidth;
      const imageWidth = originalWidth * pdfScale;
      const imageHeight = originalHeight * pdfScale;

      // Calculate page height based on content (with min A4 height)
      const minPageHeight = 841.89; // A4 height
      const pageHeight = Math.max(minPageHeight, imageHeight + padding * 2);

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const x = (pageWidth - imageWidth) / 2;
      const y = pageHeight - padding - imageHeight;

      page.drawImage(pngImage, {
        x,
        y,
        width: imageWidth,
        height: imageHeight,
      });

      const pdfBytes = await pdfDoc.save();
      // @ts-expect-error upgrade typescript v5.9.3
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `siem-readiness-report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();

      URL.revokeObjectURL(url);

      toasts.addSuccess({
        title: i18n.translate('xpack.securitySolution.siemReadiness.export.success.title', {
          defaultMessage: 'PDF Export Successful',
        }),
        text: i18n.translate('xpack.securitySolution.siemReadiness.export.success.message', {
          defaultMessage: 'SIEM Readiness report has been downloaded.',
        }),
      });
    } catch (err) {
      toasts.addError(err as Error, {
        title: i18n.translate('xpack.securitySolution.siemReadiness.export.error.title', {
          defaultMessage: 'Failed to export SIEM Readiness PDF',
        }),
        toastMessage:
          (err as Error).message ?? 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      restoreUI();
      setIsExporting(false);
    }
  }, [isExporting, toasts, uiAdjuster]);

  return (
    <div
      ref={exportRef}
      style={isExporting ? { width: `${EXPORT_CONTAINER_WIDTH}px`, backgroundColor: '#ffffff' } : {}}
    >
      {children(handleExportPDF, isExporting)}
    </div>
  );
};

export const SiemReadinessExporter = React.memo(SiemReadinessExporterComponent);
