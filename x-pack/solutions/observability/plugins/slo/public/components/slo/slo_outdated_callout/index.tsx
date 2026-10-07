/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { encode } from '@kbn/rison';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../../hooks/use_kibana';

export function SloOutdatedCallout() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleClick = () => {
    navigateToUrl(
      `${basePath.prepend(paths.slosManagement)}?search=${encode({
        includeOutdatedOnly: true,
      })}`
    );
  };

  const { isLoading, data } = useFetchSloDefinitions({ includeOutdatedOnly: true });
  if (!isLoading && data && data.total > 0) {
    return (
      <>
        <KbnWarningCallout
          announceOnMount
          title={i18n.translate('xpack.slo.outdatedSloCallout.title', {
            defaultMessage: '{total} Outdated SLOs Detected',
            values: {
              total: data.total,
            },
          })}
          text={
            <FormattedMessage
              id="xpack.slo.outdatedSloCallout.message"
              defaultMessage="We've noticed that you have {total} outdated SLO definitions, these SLOs will not be running or alerting until you've reset them. Please click the button below to review the SLO definitions; you can choose to either reset the SLO definition or remove it."
              values={{ total: data.total }}
            />
          }
          actionProps={{
            primary: {
              'data-test-subj': 'o11ySloOutdatedCalloutViewOutdatedSloDefinitionsButton',
              onClick: handleClick,
              children: (
                <FormattedMessage
                  id="xpack.slo.outdatedSloCallout.buttonLabel"
                  defaultMessage="Review Outdated SLO Definitions"
                />
              ),
            },
          }}
        />
        <EuiSpacer size="m" />
      </>
    );
  }
  return null;
}
