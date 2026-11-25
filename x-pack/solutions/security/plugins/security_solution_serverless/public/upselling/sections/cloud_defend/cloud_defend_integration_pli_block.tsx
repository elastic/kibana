/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const CloudDefendIntegrationPliBlock = memo(() => (
  <>
    <EuiSpacer size="s" />
    <EuiCard
      data-test-subj="cloud-defend-integration-pli-auth-block"
      isDisabled={true}
      description={false}
      icon={<EuiIcon size="xl" type="lock" aria-hidden={true} />}
      betaBadgeProps={{
        label: i18n.translate(
          'xpack.securitySolutionServerless.cloudDefendIntegrationPliBlock.badgeLabel',
          { defaultMessage: 'Cloud Protection Essentials' }
        ),
      }}
      title={
        <h3>
          <strong>
            <FormattedMessage
              id="xpack.securitySolutionServerless.cloudDefendIntegrationPliBlock.cardTitle"
              defaultMessage="Protection updates"
            />
          </strong>
        </h3>
      }
    >
      <div>
        <FormattedMessage
          id="xpack.securitySolutionServerless.cloudDefendIntegrationPliBlock.cardDescription"
          defaultMessage="To add the Defend for containers integration, you must add Cloud Protection Essentials or Cloud Protection Complete under Manage → Project features."
        />
      </div>
    </EuiCard>
  </>
));
CloudDefendIntegrationPliBlock.displayName = 'CloudDefendIntegrationPliBlock';
