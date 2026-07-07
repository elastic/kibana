/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUDBEAT_AWS = 'cloudbeat/asset_inventory_aws';
export const CLOUDBEAT_AZURE = 'cloudbeat/asset_inventory_azure';
export const CLOUDBEAT_GCP = 'cloudbeat/asset_inventory_gcp';

export const SUPPORTED_CLOUDBEAT_INPUTS = [CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE] as const;

export const ASSET_POLICY_TEMPLATE = 'asset_inventory';
