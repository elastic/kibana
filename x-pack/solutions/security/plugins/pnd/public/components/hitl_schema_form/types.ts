/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The subset of JSON Schema the HITL form renders.
 *
 * A gate's schema arrives on the wire as `PndProposalRow.inputSchema`, typed
 * `Record<string, unknown>` because the orchestrator may put anything there.
 * These types describe the shape that is actually renderable; nothing else in
 * the plugin may assert them directly — `canRenderWithSchemaForm` is the only
 * way in, so an unrenderable schema falls back to the fixed controls rather
 * than rendering garbage.
 */

/** Property types the renderer has a control for. */
export const PND_SCHEMA_FORM_FIELD_TYPES = ['array', 'boolean', 'number', 'string'] as const;

export type PndSchemaFormFieldType = (typeof PND_SCHEMA_FORM_FIELD_TYPES)[number];

/** A value an `enum` (or an array's `items.enum`) may offer. */
export type PndSchemaFormEnumMember = number | string;

export interface PndSchemaFormFieldSchema {
  /** Seeds the form when it opens. @see extractSchemaDefaults */
  default?: unknown;
  /** Rendered as the form row's help text. */
  description?: string;
  /** A non-empty enum wins over `type`, except on an `array`. */
  enum?: PndSchemaFormEnumMember[];
  /** An `array`'s members. `items.enum` is what the combo box offers. */
  items?: { enum?: PndSchemaFormEnumMember[]; type?: 'number' | 'string' };
  /** Rendered as the form row's label, falling back to the property name. */
  title?: string;
  type: PndSchemaFormFieldType;
}

export interface PndSchemaFormSchema {
  properties: Record<string, PndSchemaFormFieldSchema>;
  required?: string[];
  type?: 'object';
}
