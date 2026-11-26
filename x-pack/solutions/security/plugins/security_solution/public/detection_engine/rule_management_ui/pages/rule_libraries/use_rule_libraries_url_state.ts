/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { RisonValue } from '@kbn/rison';
import { URL_PARAM_KEY } from '../../../../common/hooks/constants';
import {
  useGetInitialUrlParamValue,
  useReplaceUrlParams,
} from '../../../../common/utils/global_query_string/helpers';
import type { RuleLibrariesPageState } from './rule_libraries_url_state';
import { parseRuleLibrariesUrlState, toRuleLibrariesUrlState } from './rule_libraries_url_state';

/** The state the URL asks for, read once when the page is opened. */
export const useInitialRuleLibrariesPageState = (): RuleLibrariesPageState => {
  const getInitialUrlParamValue = useGetInitialUrlParamValue<RisonValue>(
    URL_PARAM_KEY.ruleLibraries
  );
  const [initialState] = useState(() => parseRuleLibrariesUrlState(getInitialUrlParamValue()));

  return initialState;
};

/** Keeps the URL in step with the page, so a link or a reload shows the same view. */
export const useSyncRuleLibrariesUrlState = (
  state: RuleLibrariesPageState,
  // Hold off while the page is still finding out what exists, so the URL is not rewritten before it is read.
  isEnabled: boolean
): void => {
  const replaceUrlParams = useReplaceUrlParams();
  const { libraryId, tab, search, tags, tactics, pageIndex, pageSize } = state;

  const urlState = useMemo(
    () => toRuleLibrariesUrlState({ libraryId, tab, search, tags, tactics, pageIndex, pageSize }),
    [libraryId, tab, search, tags, tactics, pageIndex, pageSize]
  );
  // Compared as text so that a new array with the same content does not rewrite the URL.
  const serializedUrlState = JSON.stringify(urlState);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    replaceUrlParams({
      [URL_PARAM_KEY.ruleLibraries]: JSON.parse(serializedUrlState) as RisonValue | null,
    });
  }, [isEnabled, replaceUrlParams, serializedUrlState]);
};
