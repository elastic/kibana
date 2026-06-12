/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import { useToasts } from '../../../common/lib/kibana';

interface Props {
  children: (exportPDF: () => void) => React.ReactNode;
}

const ValueReportExporterComponent: React.FC<Props> = ({ children }) => {
  const exportRef = useRef<HTMLDivElement>(null);

  const toasts = useToasts();
  const uiAdjuster = useCallback((eRef: HTMLDivElement) => {
    const valueReportSettings = eRef.querySelector('.valueReportSettings');
    const editTitleSvg = eRef.querySelector('.executiveSummaryTitle svg');
    const elementsToHide = [valueReportSettings, editTitleSvg];

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
    if (!exportRef.current) return;

    const { adjustUI, restoreUI } = uiAdjuster(exportRef.current);
    adjustUI();

    try {
      const scale = 2;

      const blob = await domtoimage.toBlob(exportRef.current, {
        quality: 1,
        bgcolor: '#ffffff',
        cacheBust: true,
        width: exportRef.current.offsetWidth * scale,
        height: exportRef.current.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${exportRef.current.offsetWidth}px`,
          height: `${exportRef.current.offsetHeight}px`,
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
      const pageWidth = 595.28; // A4 width
      const pageHeight = 841.89; // A4 height
      const padding = 20;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const pngImage = await pdfDoc.embedPng(imageBytes);

      const originalWidth = pngImage.width;
      const originalHeight = pngImage.height;

      const maxWidth = pageWidth - padding * 2;
      const maxHeight = pageHeight - padding * 2;

      const widthScale = maxWidth / originalWidth;
      const heightScale = maxHeight / originalHeight;
      const pdfScale = Math.min(widthScale, heightScale);

      const imageWidth = originalWidth * pdfScale;
      const imageHeight = originalHeight * pdfScale;

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
      a.download = `value-report-${new Date().toISOString()}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
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
