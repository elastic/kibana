/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useUrlParams } from '../../../hooks';

const OverviewPageLinkButtonIcon = styled(EuiButtonIcon)`
  margin-top: 12px;
`;

interface OverviewPageLinkProps {
  dataTestSubj: string;
  direction: string;
  pagination: string;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  dataTestSubj,
  direction,
  pagination,
}) => {
  const [, updateUrlParams] = useUrlParams();
  const icon = direction === 'prev' ? 'arrowLeft' : 'arrowRight';

  const ariaLabel =
    direction === 'next'
      ? i18n.translate('xpack.uptime.overviewPageLink.next.ariaLabel', {
          defaultMessage: 'Next page of results',
        })
      : i18n.translate('xpack.uptime.overviewPageLink.prev.ariaLabel', {
          defaultMessage: 'Prev page of results',
        });

  const disableLinkLabel = i18n.translate('xpack.uptime.overviewPageLink.disabled.ariaLabel', {
    defaultMessage:
      'A disabled pagination button indicating that there cannot be any further navigation in the monitors list.',
  });

  return (
    <OverviewPageLinkButtonIcon
      color="text"
      onClick={() => {
        updateUrlParams({ pagination });
      }}
      data-test-subj={dataTestSubj}
      iconType={icon}
      aria-label={!pagination ? disableLinkLabel : ariaLabel}
      isDisabled={!pagination}
    />
  );
};
