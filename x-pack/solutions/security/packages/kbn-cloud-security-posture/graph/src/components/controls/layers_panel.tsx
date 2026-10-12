/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GraphDisplayOptions } from '../graph/graph_display_options_context';

const entityMetadataHeading = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.entityMetadata',
  { defaultMessage: 'Entity metadata' }
);

const subTypeLabel = i18n.translate('securitySolutionPackages.csp.graph.layersPanel.subType', {
  defaultMessage: 'Sub type',
});

const assetCriticalityLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);

const dataSourceLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.dataSource',
  { defaultMessage: 'Data source' }
);

const ipAddressLabel = i18n.translate('securitySolutionPackages.csp.graph.layersPanel.ipAddress', {
  defaultMessage: 'IP address',
});

const geolocationLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.geolocation',
  { defaultMessage: 'Geolocation' }
);

const eventMetadataHeading = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.eventMetadata',
  { defaultMessage: 'Event metadata' }
);

const sourceIpAddressLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.sourceIpAddress',
  { defaultMessage: 'Source IP address' }
);

const sourceGeolocationLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.layersPanel.sourceGeolocation',
  { defaultMessage: 'Source geolocation' }
);

export interface LayersPanelProps {
  displayOptions: GraphDisplayOptions;
  onChange: (options: GraphDisplayOptions) => void;
}

/** Popover panel content shown when the graph Layers button is clicked. */
export const LayersPanel = ({ displayOptions, onChange }: LayersPanelProps) => {
  const { euiTheme } = useEuiTheme();
  // Each mounted instance gets a unique prefix so label clicks always resolve
  // to the correct <input> even when multiple LayersPanels exist in the DOM.
  const id = useGeneratedHtmlId({ prefix: 'graphLayers' });

  const setEntityOption = (key: keyof GraphDisplayOptions['entity'], checked: boolean) => {
    onChange({
      ...displayOptions,
      entity: { ...displayOptions.entity, [key]: checked },
    });
  };

  const setEventOption = (key: keyof GraphDisplayOptions['event'], checked: boolean) => {
    onChange({
      ...displayOptions,
      event: { ...displayOptions.event, [key]: checked },
    });
  };

  return (
    <div
      css={css`
        padding: ${euiTheme.size.m};
        width: 240px;
      `}
    >
      {/* Entity metadata section */}
      <EuiText size="s">
        <strong>{entityMetadataHeading}</strong>
      </EuiText>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EntitySubType`}
            label={subTypeLabel}
            checked={displayOptions.entity.subType}
            onChange={(e) => setEntityOption('subType', e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EntityAssetCriticality`}
            label={assetCriticalityLabel}
            checked={displayOptions.entity.assetCriticality}
            onChange={(e) => setEntityOption('assetCriticality', e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EntityDataSource`}
            label={dataSourceLabel}
            checked={displayOptions.entity.dataSource}
            onChange={(e) => setEntityOption('dataSource', e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EntityIpAddress`}
            label={ipAddressLabel}
            checked={displayOptions.entity.ipAddress}
            onChange={(e) => setEntityOption('ipAddress', e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EntityGeolocation`}
            label={geolocationLabel}
            checked={displayOptions.entity.geolocation}
            onChange={(e) => setEntityOption('geolocation', e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Event metadata section */}
      <EuiText
        size="s"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        <strong>{eventMetadataHeading}</strong>
      </EuiText>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EventSourceIpAddress`}
            label={sourceIpAddressLabel}
            checked={displayOptions.event.sourceIpAddress}
            onChange={(e) => setEventOption('sourceIpAddress', e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`${id}EventSourceGeolocation`}
            label={sourceGeolocationLabel}
            checked={displayOptions.event.sourceGeolocation}
            onChange={(e) => setEventOption('sourceGeolocation', e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
