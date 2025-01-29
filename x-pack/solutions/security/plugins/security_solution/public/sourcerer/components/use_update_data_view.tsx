/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import * as i18n from './translations';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { ensurePatternFormat } from '../../../common/utils/sourcerer';

export interface UseCreateAdhocDataViewReturnValue {
  isLoading: boolean;
  createAdhocDataView: (missingPatterns: string[]) => Promise<DataView | null>;
}

export const useCreateAdhocDataView = (
  onOpenAndReset: () => void
): UseCreateAdhocDataViewReturnValue => {
  const { dataViews, uiSettings } = useKibana().services;
  const { addError } = useAppToasts();

  const [isLoading, setIsLoading] = useState(false);

  const createAdhocDataView = useCallback(
    async (missingPatterns: string[]): Promise<DataView | null> => {
      setIsLoading(true);

      const asyncSearch = async (): Promise<DataView> => {
        const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
        const combinedPatterns = [...defaultPatterns, ...missingPatterns];
        const validatedPatterns = ensurePatternFormat(combinedPatterns);
        const patternsString = validatedPatterns.join(',');
        const adHocDataView = await dataViews.create({
          id: `adhoc_sourcerer_${Date.now()}`,
          title: patternsString,
        });

        if (adHocDataView.fields.getByName('@timestamp')?.type === 'date') {
          adHocDataView.timeFieldName = '@timestamp';
        }

        return adHocDataView;
      };
      try {
        return await asyncSearch();
      } catch (possibleError) {
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
      }
    },
    [addError, onOpenAndReset, uiSettings, dataViews]
  );

  return { createAdhocDataView, isLoading };
};
