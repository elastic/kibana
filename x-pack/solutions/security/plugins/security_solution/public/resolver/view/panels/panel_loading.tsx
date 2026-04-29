/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, EuiSpacer } from '@elastic/eui';
import { Breadcrumbs } from './breadcrumbs';
import { useLinkProps } from '../use_link_props';

const StyledSpinnerFlexItem = styled.span`
  margin-right: 5px;
`;

export function PanelLoading({ id }: { id: string }) {
  const waitingString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedDetail.wait',
    {
      defaultMessage: 'Loading Events...',
    }
  );
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
    {
      defaultMessage: 'Events',
    }
  );
  const nodesLinkNavProps = useLinkProps(id, {
    panelView: 'nodes',
  });
  const waitCrumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        ...nodesLinkNavProps,
      },
    ];
  }, [nodesLinkNavProps, eventsString]);
  return (
    <>
      <Breadcrumbs breadcrumbs={waitCrumbs} />
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
        <StyledSpinnerFlexItem>
          <EuiLoadingSpinner size="m" />
        </StyledSpinnerFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText data-test-subj="resolver:panel:loading">{waitingString}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
