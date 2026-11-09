/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { UseLinkPropsOptions } from '@kbn/observability-shared-plugin/public';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '@kbn/deeplinks-observability';

const STACK_MANAGEMENT_RULES = { app: 'rules', pathname: '/' };
const CLASSIC_RULES_TAB = {
  app: OBSERVABILITY_ALERTING_APP_ID,
  pathname: OBSERVABILITY_ALERTING_RULES_V1_PATH,
};

export const createUseRulesLink =
  () =>
  (options: UseLinkPropsOptions = {}) => {
    const services = useKibana().services as Partial<CoreStart>;
    const universalAlertingEnabled = services.settings
      ? isAlertingV2Enabled(services as CoreStart)
      : false;

    return useLinkProps(
      universalAlertingEnabled ? CLASSIC_RULES_TAB : STACK_MANAGEMENT_RULES,
      options
    );
  };
