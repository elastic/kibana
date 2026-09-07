/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { useKibana } from '../../hooks/use_kibana';

export function SloSelectorEmptyState() {
  const {
    http: { basePath },
    application: { navigateToUrl },
  } = useKibana().services;

  return (
    <EuiEmptyPrompt
      iconType="logoObservability"
      title={
        <FormattedMessage
          id="xpack.slo.rules.sloSelector.noSlosAvailable"
          defaultMessage="No SLOs available"
        />
      }
      body={
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.slo.rules.sloSelector.noSlosAvailableDescription"
            defaultMessage="This rule requires an SLO. Create one to continue."
          />
        </EuiText>
      }
      actions={
        <EuiButton
          data-test-subj="sloSloSelectorCreateSloButton"
          color="primary"
          onClick={() => navigateToUrl(basePath.prepend(paths.sloCreate))}
          fill
        >
          <FormattedMessage
            id="xpack.slo.rules.sloSelector.createSloLink"
            defaultMessage="Create SLO"
          />
        </EuiButton>
      }
    />
  );
}
