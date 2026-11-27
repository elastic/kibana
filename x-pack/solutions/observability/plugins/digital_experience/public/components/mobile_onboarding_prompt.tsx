/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ELEMENTS } from '../ebt_constants';
import { EDOT_ANDROID_DOCS_URL, EDOT_IOS_DOCS_URL } from '../utils/doc_links';

/** An empty state that links to the EDOT Android and EDOT iOS setup docs. */
export function MobileOnboardingPrompt({
  title,
  body,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  body: string;
  'data-test-subj': string;
}) {
  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      iconType="package"
      title={<h2>{title}</h2>}
      body={<p>{body}</p>}
      actions={
        <EuiFlexGroup gutterSize="m" justifyContent="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="digitalExperienceMobileAndroidDocsLink"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.ADD_DATA,
                element: DIGITAL_EXPERIENCE_EBT_ELEMENTS.INSTRUMENTATION_DOCS_LINK,
              })}
              href={EDOT_ANDROID_DOCS_URL}
              target="_blank"
              external
            >
              {i18n.translate('xpack.digitalExperience.mobile.empty.androidDocs', {
                defaultMessage: 'Instrument with EDOT Android',
              })}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="digitalExperienceMobileIosDocsLink"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.ADD_DATA,
                element: DIGITAL_EXPERIENCE_EBT_ELEMENTS.INSTRUMENTATION_DOCS_LINK,
              })}
              href={EDOT_IOS_DOCS_URL}
              target="_blank"
              external
            >
              {i18n.translate('xpack.digitalExperience.mobile.empty.iosDocs', {
                defaultMessage: 'Instrument with EDOT iOS',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
