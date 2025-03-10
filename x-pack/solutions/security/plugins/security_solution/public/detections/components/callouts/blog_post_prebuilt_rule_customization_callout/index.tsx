/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import avcBannerBackground from '@kbn/avc-banner/src/avc_banner_background.svg';
import { EuiSpacer, EuiButton, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { type CallOutMessage } from '../../../../common/components/callouts';
import { useCallOutStorage } from '../../../../common/components/callouts/use_callout_storage';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';

export function BlogPostPrebuiltRuleCustomizationCallout() {
  const { euiTheme } = useEuiTheme();

  // URL is currently only available in ESS. So we are only showing this callout in ESS for now.
  const blogPostUrl =
    useKibana().services.docLinks.links.securitySolution.prebuiltRuleCustomizationPromoBlog;

  const calloutMessage: CallOutMessage = useMemo(
    () => ({
      type: 'success',
      id: 'blog-post-elastic-security-prebuilt-rule-customization',
      title: i18n.CALLOUT_TITLE,
      description: (
        <>
          {i18n.CALLOUT_DESCRIPTION}
          <EuiSpacer size="s" />
          <EuiButton size="s" color="success" href={blogPostUrl} target="_blank">
            {i18n.CALLOUT_ACTION_BUTTON_LABEL}
          </EuiButton>
        </>
      ),
    }),
    [blogPostUrl]
  );

  const { isVisible, dismiss } = useCallOutStorage([calloutMessage], 'detections');

  const handleDismiss = useCallback(() => {
    dismiss(calloutMessage);
  }, [dismiss, calloutMessage]);

  if (blogPostUrl && isVisible(calloutMessage)) {
    return (
      <>
        <EuiCallOut
          title={calloutMessage.title}
          color={calloutMessage.type}
          iconType="cheer"
          onDismiss={handleDismiss}
          css={css`
            padding-left: ${euiTheme.size.xl};
            background-image: url(${avcBannerBackground});
            background-repeat: no-repeat;
            background-position-x: right;
            background-position-y: bottom;
          `}
        >
          {calloutMessage.description}
        </EuiCallOut>
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
}
