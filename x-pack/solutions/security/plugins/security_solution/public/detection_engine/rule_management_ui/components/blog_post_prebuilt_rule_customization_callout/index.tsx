/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import avcBannerBackground from '@kbn/avc-banner/src/avc_banner_background.svg';
import { EuiSpacer, EuiButton } from '@elastic/eui';
import { type CallOutMessage } from '../../../../common/components/callouts';
import { useCallOutStorage } from '../../../../common/components/callouts/use_callout_storage';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { BackgroundImageCallout } from '../background_image_callout';

export function BlogPostPrebuiltRuleCustomizationCallout() {
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

  if (isVisible(calloutMessage)) {
    return (
      <>
        <BackgroundImageCallout
          backgroundImage={avcBannerBackground}
          title={calloutMessage.title}
          description={calloutMessage.description}
          color={calloutMessage.type}
          iconType="cheer"
          onDismiss={handleDismiss}
        />
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
}
