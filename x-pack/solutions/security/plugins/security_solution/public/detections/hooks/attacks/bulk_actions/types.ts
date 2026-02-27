/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionsConfig, ContentPanelConfig } from '@kbn/response-ops-alerts-table/types';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import type { AlertWorkflowStatus } from '../../../../common/types';

/**
 * Base props shared by all apply attack hooks.
 * These props are common to all hooks that apply bulk actions to attacks and related alerts.
 */
export interface BaseApplyAttackProps {
  /** IDs of attacks to update */
  attackIds: string[];
  /** IDs of related alerts to potentially update */
  relatedAlertIds: string[];
  /** Optional callback to set loading state */
  setIsLoading?: (loading: boolean) => void;
  /** Optional callback when operation succeeds */
  onSuccess?: () => void;
}

/**
 * Base props shared by all attack context menu items hooks.
 * These props are common to all hooks that provide context menu items for a single attack and its related alerts.
 */
export interface BaseAttackContextMenuItemsProps {
  /** Optional callback to clear selection */
  clearSelection?: () => void;
  /** Optional callback to close the popover menu */
  closePopover?: () => void;
  /** Optional callback when operation succeeds */
  onSuccess?: () => void;
  /** Optional callback to refresh data */
  refresh?: () => void;
  /** Optional callback to set loading state */
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Base properties shared by all attack-related types.
 * Contains the fundamental identification information for an attack and its related alerts.
 */
export interface BaseAttackProps {
  /** ID of the attack */
  attackId: string;
  /** IDs of related alerts */
  relatedAlertIds: string[];
}

/**
 * Represents an attack with its workflow status information.
 * Used by context menu hooks to provide workflow status management functionality.
 */
export interface AttackWithWorkflowStatus extends BaseAttackProps {
  /** Workflow status of the attack */
  workflowStatus?: AlertWorkflowStatus;
}

/**
 * Represents an attack with its assignees information.
 * Used by context menu hooks to provide assignee management functionality.
 */
export interface AttackWithAssignees extends BaseAttackProps {
  /** Assignees of the attack */
  assignees?: string[];
}

/**
 * Represents an attack with its tags information.
 * Used by context menu hooks to provide tag management functionality.
 */
export interface AttackWithTags extends BaseAttackProps {
  /** Tags of the attack */
  tags?: string[];
}

/**
 * Represents an attack with markdown used for case attachments.
 * The related alert IDs are used to attach alerts to a case.
 */
export interface AttackWithCase extends BaseAttackProps {
  /** Markdown comment describing the attack */
  markdownComment: string;
}

/**
 * Represents an attack with alert IDs that should be investigated in Timeline.
 */
export type AttackWithTimelineAlerts = BaseAttackProps;

/**
 * Extended content panel configuration for attack bulk actions.
 * Adds optional width property to support custom panel sizing (e.g., for assignees panel).
 */
export type AttackContentPanelConfig = ContentPanelConfig & {
  width?: number;
};

/**
 * Bulk action items and panels returned by bulk action hooks.
 * Contains the configuration for bulk action menu items and their associated panels.
 */
export interface BulkAttackActionItems {
  items: BulkActionsConfig[];
  panels: AttackContentPanelConfig[];
}

/**
 * Context menu items and panels returned by context menu hooks.
 * Contains the transformed items and panels ready for use with EuiContextMenu component.
 */
export interface BulkAttackContextMenuItems {
  items: EuiContextMenuPanelItemDescriptorEntry[];
  panels: EuiContextMenuPanelDescriptor[];
}
