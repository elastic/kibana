/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema/src/schema/common';

export const SLOS_BASE_PATH = '/app/slos';
export const SLOS_PATH = '/' as const;
export const SLOS_WELCOME_PATH = '/welcome' as const;
export const SLO_DETAIL_PATH = '/:sloId/:tabId?' as const;
export const SLO_CREATE_PATH = '/create' as const;
export const SLO_EDIT_PATH = '/edit/:sloId' as const;
export const SLOS_OUTDATED_DEFINITIONS_PATH = '/outdated-definitions' as const;
export const SLO_SETTINGS_PATH = '/settings' as const;

export const paths = {
  slos: `${SLOS_BASE_PATH}${SLOS_PATH}`,
  slosSettings: `${SLOS_BASE_PATH}${SLO_SETTINGS_PATH}`,
  slosWelcome: `${SLOS_BASE_PATH}${SLOS_WELCOME_PATH}`,
  slosOutdatedDefinitions: `${SLOS_BASE_PATH}${SLOS_OUTDATED_DEFINITIONS_PATH}`,
  sloCreate: `${SLOS_BASE_PATH}${SLO_CREATE_PATH}`,
  sloCreateWithEncodedForm: (encodedParams: string) =>
    `${SLOS_BASE_PATH}${SLO_CREATE_PATH}?_a=${encodedParams}`,
  sloEdit: (sloId: string) => `${SLOS_BASE_PATH}/edit/${encodeURIComponent(sloId)}`,
  sloEditWithEncodedForm: (sloId: string, encodedParams: string) =>
    `${SLOS_BASE_PATH}/edit/${encodeURIComponent(sloId)}?_a=${encodedParams}`,
  sloDetails: (sloId: string, instanceId: string, remoteName?: string, tabId?: string) => {
    const qs = new URLSearchParams();
    if (instanceId !== ALL_VALUE) qs.append('instanceId', instanceId);
    if (!!remoteName) qs.append('remoteName', remoteName);
    if (tabId) {
      return `${SLOS_BASE_PATH}/${encodeURIComponent(sloId)}/${tabId}?${qs.toString()}`;
    }
    return `${SLOS_BASE_PATH}/${encodeURIComponent(sloId)}?${qs.toString()}`;
  },
};
