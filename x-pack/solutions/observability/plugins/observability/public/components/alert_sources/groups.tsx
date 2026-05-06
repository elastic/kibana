/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { SERVICE_NAME } from '@kbn/observability-shared-plugin/common';
import { useKibana } from '../../utils/kibana_react';
import { APM_APP_LOCATOR_ID } from './get_apm_app_url';
import type { Group, TimeRange } from '../../../common/typings';
import { apmSources, generateSourceLink, infraSources } from './get_alert_source_links';

/**
 * Identifies the UI section that contains the alert source links.
 * Used as the `data-ebt-element` value for click telemetry, so
 * analytics can distinguish clicks coming from the alert details
 * page vs. the alert flyout.
 */
export const ALERT_SOURCES_ELEMENT = {
  ALERT_DETAILS: 'alertDetailsSources',
  ALERT_FLYOUT: 'alertFlyoutSources',
} as const;

export type AlertSourcesElement =
  (typeof ALERT_SOURCES_ELEMENT)[keyof typeof ALERT_SOURCES_ELEMENT];

const getClickActionLabel = (field: string): string => {
  if (apmSources.includes(field)) return 'openInApm';
  if (infraSources.includes(field)) return 'openInInfra';
  return `navigateTo-${field}`;
};

export function Groups({
  groups,
  timeRange,
  alertRuleTypeId,
  element,
}: {
  groups: Group[];
  timeRange: TimeRange;
  alertRuleTypeId: string;
  element: AlertSourcesElement;
}) {
  const {
    http: {
      basePath: { prepend },
    },
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const [sourceLinks, setSourceLinks] = useState<Record<string, string | undefined>>({});

  const serviceName = groups.find((group) => group.field === SERVICE_NAME)?.value;

  useEffect(() => {
    if (!groups) return;

    let links: Record<string, string | undefined> = {};

    groups.map((group) => {
      const link = generateSourceLink(
        group,
        timeRange,
        prepend,
        serviceName,
        locators.get(APM_APP_LOCATOR_ID)
      );
      links = {
        ...links,
        [group.field]: link,
      };
    });

    setSourceLinks(links);
  }, [groups, locators, prepend, serviceName, timeRange]);

  return (
    <>
      {groups &&
        groups.map((group) => {
          return (
            <EuiText key={group.field}>
              {group.field}:{' '}
              {sourceLinks[group.field] ? (
                <EuiLink
                  data-test-subj="o11yAlertSourceLink"
                  data-ebt-action={getClickActionLabel(group.field)}
                  data-ebt-element={element}
                  data-ebt-detail={alertRuleTypeId}
                  href={sourceLinks[group.field]}
                >
                  {group.value}
                </EuiLink>
              ) : (
                <strong>{group.value}</strong>
              )}
            </EuiText>
          );
        })}
    </>
  );
}
