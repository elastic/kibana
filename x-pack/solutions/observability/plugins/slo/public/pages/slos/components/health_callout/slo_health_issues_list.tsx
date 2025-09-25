/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FetchSLOHealthResponse } from '@kbn/slo-schema';
import React from 'react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../../common/constants';

interface Props {
  results: FetchSLOHealthResponse;
}

export function SloHealthIssuesList({ results }: Props) {
  const unhealthyRollupTransforms = results.filter(
    (result) => result.health.rollup === 'unhealthy'
  );
  const unhealthySummaryTransforms = results.filter(
    (result) => result.health.summary === 'unhealthy'
  );
  const missingRollupTransforms = results.filter((result) => result.health.rollup === 'missing');
  const missingSummaryTransforms = results.filter((result) => result.health.summary === 'missing');

  return (
    <ul>
      {unhealthyRollupTransforms.map((result) => (
        <li key={`${result.sloId}-rollup-unhealthy`}>
          {getSLOTransformId(result.sloId, result.sloRevision)}{' '}
          {i18n.translate('xpack.slo.sloHealthIssuesList.li.unhealthyLabel', {
            defaultMessage: '(unhealthy)',
          })}
          <EuiCopy textToCopy={getSLOTransformId(result.sloId, result.sloRevision)}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="sloHealthCalloutCopyButton"
                aria-label={i18n.translate('xpack.slo.sloList.healthCallout.copyToClipboard', {
                  defaultMessage: 'Copy to clipboard',
                })}
                color="text"
                iconType="copy"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </li>
      ))}

      {unhealthySummaryTransforms.map((result) => (
        <li key={`${result.sloId}-summary-unhealthy`}>
          {getSLOSummaryTransformId(result.sloId, result.sloRevision)}{' '}
          {i18n.translate('xpack.slo.sloHealthIssuesList.li.unhealthyLabel', {
            defaultMessage: '(unhealthy)',
          })}
          <EuiCopy textToCopy={getSLOSummaryTransformId(result.sloId, result.sloRevision)}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="sloHealthCalloutCopyButton"
                aria-label={i18n.translate('xpack.slo.sloList.healthCallout.copyToClipboard', {
                  defaultMessage: 'Copy to clipboard',
                })}
                color="text"
                iconType="copy"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </li>
      ))}

      {missingRollupTransforms.map((result) => (
        <li key={`${result.sloId}-rollup-missing`}>
          {getSLOTransformId(result.sloId, result.sloRevision)}{' '}
          {i18n.translate('xpack.slo.sloHealthIssuesList.li.missingLabel', {
            defaultMessage: '(missing)',
          })}
          <EuiCopy textToCopy={getSLOTransformId(result.sloId, result.sloRevision)}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="sloHealthCalloutCopyButton"
                aria-label={i18n.translate('xpack.slo.sloList.healthCallout.copyToClipboard', {
                  defaultMessage: 'Copy to clipboard',
                })}
                color="text"
                iconType="copy"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </li>
      ))}

      {missingSummaryTransforms.map((result) => (
        <li key={`${result.sloId}-summary-missing`}>
          {getSLOSummaryTransformId(result.sloId, result.sloRevision)}{' '}
          {i18n.translate('xpack.slo.sloHealthIssuesList.li.missingLabel', {
            defaultMessage: '(missing)',
          })}
          <EuiCopy textToCopy={getSLOSummaryTransformId(result.sloId, result.sloRevision)}>
            {(copy) => (
              <EuiButtonIcon
                data-test-subj="sloHealthCalloutCopyButton"
                aria-label={i18n.translate('xpack.slo.sloList.healthCallout.copyToClipboard', {
                  defaultMessage: 'Copy to clipboard',
                })}
                color="text"
                iconType="copy"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </li>
      ))}
    </ul>
  );
}
