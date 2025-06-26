/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FIREHOSE_CLOUDFORMATION_TEMPLATE_URL } from '../../../../common/aws_firehose';

export function DownloadTemplateCallout() {
  return (
    <FormattedMessage
      id="xpack.observability_onboarding.firehosePanel.downloadTemplateDescription"
      defaultMessage="{downloadLink} to review the default settings. If needed, you can modify the default settings and use the template with your existing IaC setup."
      values={{
        downloadLink: (
          <EuiLink
            data-test-subj="observabilityOnboardingFirehosePanelDownloadCloudFormationTemplateLink"
            href={FIREHOSE_CLOUDFORMATION_TEMPLATE_URL}
            download={true}
          >
            {i18n.translate(
              'xpack.observability_onboarding.firehosePanel.downloadCloudFormationTemplateButtonLabel',
              { defaultMessage: 'Download the CloudFormation template' }
            )}
          </EuiLink>
        ),
      }}
    />
  );
}
