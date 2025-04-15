/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityGroupName } from './constants';
import { i18nStrings } from './i18n_strings';

export interface SecurityLinkGroupDefinition {
  title: string;
}

export const SecurityLinkGroup: Record<SecurityGroupName, SecurityLinkGroupDefinition> =
  Object.freeze({
    [SecurityGroupName.rules]: { title: i18nStrings.rules.title },
    [SecurityGroupName.explore]: { title: i18nStrings.explore.title },
    [SecurityGroupName.investigations]: { title: i18nStrings.investigations.title },
    [SecurityGroupName.assets]: { title: i18nStrings.assets.title },
    [SecurityGroupName.entityAnalytics]: { title: i18nStrings.entityAnalytics.title },
    [SecurityGroupName.machineLearning]: { title: i18nStrings.ml.title },
  });
