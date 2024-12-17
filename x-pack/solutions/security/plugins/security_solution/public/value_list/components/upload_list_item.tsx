/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiFilePicker, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/css';
import { useImportList, useInvalidateListItemQuery } from '@kbn/securitysolution-list-hooks';
import type { Type as ListType } from '@kbn/securitysolution-io-ts-list-types';
import { useKibana } from '../../common/lib/kibana';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import {
  UPLOAD_LIST_ITEM,
  UPLOAD_FILE_PICKER_INITAL_PROMT_TEXT,
  UPLOAD_TOOLTIP,
  FAILED_TO_UPLOAD_LIST_ITEM_TITLE,
  FAILED_TO_UPLOAD_LIST_ITEM,
  SUCCESSFULY_UPLOAD_LIST_ITEMS,
} from '../translations';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../common/lib/telemetry';

const validFileTypes = ['text/csv', 'text/plain'];

const toastOptions = {
  toastLifeTimeMs: 5000,
};

const uploadStyle = css`
  min-width: 300px;
`;

export const UploadListItem = ({ listId, type }: { listId: string; type: ListType }) => {
  const [file, setFile] = useState<File | null>(null);
  const { http } = useKibana().services;
  const ctrl = useRef(new AbortController());
  const { start: importList, ...importState } = useImportList();
  const invalidateListItemQuery = useInvalidateListItemQuery();
  const { addSuccess, addError } = useAppToasts();
  const handleFileChange = useCallback((files: FileList | null) => {
    setFile(files?.item(0) ?? null);
  }, []);

  const handleImport = useCallback(() => {
    if (!importState.loading && file) {
      ctrl.current = new AbortController();
      track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.ADDITIONAL_UPLOAD_VALUE_LIST_ITEM);
      importList({
        file,
        listId,
        http,
        signal: ctrl.current.signal,
        type,
        refresh: 'true',
      });
    }
  }, [importState.loading, file, importList, http, type, listId]);

  const fileIsValid = !file || validFileTypes.some((fileType) => file.type === fileType);

  useEffect(() => {
    if (!importState.loading && importState.result) {
      addSuccess(SUCCESSFULY_UPLOAD_LIST_ITEMS, toastOptions);
    } else if (!importState.loading && importState.error) {
      addError(FAILED_TO_UPLOAD_LIST_ITEM, {
        title: FAILED_TO_UPLOAD_LIST_ITEM_TITLE,
        ...toastOptions,
      });
    }
    invalidateListItemQuery();
  }, [
    importState.error,
    importState.loading,
    importState.result,
    addSuccess,
    addError,
    invalidateListItemQuery,
  ]);

  const isDisabled = file == null || !fileIsValid || importState.loading;

  return (
    <>
      <EuiToolTip position="bottom" content={UPLOAD_TOOLTIP}>
        <EuiFilePicker
          className={uploadStyle}
          accept={validFileTypes.join()}
          id="value-list-item-upload"
          initialPromptText={UPLOAD_FILE_PICKER_INITAL_PROMT_TEXT}
          onChange={handleFileChange}
          display="default"
          isLoading={importState.loading}
          isInvalid={!fileIsValid}
          data-test-subj="value-list-items-file-picker"
        />
      </EuiToolTip>
      <EuiButton
        onClick={handleImport}
        disabled={isDisabled}
        data-test-subj="value-list-items-upload"
      >
        {UPLOAD_LIST_ITEM}
      </EuiButton>
    </>
  );
};
