/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { FILE_UPLOAD_ERROR } from '../translations/file_upload_error';

export interface SplunkRow<T extends object = object> {
  result: T;
}

export type OnFileParsed = (content: SplunkRow[]) => void;

export const useParseFileInput = (onFileParsed: OnFileParsed) => {
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const parseFile = useCallback(
    (files: FileList | null) => {
      setError(undefined);

      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      const reader = new FileReader();

      reader.onloadstart = () => setIsParsing(true);
      reader.onloadend = () => setIsParsing(false);

      reader.onload = function (e) {
        // We can safely cast to string since we call `readAsText` to load the file.
        const fileContent = e.target?.result as string | undefined;

        if (fileContent == null) {
          setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
          return;
        }

        if (fileContent === '' && e.loaded > 100000) {
          // V8-based browsers can't handle large files and return an empty string
          // instead of an error; see https://stackoverflow.com/a/61316641
          setError(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
          return;
        }

        try {
          const parsedData = parseContent(fileContent);
          onFileParsed(parsedData);
        } catch (err) {
          setError(err.message);
        }
      };

      const handleReaderError = function () {
        const message = reader.error?.message;
        if (message) {
          setError(FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message));
        } else {
          setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
        }
      };

      reader.onerror = handleReaderError;
      reader.onabort = handleReaderError;

      reader.readAsText(file);
    },
    [onFileParsed]
  );

  return { parseFile, isParsing, error };
};

const parseContent = (fileContent: string): SplunkRow[] => {
  const trimmedContent = fileContent.trim();
  let arrayContent: SplunkRow[];
  if (trimmedContent.startsWith('[')) {
    arrayContent = parseJSONArray(trimmedContent);
  } else {
    arrayContent = parseNDJSON(trimmedContent);
  }
  if (arrayContent.length === 0) {
    throw new Error(FILE_UPLOAD_ERROR.EMPTY);
  }
  return arrayContent;
};

const parseNDJSON = (fileContent: string): SplunkRow[] => {
  return fileContent
    .split(/\n(?=\{)/) // split at newline followed by '{'.
    .filter((entry) => entry.trim() !== '') // Remove empty entries.
    .map(parseJSON); // Parse each entry as JSON.
};

const parseJSONArray = (fileContent: string): SplunkRow[] => {
  const parsedContent = parseJSON(fileContent);
  if (!Array.isArray(parsedContent)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_ARRAY);
  }
  return parsedContent;
};

const parseJSON = (fileContent: string) => {
  try {
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
    }
    throw new Error(FILE_UPLOAD_ERROR.CAN_NOT_PARSE);
  }
};
