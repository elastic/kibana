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
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiPopoverProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useGraphFullscreenContext } from '../graph/graph_fullscreen_context';
import { GraphTopLeftFloatingPanel } from './graph_top_left_floating_panel';

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
    assetCriticality: boolean;
    source: boolean;
  };
  eventAlertMetadata: {
    sourceIpAddress: boolean;
    sourceGeolocation: boolean;
  };
}

export const DEFAULT_GRAPH_FILTERS: GraphFiltersState = {
  highlightOriginsOnly: false,
  relationshipTypes: {
    owns: true,
    accessFrequently: true,
    dependsOn: true,
    communicatesWith: true,
    reportsTo: true,
  },
  nodeMetadata: {
    ipAddress: false,
    geolocation: false,
    assetCriticality: false,
    source: false,
  },
  eventAlertMetadata: {
    sourceIpAddress: true,
    sourceGeolocation: true,
  },
};

/** Full Display menu vs Entity Metadata shortcut on entity hover. */
export type ApplyFiltersPopoverVariant = 'full' | 'nodeMetadata';

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

export const NODE_METADATA_LABELS: Record<keyof GraphFiltersState['nodeMetadata'], string> = {
  ipAddress: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.ipAddress', {
    defaultMessage: 'IP address(-es)',
  }),
  geolocation: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.geolocation',
    { defaultMessage: 'Geolocation(-s)' }
  ),
  assetCriticality: i18n.translate(
    'securitySolutionPackages.csp.graph.filters.nodeMetadata.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
  source: i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadata.source', {
    defaultMessage: 'Source',
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

const NODE_METADATA_SECTION_TITLE = i18n.translate(
  'securitySolutionPackages.csp.graph.filters.section.nodeMetadata',
  { defaultMessage: 'Node metadata' }
);

// ── Shared sections ───────────────────────────────────────────────────────────

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

export interface NodeMetadataFilterSectionProps {
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
  /** Prefix checkbox ids so Display + hover shortcuts can both mount safely. */
  idPrefix?: string;
}

/**
 * Entity / Node metadata toggles — shared by the Display menu and the entity
 * hover shortcut so both write the same {@link GraphFiltersState}.
 */
export const NodeMetadataFilterSection = ({
  filtersState,
  onFiltersChange,
  idPrefix = 'meta',
}: NodeMetadataFilterSectionProps) => {
  const toggle = (key: keyof GraphFiltersState['nodeMetadata']) => {
    onFiltersChange({
      ...filtersState,
      nodeMetadata: {
        ...filtersState.nodeMetadata,
        [key]: !filtersState.nodeMetadata[key],
      },
    });
  };

  return (
    <FilterSection title={NODE_METADATA_SECTION_TITLE}>
      {(
        Object.keys(filtersState.nodeMetadata) as Array<keyof GraphFiltersState['nodeMetadata']>
      ).map((key) => (
        <EuiFlexItem key={key} grow={false}>
          <EuiCheckbox
            id={`${idPrefix}-${key}`}
            label={<EuiText size="s">{NODE_METADATA_LABELS[key]}</EuiText>}
            checked={filtersState.nodeMetadata[key]}
            onChange={() => toggle(key)}
          />
        </EuiFlexItem>
      ))}
    </FilterSection>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface ApplyFiltersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
  /**
   * `full` — Display control (relationships + entity + event/alert metadata).
   * `nodeMetadata` — entity hover shortcut (Entity Metadata only).
   */
  variant?: ApplyFiltersPopoverVariant;
  /**
   * `anchored` — classic EuiPopover next to the trigger (hover shortcut).
   * `graphTopLeft` — fixed at the top-left of the graph canvas (bottom-bar Display).
   */
  placement?: 'anchored' | 'graphTopLeft';
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  children: React.ReactElement;
}

export const ApplyFiltersPopover = ({
  isOpen,
  onClose,
  filtersState,
  onFiltersChange,
  children,
  variant = 'full',
  placement = 'anchored',
  anchorPosition = 'upCenter',
}: ApplyFiltersPopoverProps) => {
  const fullscreenContext = useGraphFullscreenContext();
  const popoverContainer =
    fullscreenContext?.isFullscreen && fullscreenContext.overlayContainerRef.current
      ? fullscreenContext.overlayContainerRef.current
      : undefined;

  type ObjectFilterSection = 'relationshipTypes' | 'nodeMetadata' | 'eventAlertMetadata';

  const toggle = <K extends ObjectFilterSection>(section: K, key: keyof GraphFiltersState[K]) => {
    onFiltersChange({
      ...filtersState,
      [section]: {
        ...filtersState[section],
        [key]: !filtersState[section][key],
      },
    });
  };

  const highlightOriginsOnlyLabel = i18n.translate(
    'securitySolutionPackages.csp.graph.filters.highlightOriginsOnly',
    { defaultMessage: 'Highlight starting point' }
  );

  const isNodeMetadataOnly = variant === 'nodeMetadata';
  const checkboxIdPrefix = isNodeMetadataOnly ? 'hover-meta' : 'meta';

  const displayTitle = i18n.translate(
    'securitySolutionPackages.csp.graph.filters.popover.displayTitle',
    { defaultMessage: 'Display' }
  );
  const displayTitleId = useGeneratedHtmlId();

  const ariaLabel = isNodeMetadataOnly
    ? i18n.translate('securitySolutionPackages.csp.graph.filters.nodeMetadataPopover.ariaLabel', {
        defaultMessage: 'Entity metadata display options',
      })
    : i18n.translate('securitySolutionPackages.csp.graph.filters.popover.ariaLabel', {
        defaultMessage: 'Apply graph filters',
      });

  const panelBody = (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      css={css`
        min-width: 220px;
        max-width: 260px;
      `}
    >
      {isNodeMetadataOnly ? (
        <NodeMetadataFilterSection
          filtersState={filtersState}
          onFiltersChange={onFiltersChange}
          idPrefix={checkboxIdPrefix}
        />
      ) : (
        <>
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

          <FilterSection
            title={i18n.translate(
              'securitySolutionPackages.csp.graph.filters.section.relationships',
              {
                defaultMessage: 'Relationship types',
              }
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

          <NodeMetadataFilterSection
            filtersState={filtersState}
            onFiltersChange={onFiltersChange}
            idPrefix={checkboxIdPrefix}
          />

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
        </>
      )}
    </EuiFlexGroup>
  );

  if (placement === 'graphTopLeft') {
    return (
      <GraphTopLeftFloatingPanel
        isOpen={isOpen}
        onClose={onClose}
        title={displayTitle}
        titleId={displayTitleId}
        aria-label={ariaLabel}
        data-test-subj="graphDisplayOptionsPanel"
        body={
          <div
            css={css`
              padding: 12px;
            `}
          >
            {panelBody}
          </div>
        }
      >
        {children}
      </GraphTopLeftFloatingPanel>
    );
  }

  return (
    <EuiPopover
      button={children}
      isOpen={isOpen}
      closePopover={onClose}
      container={popoverContainer}
      closePopoverOnScroll={false}
      anchorPosition={anchorPosition}
      panelPaddingSize="m"
      panelProps={{
        onMouseDown: (event) => {
          event.stopPropagation();
        },
      }}
      aria-label={ariaLabel}
    >
      {panelBody}
    </EuiPopover>
  );
};
