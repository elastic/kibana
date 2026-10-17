/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Content-free Endpoint findings, also mapped in endpoint-package.
export const endpointAgentExposureFieldMap = {
  'event.Ext.agent_exposure.application_attribution': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.artifact_class': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.classifier': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.content_omitted': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'event.Ext.agent_exposure.contract_version': {
    type: 'long',
    array: false,
    required: false,
  },
  'event.Ext.agent_exposure.credential_writer': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.detector_ids': {
    type: 'keyword',
    array: true,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.evidence': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.evidence_trust': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.file_identity': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.harness': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.harness_source': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.history_omitted': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'event.Ext.agent_exposure.observation_outcome': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.observation_scope': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.process_role': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.qualification': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.ruleset_source': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.ruleset_version': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
  'event.Ext.agent_exposure.scan_complete': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'event.Ext.agent_exposure.stage': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 256,
  },
} as const;
