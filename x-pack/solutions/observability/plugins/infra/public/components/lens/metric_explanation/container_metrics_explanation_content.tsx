/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CONTAINER_METRICS_DOC_HREF,
  HOST_METRICS_DOTTED_LINES_DOC_HREF,
} from '../../../common/visualizations/constants';

export const ContainerMetricsExplanationContent = () => {
  return (
    <EuiText size="xs">
      <p>
        <FormattedMessage
          id="xpack.infra.containerViewPage.metricsExplanation"
          defaultMessage="Showing metrics for your container(s)"
        />
      </p>
      <p>
        <EuiText size="xs">
          <EuiLink
            data-test-subj="containerViewMetricsDocumentationLink"
            href={CONTAINER_METRICS_DOC_HREF}
            target="_blank"
          >
            {i18n.translate('xpack.infra.containerViewPage.tooltip.whatAreTheseMetricsLink', {
              defaultMessage: 'What are these metrics?',
            })}
          </EuiLink>
        </EuiText>
      </p>
      <p>
        <EuiText size="xs">
          <EuiLink
            data-test-subj="containerViewMetricsDocumentationLink"
            href={HOST_METRICS_DOTTED_LINES_DOC_HREF}
            target="_blank"
          >
            {i18n.translate('xpack.infra.hostsViewPage.tooltip.whyAmISeeingDottedLines', {
              defaultMessage: 'Why am I seeing dotted lines?',
            })}
          </EuiLink>
        </EuiText>
      </p>
    </EuiText>
  );
};
