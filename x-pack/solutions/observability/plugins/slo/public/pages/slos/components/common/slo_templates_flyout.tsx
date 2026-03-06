/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useCallback } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { SloTemplatesTable } from '../../../slo_management/components/slo_templates_table';

interface Props {
  onClose: () => void;
}

export function SloTemplatesFlyout({ onClose }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      onClose();
      navigateToUrl(basePath.prepend(paths.sloCreateFromTemplate(templateId)));
    },
    [basePath, navigateToUrl, onClose]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      data-test-subj="sloTemplatesFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.slo.sloTemplatesFlyout.title', {
              defaultMessage: 'Create SLO from template',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SloTemplatesTable onTemplateSelect={handleTemplateSelect} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
