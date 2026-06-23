/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GraphFiltersState {
  highlightOriginsOnly: boolean;
  relationshipTypes: {
    owns: boolean;
    accessFrequently: boolean;
    dependsOn: boolean;
    communicatesWith: boolean;
    reportsTo: boolean;
  };
  nodeMetadata: {
    ipAddress: boolean;
    geolocation: boolean;
    entityId: boolean;
    assetCriticality: boolean;
    riskScore: boolean;
  };
  eventAlertMetadata: {
    sourceIpAddress: boolean;
    sourceGeolocation: boolean;
  };
}

export const DEFAULT_GRAPH_FILTERS: GraphFiltersState = {
  highlightOriginsOnly: true,
  relationshipTypes: {
    owns: true,
    accessFrequently: true,
    dependsOn: true,
    communicatesWith: true,
    reportsTo: true,
  },
  nodeMetadata: {
    ipAddress: true,
    geolocation: true,
    entityId: true,
    assetCriticality: true,
    riskScore: true,
  },
  eventAlertMetadata: {
    sourceIpAddress: true,
    sourceGeolocation: true,
  },
};

// ── Labels ────────────────────────────────────────────────────────────────────

const RELATIONSHIP_LABELS: Record<keyof GraphFiltersState['relationshipTypes'], string> = {
  owns: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.owns', {
    defaultMessage: 'Owns',
  }),
  accessFrequently: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.relationship.accessFrequently',
    { defaultMessage: 'Access frequently' }
  ),
  dependsOn: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.dependsOn', {
    defaultMessage: 'Depends on',
  }),
  communicatesWith: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.relationship.communicatesWith',
    { defaultMessage: 'Communicates with' }
  ),
  reportsTo: i18n.translate('securitySolutionPackages.csp.graph.filters.relationship.reportsTo', {
    defaultMessage: 'Reports to',
  }),
};

const NODE_METADATA_LABELS: Record<keyof GraphFiltersState['nodeMetadata'], string> = {
  ipAddress: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.ipAddress', {
    defaultMessage: 'IP address(-es)',
  }),
  geolocation: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.geolocation',
    { defaultMessage: 'Geolocation(-s)' }
  ),
  entityId: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.entityId', {
    defaultMessage: 'Entity ID',
  }),
  assetCriticality: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
  riskScore: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.riskScore', {
    defaultMessage: 'Risk score',
  }),
};

const EVENT_ALERT_LABELS: Record<keyof GraphFiltersState['eventAlertMetadata'], string> = {
  sourceIpAddress: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.eventAlert.sourceIpAddress',
    { defaultMessage: 'Source IP address(-es)' }
  ),
  sourceGeolocation: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.eventAlert.sourceGeolocation',
    { defaultMessage: 'Source geolocation(-s)' }
  ),
};

// ── Component ─────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
}

const FilterSection = ({ title, children }: PropsWithChildren<SectionProps>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxxs">
        <h4
          css={css`
            margin-bottom: ${euiTheme.size.xs};
          `}
        >
          {title}
        </h4>
      </EuiTitle>
      <EuiFlexGroup direction="column" gutterSize="xs">
        {children}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export interface ApplyFiltersPopoverProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
}

export const ApplyFiltersPopover = ({
  isOpen,
  onClose,
  filtersState,
  onFiltersChange,
  children,
}: ApplyFiltersPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const fullscreenContext = useGraphFullscreenContext();
  const popoverContainer =
    fullscreenContext?.isFullscreen && fullscreenContext.overlayContainerRef.current
      ? fullscreenContext.overlayContainerRef.current
      : undefined;

  const toggle = <K extends keyof GraphFiltersState>(
    section: K,
    key: keyof GraphFiltersState[K]
  ) => {
    onFiltersChange({
      ...filtersState,
      [section]: {
        ...filtersState[section],
        [key]: !(filtersState[section] as Record<string, boolean>)[key as string],
      },
    });
  };

  const highlightOriginsOnlyLabel = i18n.translate(
    'securitySolutionPackages.csp.graph.filters.highlightOriginsOnly',
    { defaultMessage: 'Highlight origin entities and events' }
  );

  return (
    <EuiPopover
      button={children}
      isOpen={isOpen}
      closePopover={onClose}
      container={popoverContainer}
      closePopoverOnScroll={false}
      anchorPosition="upCenter"
      panelPaddingSize="m"
      panelProps={{
        onMouseDown: (event) => {
          event.stopPropagation();
        },
      }}
      aria-label={i18n.translate('securitySolutionPackages.csp.graph.filters.popover.ariaLabel', {
        defaultMessage: 'Apply graph filters',
      })}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        css={css`
          min-width: 220px;
          max-width: 260px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="graph-highlight-origins-only"
            label={<EuiText size="s">{highlightOriginsOnlyLabel}</EuiText>}
            checked={filtersState.highlightOriginsOnly}
            onChange={() =>
              onFiltersChange({
                ...filtersState,
                highlightOriginsOnly: !filtersState.highlightOriginsOnly,
              })
            }
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiHorizontalRule size="full" margin="none" />
        </EuiFlexItem>

        {/* Relationship types */}
        <FilterSection
          title={i18n.translate(
            'securitySolutionPackages.csp.graph.filters.section.relationships',
            { defaultMessage: 'Relationship types' }
          )}
        >
          {(
            Object.keys(filtersState.relationshipTypes) as Array<
              keyof GraphFiltersState['relationshipTypes']
            >
          ).map((key) => (
            <EuiFlexItem key={key} grow={false}>
              <EuiCheckbox
                id={`rel-${key}`}
                label={<EuiText size="s">{RELATIONSHIP_LABELS[key]}</EuiText>}
                checked={filtersState.relationshipTypes[key]}
                onChange={() => toggle('relationshipTypes', key)}
              />
            </EuiFlexItem>
          ))}
        </FilterSection>

        {/* Node metadata */}
        <FilterSection
          title={i18n.translate('securitySolutionPackages.csp.graph.filters.section.nodeMetadata', {
            defaultMessage: 'Node metadata',
          })}
        >
          {(
            Object.keys(filtersState.nodeMetadata) as Array<keyof GraphFiltersState['nodeMetadata']>
          ).map((key) => (
            <EuiFlexItem key={key} grow={false}>
              <EuiCheckbox
                id={`meta-${key}`}
                label={<EuiText size="s">{NODE_METADATA_LABELS[key]}</EuiText>}
                checked={filtersState.nodeMetadata[key]}
                onChange={() => toggle('nodeMetadata', key)}
              />
            </EuiFlexItem>
          ))}
        </FilterSection>

        {/* Event/alert metadata */}
        <FilterSection
          title={i18n.translate(
            'securitySolutionPackages.csp.graph.filters.section.eventAlertMetadata',
            { defaultMessage: 'Event/alert metadata' }
          )}
        >
          {(
            Object.keys(filtersState.eventAlertMetadata) as Array<
              keyof GraphFiltersState['eventAlertMetadata']
            >
          ).map((key) => (
            <EuiFlexItem key={key} grow={false}>
              <EuiCheckbox
                id={`evt-${key}`}
                label={<EuiText size="s">{EVENT_ALERT_LABELS[key]}</EuiText>}
                checked={filtersState.eventAlertMetadata[key]}
                onChange={() => toggle('eventAlertMetadata', key)}
              />
            </EuiFlexItem>
          ))}
        </FilterSection>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
