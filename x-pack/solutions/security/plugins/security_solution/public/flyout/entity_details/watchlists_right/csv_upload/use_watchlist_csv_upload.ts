/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { parse } from 'papaparse';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import { validateFile } from './validations';
import { REQUIRED_HEADERS } from './constants';
import type { CsvUploadStatus, ValidatedFile, UploadWatchlistCsvResponse } from './types';

interface UseWatchlistCsvUploadParams {
  watchlistId: string;
}

interface UseWatchlistCsvUploadReturn {
  status: CsvUploadStatus;
  validatedFile?: ValidatedFile;
  uploadResponse?: UploadWatchlistCsvResponse;
  error?: string;
  onFileChange: (fileList: FileList | null) => void;
  onUpload: () => void;
  onReset: () => void;
}

export const useWatchlistCsvUpload = ({
  watchlistId,
}: UseWatchlistCsvUploadParams): UseWatchlistCsvUploadReturn => {
  const [status, setStatus] = useState<CsvUploadStatus>('idle');
  const [validatedFile, setValidatedFile] = useState<ValidatedFile | undefined>();
  const [uploadResponse, setUploadResponse] = useState<UploadWatchlistCsvResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const formatBytes = useFormatBytes();
  const { uploadWatchlistCsv } = useEntityAnalyticsRoutes();

  const onFileChange = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];

      if (!file) {
        setStatus('idle');
        setValidatedFile(undefined);
        setError(undefined);
        return;
      }

      setStatus('validating');
      setError(undefined);

      const fileValidation = validateFile(file, formatBytes);
      if (!fileValidation.valid) {
        setStatus('error');
        setError(fileValidation.errorMessage);
        return;
      }

      parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 1,
        transformHeader: (h: string) => h.trim().toLowerCase(),
        complete(parsed) {
          const headers = parsed.meta.fields ?? [];
          const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

          if (missingHeaders.length > 0) {
            setStatus('error');
            setError(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.missingHeaders',
                {
                  defaultMessage:
                    'CSV is missing required column headers: {columns}. The file must contain a "type" column.',
                  values: { columns: missingHeaders.join(', ') },
                }
              )
            );
            return;
          }

          const identityColumns = headers.filter((h) => !REQUIRED_HEADERS.includes(h));
          if (identityColumns.length === 0) {
            setStatus('error');
            setError(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.noIdentityColumns',
                {
                  defaultMessage:
                    'CSV must have at least one identity column besides "type" (e.g., user.name, host.hostname).',
                }
              )
            );
            return;
          }

          // Count rows by reading the file line by line (excluding header and empty lines)
          const reader = new FileReader();
          reader.onload = () => {
            const text = reader.result as string;
            const rowCount = text.split('\n').filter((line) => line.trim().length > 0).length - 1; // subtract header

            if (rowCount <= 0) {
              setStatus('error');
              setError(
                i18n.translate(
                  'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.noDataRows',
                  { defaultMessage: 'The file contains no data rows.' }
                )
              );
              return;
            }

            setValidatedFile({
              file,
              name: file.name,
              size: file.size,
              rowCount,
              headers,
            });
            setStatus('ready');
          };
          reader.onerror = () => {
            setStatus('error');
            setError(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.readError',
                { defaultMessage: 'Failed to read the file.' }
              )
            );
          };
          reader.readAsText(file);
        },
        error(err) {
          setStatus('error');
          setError(err.message);
        },
      });
    },
    [formatBytes]
  );

  const onUpload = useCallback(async () => {
    if (!validatedFile) return;

    setStatus('uploading');
    setError(undefined);

    try {
      const result = await uploadWatchlistCsv(watchlistId, validatedFile.file);
      setUploadResponse(result);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  }, [validatedFile, uploadWatchlistCsv, watchlistId]);

  const onReset = useCallback(() => {
    setStatus('idle');
    setValidatedFile(undefined);
    setUploadResponse(undefined);
    setError(undefined);
  }, []);

  return {
    status,
    validatedFile,
    uploadResponse,
    error,
    onFileChange,
    onUpload,
    onReset,
  };
};
