/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useKibana } from '../../../../../../common/lib/kibana';

export const RelatedDetectionRulesCallout = memo<{ 'data-test-subj'?: string }>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const {
      docLinks: {
        links: { securitySolution },
      },
    } = useKibana().services;

    return (
      <EuiCallOut iconType="iInCircle" data-test-subj={getTestId()}>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.detectionRulesDocsMessage"
          defaultMessage="The Endpoint Security detection rule is enabled automatically with Elastic Defend. This rule must remain enabled to receive Endpoint alerts. {detectionRulesDocsLink}."
          values={{
            detectionRulesDocsLink: (
              <EuiLink
                data-test-subj={getTestId('link')}
                target="_blank"
                href={`${securitySolution.detectionEngineOverview}`}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.details.detectionRulesMessageDocsLink"
                  defaultMessage="Learn More"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    );
  }
);
RelatedDetectionRulesCallout.displayName = 'RelatedDetectionRulesCallout';
