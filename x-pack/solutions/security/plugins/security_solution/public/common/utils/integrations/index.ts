/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../../common';

export const RETURN_APP_ID = 'returnAppId';
export const RETURN_PATH = 'returnPath';

export const addPathParamToUrl = (url: string, onboardingLink: string) => {
  const encoded = encodeURIComponent(onboardingLink);
  const paramsString = `${RETURN_PATH}=${encoded}&${RETURN_APP_ID}=${APP_UI_ID}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
};
