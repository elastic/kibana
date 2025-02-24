/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { get } from 'lodash';
import type { FC, ReactElement } from 'react';
import React, { Fragment, useCallback, useState } from 'react';
import styled from 'styled-components';

import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../../common/constants';
import type { RowRenderer } from '../../../../../../../common/types';
import type { Fields } from '../../../../../../../common/search_strategy';
import { ID_FIELD_NAME } from '../../../../../../common/components/event_details/event_id';
import { RowRendererContainer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';
import {
  ALL_INDICATOR_MATCHES_MODAL_CLOSE,
  ALL_INDICATOR_MATCHES_MODAL_HEADER,
  SHOW_ALL_INDICATOR_MATCHES,
} from '../translations';

const SpacedContainer = styled.div`
  margin: ${({ theme }) => theme.eui.euiSizeS} 0;
`;

export const renderThreatMatchRows: RowRenderer['renderRow'] = ({ data, scopeId }) => {
  return <ThreatMatchRowWrapper data={data} scopeId={scopeId} />;
};

interface ThreatMatchRowProps {
  data: EcsSecurityExtension;
  scopeId: string;
}

const MAX_INDICATOR_VISIBLE = 2;

const ThreatMatchRowWrapper: FC<ThreatMatchRowProps> = ({ data, scopeId }) => {
  const indicators = get(data, ENRICHMENT_DESTINATION_PATH) as Fields[];
  const eventId = get(data, ID_FIELD_NAME);

  const getThreatMatchRows = useCallback(
    (mode: 'max' | 'all' = 'max') => {
      const allIndicators =
        mode === 'max' ? indicators.slice(0, MAX_INDICATOR_VISIBLE) : indicators;

      return (
        <RowRendererContainer data-test-subj="threat-match-row-renderer">
          <SpacedContainer>
            {allIndicators.map((indicator, index) => {
              const contextId = `threat-match-row-${scopeId}-${eventId}-${index}`;
              return (
                <Fragment key={contextId}>
                  <ThreatMatchRow contextId={contextId} data={indicator} eventId={eventId} />
                  {index < indicators.length - 1 && <EuiHorizontalRule margin="s" />}
                </Fragment>
              );
            })}
          </SpacedContainer>
        </RowRendererContainer>
      );
    },
    [indicators, eventId, scopeId]
  );

  const renderModalChildren = useCallback(() => getThreatMatchRows('all'), [getThreatMatchRows]);

  return (
    <EuiFlexGroup direction="column" justifyContent="center" alignItems="center" gutterSize="none">
      <EuiFlexItem>{getThreatMatchRows()}</EuiFlexItem>
      {indicators.length > MAX_INDICATOR_VISIBLE && (
        <EuiFlexItem>
          <ThreatMatchRowModal
            title={SHOW_ALL_INDICATOR_MATCHES(indicators.length)}
            renderChildren={renderModalChildren}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

interface ThreatMatchRowModalProps {
  title: string;
  renderChildren: () => ReactElement;
}

const ThreatMatchRowModal: FC<ThreatMatchRowModalProps> = ({ title, renderChildren }) => {
  const [isModalVisible, setShowModal] = useState(false);
  const closeModal = () => setShowModal(false);
  const showModal = () => setShowModal(true);
  let modal;

  if (isModalVisible) {
    modal = (
      <EuiModal onClose={closeModal}>
        <EuiModalHeader data-test-subj="threat-match-row-modal">
          <EuiModalHeaderTitle>{ALL_INDICATOR_MATCHES_MODAL_HEADER}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>{renderChildren()}</EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={closeModal} fill>
            {ALL_INDICATOR_MATCHES_MODAL_CLOSE}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  return (
    <div>
      <EuiButtonEmpty
        data-test-subj="threat-match-row-show-all"
        iconType="popout"
        color="primary"
        onClick={showModal}
      >
        {title}
      </EuiButtonEmpty>
      {modal}
    </div>
  );
};
