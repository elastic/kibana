/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../common/lib/kibana';

const EntityAnalyticsLearnMoreLinkComponent = ({ title }: { title?: string | React.ReactNode }) => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;

  return (
    <EuiLink
      target="_blank"
      rel="noopener nofollow noreferrer"
      href={entityAnalyticsLinks.entityRiskScoring}
    >
      {title ? (
        title
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.learnMore"
          defaultMessage="Learn more about entity risk scoring"
        />
      )}
    </EuiLink>
  );
};

export const EntityAnalyticsLearnMoreLink = React.memo(EntityAnalyticsLearnMoreLinkComponent);

EntityAnalyticsLearnMoreLink.displayName = 'EntityAnalyticsLearnMoreLink';
