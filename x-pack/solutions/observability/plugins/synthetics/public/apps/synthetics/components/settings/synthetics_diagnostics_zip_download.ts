/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import JSZip from 'jszip';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../utils/kibana_service';
import {
  getDiagnosticsSectionKeysInOrder,
  jsonStringifyDiagnostics,
} from './synthetics_diagnostics_utils';

const ZIP_ROOT_FOLDER = 'synthetics-diagnostics';

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadSyntheticsDiagnosticsZip = async (
  payload: Record<string, unknown>
): Promise<void> => {
  const zip = new JSZip();
  const root = zip.folder(ZIP_ROOT_FOLDER);
  if (!root) {
    throw new Error('Unable to create ZIP folder');
  }

  const keys = getDiagnosticsSectionKeysInOrder(payload);
  for (const key of keys) {
    root.file(`${key}.json`, jsonStringifyDiagnostics(payload[key]));
  }

  root.file(
    'README.txt',
    [
      'Synthetics diagnostics bundle',
      `Generated (UTC): ${new Date().toISOString()}`,
      `Sections: ${keys.join(', ')}`,
      '',
      'Each section is a separate JSON file. Values are redacted on the server; do not expect secrets in this export.',
    ].join('\n')
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `synthetics-diagnostics-${dateStamp}.zip`);
};

export const showDiagnosticsZipErrorToast = (error: unknown) => {
  kibanaService.toasts.addDanger({
    title: i18n.translate('xpack.synthetics.diagnostics.zipErrorTitle', {
      defaultMessage: 'Could not create diagnostics ZIP',
    }),
    text:
      error instanceof Error
        ? error.message
        : i18n.translate('xpack.synthetics.diagnostics.zipErrorUnknown', {
            defaultMessage: 'An unexpected error occurred.',
          }),
  });
};
