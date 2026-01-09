/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from './translations';

export const LEARN_MORE_LINK_DATA_TEST_ID = 'learnMoreLink' as string;
export const EMPTY_RESULTS_FOOTER_MESSAGE_ID = 'emptyResultsFooterMessage' as string;

/**
 * Renders the footer for the empty results state, containing a disclaimer and a "Learn more" link.
 */
export const EmptyResultsFooter: React.FC = React.memo(() => (
  <EuiText size="s" data-test-subj={EMPTY_RESULTS_FOOTER_MESSAGE_ID}>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.attacks.emptyResults.footerMessage"
      defaultMessage="AI results may not always be accurate. {learnMoreLink}"
      values={{
        learnMoreLink: (
          <EuiLink
            external={true}
            data-test-subj={LEARN_MORE_LINK_DATA_TEST_ID}
            href="https://www.elastic.co/guide/en/security/current/attack-discovery.html"
            target="_blank"
          >
            {i18n.LEARN_MORE}
          </EuiLink>
        ),
      }}
    />
  </EuiText>
));
EmptyResultsFooter.displayName = 'EmptyResultsFooter';
