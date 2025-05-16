/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiIconTip,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import * as selectors from '../../store/selectors';
import { useColors } from '../use_colors';
import { StyledDescriptionList } from '../panels/styles';
import { GeneratedText } from '../generated_text';
import type { State } from '../../../common/store/types';
import { StyledEuiDescriptionListTitle, StyledEuiButtonIcon, COLUMN_WIDTH } from './styles';

export const SchemaInformation = ({
  id,
  closePopover,
  setActivePopover,
  isOpen,
}: {
  id: string;
  closePopover: () => void;
  setActivePopover: (value: 'schemaInfo' | null) => void;
  isOpen: boolean;
}) => {
  const colorMap = useColors();
  const sourceAndSchema = useSelector((state: State) =>
    selectors.resolverTreeSourceAndSchema(state.analyzer[id])
  );
  const setAsActivePopover = useCallback(() => setActivePopover('schemaInfo'), [setActivePopover]);

  const schemaInfoButtonTitle = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.schemaInfoButtonTitle',
    {
      defaultMessage: 'Schema Information',
    }
  );

  const unknownSchemaValue = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.unknownSchemaValue',
    {
      defaultMessage: 'Unknown',
    }
  );

  return (
    <EuiPopover
      button={
        <StyledEuiButtonIcon
          data-test-subj="resolver:graph-controls:schema-info-button"
          size="m"
          title={schemaInfoButtonTitle}
          aria-label={schemaInfoButtonTitle}
          onClick={setAsActivePopover}
          iconType="iInCircle"
          $backgroundColor={colorMap.graphControlsBackground}
          $iconColor={colorMap.graphControls}
          $borderColor={colorMap.graphControlsBorderColor}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle style={{ textTransform: 'uppercase' }}>
        {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaInfoTitle', {
          defaultMessage: 'process tree',
        })}
        <EuiIconTip
          content={i18n.translate(
            'xpack.securitySolution.resolver.graphControls.schemaInfoTooltip',
            {
              defaultMessage: 'These are the fields used to create the process tree',
            }
          )}
          position="right"
        />
      </EuiPopoverTitle>
      <div
        // Limit the width based on UX design
        style={{ maxWidth: '268px' }}
      >
        <StyledDescriptionList
          data-test-subj="resolver:graph-controls:schema-info"
          type="column"
          columnWidths={COLUMN_WIDTH}
          align="left"
          compressed
        >
          <>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaSource', {
                defaultMessage: 'source',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.dataSource ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaID', {
                defaultMessage: 'id',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.schema.id ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaEdge', {
                defaultMessage: 'edge',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.schema.parent ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
          </>
        </StyledDescriptionList>
      </div>
    </EuiPopover>
  );
};
