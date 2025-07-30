/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image-more';
import { useToasts } from '../../common/lib/kibana';

interface Props {
  children: (exportPDF: () => void) => React.ReactNode;
}

const ValueReportExporterComponent: React.FC<Props> = ({ children }) => {
  const exportRef = useRef<HTMLDivElement>(null);

  const toasts = useToasts();
  const uiAdjuster = useCallback((eRef: HTMLDivElement) => {
    const badgeEls = eRef.querySelectorAll('.euiBadge');
    const badgeTextEls = eRef.querySelectorAll('.euiBadge__text');
    const exportButton = eRef.querySelector('.exportPdfButton');

    const adjustUI = () => {
      badgeEls.forEach((el) => {
        el.setAttribute('data-original-style', el.getAttribute('style') || '');
        (el as HTMLElement).style.backgroundColor = 'transparent';
      });
      badgeTextEls.forEach((el) => {
        el.setAttribute('data-original-style', el.getAttribute('style') || '');
        (el as HTMLElement).style.color = 'black';
      });
      if (exportButton) {
        exportButton.setAttribute('data-original-style', exportButton.getAttribute('style') || '');
        (exportButton as HTMLElement).style.display = 'none';
      }
    };

    const restoreUI = () => {
      badgeEls.forEach((el) => {
        const original = el.getAttribute('data-original-style');
        if (original) {
          el.setAttribute('style', original);
        } else {
          el.removeAttribute('style');
        }
      });
      badgeTextEls.forEach((el) => {
        const original = el.getAttribute('data-original-style');
        if (original) {
          el.setAttribute('style', original);
        } else {
          el.removeAttribute('style');
        }
      });
      if (exportButton) {
        const original = exportButton.getAttribute('data-original-style');
        if (original) {
          exportButton.setAttribute('style', original);
        } else {
          exportButton.removeAttribute('style');
        }
      }
    };

    return { adjustUI, restoreUI };
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!exportRef.current) return;

    const { adjustUI, restoreUI } = uiAdjuster(exportRef.current);
    adjustUI();

    try {
      const dataUrl = await domtoimage.toPng(exportRef.current, {
        quality: 1,
        bgcolor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const pdf = new jsPDF('portrait', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const padding = 20;
        const imgWidth = pageWidth - padding * 2;
        const imgHeight = (img.height * imgWidth) / img.width;

        let position = 0;
        let heightLeft = imgHeight;

        while (heightLeft > 0) {
          pdf.addImage(dataUrl, 'PNG', padding, position + padding, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          position -= pageHeight;
          if (heightLeft > 0) pdf.addPage();
        }

        const date = new Date().toISOString();
        pdf.save(`value-report-${date}.pdf`);
      };
    } catch (err) {
      toasts.addError(err, {
        title: 'Failed to export value report PDF',
        toastMessage: err.message ?? 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      restoreUI();
    }
  }, [toasts, uiAdjuster]);

  return <div ref={exportRef}>{children(handleExportPDF)}</div>;
};

export const ValueReportExporter = React.memo(ValueReportExporterComponent);
