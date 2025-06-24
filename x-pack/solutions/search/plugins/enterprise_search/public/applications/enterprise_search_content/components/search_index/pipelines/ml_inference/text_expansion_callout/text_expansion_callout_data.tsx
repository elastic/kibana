/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useValues } from 'kea';

import { IndexViewLogic } from '../../../index_view_logic';

import { TextExpansionCallOutProps, TextExpansionCallOutState } from './text_expansion_callout';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';

export const TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY =
  'enterprise-search-text-expansion-callout-dismissed';

const isDismissed = () => localStorage.getItem(TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY) === 'true';

export const useTextExpansionCallOutData = ({
  isCompact = false,
  isDismissable = false,
}: TextExpansionCallOutProps): TextExpansionCallOutState => {
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { isCreateButtonDisabled, isModelRunningSingleThreaded, isStartButtonDisabled } =
    useValues(TextExpansionCalloutLogic);

  const [show, setShow] = useState<boolean>(() => {
    if (!isDismissable) return true;

    try {
      return !isDismissed();
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      if (!isDismissed()) {
        localStorage.setItem(TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY, JSON.stringify(!show));
      }
    } catch {
      return;
    }
  }, [show]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  return {
    dismiss,
    ingestionMethod,
    isCompact,
    isCreateButtonDisabled,
    isDismissable,
    isSingleThreaded: isModelRunningSingleThreaded,
    isStartButtonDisabled,
    show,
  };
};
