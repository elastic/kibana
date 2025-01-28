/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import * as i18n from './translations';
import { RefreshButton } from './refresh_button';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { ensurePatternFormat } from '../../../common/utils/sourcerer';

export const useCreateAdhocDataView = (
  onOpenAndReset: () => void
): ((missingPatterns: string[]) => Promise<DataView | null>) => {
  const { dataViews, uiSettings, ...startServices } = useKibana().services;
  const { addSuccess, addError } = useAppToasts();
  return useCallback(
    async (missingPatterns: string[]): Promise<DataView | null> => {
      const asyncSearch = async (): Promise<[DataView | null, Error | null]> => {
        try {
          const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
          const combinedPatterns = [...defaultPatterns, ...missingPatterns];
          const validatedPatterns = ensurePatternFormat(combinedPatterns);
          const patternsString = validatedPatterns.join(',');
          const adHocDataView = await dataViews.createAndSave({
            id: `adhoc_sourcerer_${Date.now()}`,
            // NOTE: setting name here - it will not render duplicate warning this way.
            name: `adhoc_sourcerer_${Date.now()}`,
            title: patternsString,
          });
          if (adHocDataView.fields.getByName('@timestamp')?.type === 'date') {
            adHocDataView.timeFieldName = '@timestamp';
          }
          return [adHocDataView, null];
        } catch (e) {
          return [null, e];
        }
      };
      const [dataView, possibleError] = await asyncSearch();
      if (dataView) {
        addSuccess({
          color: 'success',
          title: toMountPoint(i18n.SUCCESS_TOAST_TITLE, startServices),
          text: toMountPoint(<RefreshButton />, startServices),
          iconType: undefined,
          toastLifeTimeMs: 600000,
        });
        return dataView;
      }
      addError(possibleError !== null ? possibleError : new Error(i18n.FAILURE_TOAST_TITLE), {
        title: i18n.FAILURE_TOAST_TITLE,
        toastMessage: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.indexPatterns.failureToastText"
              defaultMessage="Unexpected error occurred on update. If you would like to modify your data, you can manually select a data view {link}."
              values={{
                link: (
                  <EuiLink onClick={onOpenAndReset} data-test-subj="failureToastLink">
                    {i18n.TOGGLE_TO_NEW_SOURCERER}
                  </EuiLink>
                ),
              }}
            />
          </>
        ) as unknown as string,
      });
      return null;
    },
    [addError, onOpenAndReset, uiSettings, dataViews, addSuccess, startServices]
  );
};
