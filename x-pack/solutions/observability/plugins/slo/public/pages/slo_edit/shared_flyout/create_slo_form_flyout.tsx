/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import React from 'react';
import { OutPortal, createHtmlPortalNode } from 'react-reverse-portal';
import { SloEditForm } from '../components/slo_edit_form';
import { transformPartialSLODataToFormState } from '../helpers/process_slo_form_values';

export const sloEditFormFooterPortal = createHtmlPortalNode();

// eslint-disable-next-line import/no-default-export
export default function CreateSLOFormFlyout({
  onClose,
  initialValues = {},
  renderFlyout = true,
}: {
  onClose: () => void;
  initialValues: RecursivePartial<CreateSLOInput>;
  renderFlyout?: boolean;
}) {
  const formInitialValues = transformPartialSLODataToFormState(initialValues);

  const content = (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="addSLOFlyoutTitle">
          <h3 id="flyoutTitle">
            <FormattedMessage defaultMessage="Create SLO" id="xpack.slo.add.flyoutTitle" />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SloEditForm onFlyoutClose={onClose} initialValues={formInitialValues} isEditMode={false} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OutPortal node={sloEditFormFooterPortal} />
      </EuiFlyoutFooter>
    </>
  );

  if (!renderFlyout) {
    return content;
  }

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle" size="l" maxWidth={620} ownFocus>
      {content}
    </EuiFlyout>
  );
}

export function CreateSLOFormFlyoutContent(props: {
  onClose: () => void;
  initialValues: RecursivePartial<CreateSLOInput>;
}) {
  return <CreateSLOFormFlyout {...props} renderFlyout={false} />;
}
