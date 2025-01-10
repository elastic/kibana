/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { url } from '@kbn/kibana-utils-plugin/common';
import { encode } from '@kbn/rison';
import { parse, stringify } from 'query-string';

export const defaultLogViewKey = 'logView';

const encodeRisonUrlState = (state: any) => encode(state);

export const replaceStateKeyInQueryString =
  <UrlState extends any>(stateKey: string, urlState: UrlState | undefined) =>
  (queryString: string) => {
    const previousQueryValues = parse(queryString, { sort: false });
    const newValue =
      typeof urlState === 'undefined'
        ? previousQueryValues
        : {
            ...previousQueryValues,
            [stateKey]: encodeRisonUrlState(urlState),
          };
    return stringify(url.encodeQuery(newValue), { sort: false, encode: false });
  };
