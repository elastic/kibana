/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PDFDocument } from 'pdf-lib';
import * as domtoimage from 'dom-to-image-more';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_PAD = 28;
const SCALE = 2;

const includeNode = (node: Node): boolean => {
  if (!(node instanceof Element)) {
    return true;
  }
  return !node.classList.contains('uxRumReportNoPrint');
};

const blobToImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode report image'));
    };
    image.src = url;
  });

const canvasPng = (image: HTMLImageElement, sy: number, sh: number): Promise<ArrayBuffer> => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = Math.max(1, sh);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Canvas is not available'));
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, sy, image.width, sh, 0, 0, image.width, sh);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to encode PDF page'));
        return;
      }
      void blob.arrayBuffer().then(resolve, reject);
    }, 'image/png');
  });
};

/** Capture the on-screen report (including AI narrative) into a paginated A4 PDF. */
export const exportReportPdf = async (root: HTMLElement, filename: string): Promise<void> => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  root.setAttribute('data-ux-exporting', 'true');
  let blob: Blob;
  try {
    blob = await domtoimage.toBlob(root, {
      quality: 1,
      bgcolor: '#ffffff',
      cacheBust: true,
      scale: SCALE,
      style: {
        background: '#ffffff',
        color: '#1d1e24',
      },
      filter: includeNode,
    });
    if (!blob) {
      throw new Error('Unable to capture report');
    }
  } finally {
    root.removeAttribute('data-ux-exporting');
  }

  const image = await blobToImage(blob);
  const contentWidth = A4_WIDTH - PAGE_PAD * 2;
  const contentHeight = A4_HEIGHT - PAGE_PAD * 2;
  const sliceHeightPx = Math.max(1, Math.round(image.width * (contentHeight / contentWidth)));

  const pdf = await PDFDocument.create();
  for (let sy = 0; sy < image.height; sy += sliceHeightPx) {
    const sh = Math.min(sliceHeightPx, image.height - sy);
    const slice = await canvasPng(image, sy, sh);
    const png = await pdf.embedPng(slice);
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const drawHeight = contentWidth * (png.height / png.width);
    page.drawImage(png, {
      x: PAGE_PAD,
      y: A4_HEIGHT - PAGE_PAD - drawHeight,
      width: contentWidth,
      height: drawHeight,
    });
  }

  const bytes = await pdf.save();
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const pdfBlob = new Blob([copy], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
