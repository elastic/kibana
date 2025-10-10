/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyUrl } from 'query-string';
import { APP_UI_ID } from '../../../../common';

export const RETURN_APP_ID = 'returnAppId';
export const RETURN_PATH = 'returnPath';

export const addPathParamToUrl = (
  url: string,
  onboardingLink: string,
  extraParams?: Record<string, string>
): string => {
  return stringifyUrl(
    {
      url,
      query: {
        [RETURN_APP_ID]: APP_UI_ID,
        [RETURN_PATH]: onboardingLink,
        ...extraParams,
      },
    },
    {
      encode: true,
      sort: false,
    }
  );
};
