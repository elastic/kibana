/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import React from 'react';
import { createHtmlPortalNode, OutPortal } from 'react-reverse-portal';
import { transformPartialSLODataToFormState } from '../helpers/process_slo_form_values';
import { SloEditForm } from '../components/slo_edit_form';
import type { FormSettings } from '../types';

// Keep the portal node export for backward compatibility with SloEditForm used in other contexts
export const sloEditFormFooterPortal = createHtmlPortalNode();

// eslint-disable-next-line import/no-default-export
export default function CreateSLOFormFlyout({
  onClose,
  initialValues = {},
  formSettings = {},
}: {
  onClose: () => void;
  initialValues: RecursivePartial<CreateSLOInput>;
  formSettings?: FormSettings;
}) {
  const formInitialValues = transformPartialSLODataToFormState(initialValues);
  const flyoutTitle = i18n.translate('xpack.slo.add.flyoutTitle', {
    defaultMessage: 'Create SLO',
  });
  const flyoutFormSettings: FormSettings = {
    ...formSettings,
    formLayout: 'horizontal',
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      size={620}
      resizable
      ownFocus
      session="start"
      flyoutMenuProps={{
        title: flyoutTitle,
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="addSLOFlyoutTitle">
          <h3 id="flyoutTitle" aria-label={flyoutTitle}>
            {flyoutTitle}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SloEditForm
          onFlyoutClose={onClose}
          initialValues={formInitialValues}
          formSettings={flyoutFormSettings}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OutPortal node={sloEditFormFooterPortal} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
