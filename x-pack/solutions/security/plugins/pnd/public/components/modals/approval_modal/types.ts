/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { IconColor, IconType } from '@elastic/eui';

export type ApprovalModalTone = 'primary' | 'danger';

export interface BlastRadiusItemStatus {
  label: string;
  /** @default 'check' */
  iconType?: IconType;
  /** @default 'success' */
  color?: 'success' | 'warning' | 'danger';
}

export interface BlastRadiusItem {
  id: string;
  iconType: IconType;
  /** Defaults to the modal tone's icon color */
  iconColor?: IconColor;
  /** Rich text — caller composes <strong>, <EuiCode>, <FormattedMessage>, etc. */
  text: React.ReactNode;
  status?: BlastRadiusItemStatus;
}

export type BlastRadiusContent =
  | { variant: 'list'; items: BlastRadiusItem[] }
  | { variant: 'description'; description: React.ReactNode };

export interface ApprovalActor {
  /** @default 'bullseye' */
  iconType?: IconType;
  /** Rendered bold, e.g. "You" */
  name: React.ReactNode;
  /** e.g. "Senior Analyst · identity actions permitted" */
  detail: React.ReactNode;
}

export interface ApprovalAlwaysAllowOption {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ApprovalModalProps {
  /** @default 'primary' */
  tone?: ApprovalModalTone;
  /** Header avatar glyph, e.g. 'lock' or 'gear' */
  iconType: IconType;
  /** @default translated "Approval required" */
  warningLabel?: string;
  title: string;
  blastRadius: BlastRadiusContent;
  actor?: ApprovalActor;
  alwaysAllow?: ApprovalAlwaysAllowOption;
  onConfirm: () => void;
  /** @default translated "Cancel" */
  cancelLabel?: string;
  onClose: () => void;
  'data-test-subj'?: string;
}
