/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { NightshiftNavigationIcon } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { NIGHTSHIFT_APP_ROUTE } from '../../common/constants';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { useKibana } from '../hooks/use_kibana';

/**
 * Shown instead of the app in a space Nightshift does not run in. Nightshift stays in the side
 * nav everywhere, so the space is explained rather than the app silently missing, and the prompt
 * links to the default space, where it works.
 */
export const UnsupportedSpacePrompt = () => {
  const { http } = useKibana().services;

  return (
    <EuiPageTemplate grow={false} panelled={false}>
      <EuiEmptyPrompt
        data-test-subj="nightshiftUnsupportedSpacePrompt"
        icon={<NightshiftNavigationIcon size="xxl" color="subdued" />}
        color="subdued"
        title={
          <h2>
            {i18n.translate('xpack.nightshift.unsupportedSpace.title', {
              defaultMessage: 'Nightshift only works in the default space for now',
            })}
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.nightshift.unsupportedSpace.body"
              defaultMessage="Nightshift runs as deployment-wide service accounts that are set up once, in the default space. Switch to the default space to use it here."
            />
          </p>
        }
        actions={
          <EuiButton
            fill
            // `serverBasePath` drops the `/s/<space>` prefix, so this always points at the
            // default space.
            href={`${http.basePath.serverBasePath}${NIGHTSHIFT_APP_ROUTE}`}
            data-test-subj="nightshiftUnsupportedSpaceGoToDefault"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.OPEN_NIGHTSHIFT_IN_DEFAULT_SPACE,
              element: NIGHTSHIFT_EBT_ELEMENTS.UNSUPPORTED_SPACE_PROMPT,
            })}
          >
            {i18n.translate('xpack.nightshift.unsupportedSpace.goToDefaultSpace', {
              defaultMessage: 'Open Nightshift in the default space',
            })}
          </EuiButton>
        }
      />
    </EuiPageTemplate>
  );
};
