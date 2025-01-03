/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsFieldMap8130 } from '../8.13.0';

export const alertsFieldMap8160 = {
  ...alertsFieldMap8130,
  'kibana.alert.original_event.action': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.agent_id_status': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.category': {
    type: 'keyword',
    array: true,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.code': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.dataset': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.duration': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.hash': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.id': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.kind': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.module': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.original': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.outcome': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.provider': {
    type: 'keyword',
    array: false,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.reason': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.reference': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.timezone': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.type': {
    type: 'keyword',
    array: true,
    required: true,
    ignore_above: 1024,
  },
  'kibana.alert.original_event.url': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
} as const;

export type AlertsFieldMap8160 = typeof alertsFieldMap8160;
