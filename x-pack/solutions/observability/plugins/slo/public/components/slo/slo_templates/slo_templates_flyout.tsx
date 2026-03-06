/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { SloTemplatesTable } from '../../../pages/slo_management/components/slo_templates/slo_templates_table';
import type { TemplatesSearchState } from '../../../pages/slo_management/hooks/use_templates_url_search_state';
import { DEFAULT_STATE } from '../../../pages/slo_management/hooks/use_templates_url_search_state';

interface Props {
  onClose: () => void;
}

export function SloTemplatesFlyout({ onClose }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const modalTitleId = useGeneratedHtmlId();
  const [state, setState] = useState<TemplatesSearchState>(DEFAULT_STATE);

  const onStateChange = (newState: Partial<TemplatesSearchState>) => {
    setState((prev) => ({ ...prev, page: 0, ...newState }));
  };

  const handleTemplateSelect = (templateId: string) => {
    onClose();
    navigateToUrl(basePath.prepend(paths.sloCreateFromTemplate(templateId)));
  };

  return (
    <EuiFlyout
      aria-labelledby={modalTitleId}
      onClose={() => onClose()}
      size="m"
      ownFocus
      data-test-subj="sloTemplatesFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle id={modalTitleId} size="m">
          <h2>
            {i18n.translate('xpack.slo.sloTemplatesFlyout.title', {
              defaultMessage: 'Create SLO from template',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SloTemplatesTable
          state={state}
          onStateChange={onStateChange}
          onTemplateSelect={handleTemplateSelect}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
