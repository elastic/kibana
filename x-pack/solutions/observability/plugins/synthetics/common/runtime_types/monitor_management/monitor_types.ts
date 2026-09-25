/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type { secretKeys } from '../../constants/monitor_management';
import {
  APIAdvancedFieldsCodec,
  APIFieldsCodec,
  APISensitiveAdvancedFieldsCodec,
  APISensitiveSimpleFieldsCodec,
  APISimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
  BrowserFieldsCodec,
  BrowserSensitiveAdvancedFieldsCodec,
  BrowserSensitiveSimpleFieldsCodec,
  BrowserSimpleFieldsCodec,
  CommonFieldsCodec,
  EncryptedAPIAdvancedFieldsCodec,
  EncryptedAPIFieldsCodec,
  EncryptedAPISimpleFieldsCodec,
  EncryptedBrowserAdvancedFieldsCodec,
  EncryptedBrowserFieldsCodec,
  EncryptedBrowserSimpleFieldsCodec,
  EncryptedHTTPFieldsCodec,
  EncryptedSyntheticsMonitorCodec,
  EncryptedSyntheticsSavedMonitorCodec,
  EncryptedTCPFieldsCodec,
  HTTPAdvancedCodec,
  HTTPAdvancedFieldsCodec,
  HTTPFieldsCodec,
  HTTPSensitiveAdvancedFieldsCodec,
  HTTPSimpleFieldsCodec,
  HeartbeatConfigCodec,
  HeartbeatFieldsCodec,
  ICMPAdvancedFieldsCodec,
  ICMPFieldsCodec,
  ICMPSimpleFieldsCodec,
  MonitorDefaultsCodec,
  MonitorFieldsCodec,
  MonitorFieldsResultCodec,
  MonitorLocationsCodec,
  MonitorManagementListResultCodec,
  ScheduleCodec,
  SyntheticsMonitorCodec,
  SyntheticsMonitorWithIdCodec,
  SyntheticsMonitorWithSecretsCodec,
  TCPAdvancedCodec,
  TCPAdvancedFieldsCodec,
  TCPFieldsCodec,
  TCPSensitiveAdvancedFieldsCodec,
  TCPSimpleFieldsCodec,
  TLSCodec,
  TLSFieldsCodec,
  TLSSensitiveFieldsCodec,
  ThrottlingConfigCodec,
  ThrottlingConfigValueCodec,
} from '../zod/monitor_types';

export {
  APIAdvancedFieldsCodec,
  APIFieldsCodec,
  APISensitiveAdvancedFieldsCodec,
  APISensitiveSimpleFieldsCodec,
  APISimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
  BrowserFieldsCodec,
  BrowserSensitiveAdvancedFieldsCodec,
  BrowserSensitiveSimpleFieldsCodec,
  BrowserSimpleFieldsCodec,
  CommonFieldsCodec,
  EncryptedAPIAdvancedFieldsCodec,
  EncryptedAPIFieldsCodec,
  EncryptedAPISimpleFieldsCodec,
  EncryptedBrowserAdvancedFieldsCodec,
  EncryptedBrowserFieldsCodec,
  EncryptedBrowserSimpleFieldsCodec,
  EncryptedHTTPFieldsCodec,
  EncryptedSyntheticsMonitorCodec,
  EncryptedSyntheticsSavedMonitorCodec,
  EncryptedTCPFieldsCodec,
  HTTPAdvancedCodec,
  HTTPAdvancedFieldsCodec,
  HTTPFieldsCodec,
  HTTPSensitiveAdvancedFieldsCodec,
  HTTPSimpleFieldsCodec,
  HeartbeatConfigCodec,
  HeartbeatFieldsCodec,
  ICMPAdvancedFieldsCodec,
  ICMPFieldsCodec,
  ICMPSimpleFieldsCodec,
  MonitorDefaultsCodec,
  MonitorFieldsCodec,
  MonitorFieldsResultCodec,
  MonitorLocationsCodec,
  MonitorManagementListResultCodec,
  ScheduleCodec,
  SyntheticsMonitorCodec,
  SyntheticsMonitorWithIdCodec,
  SyntheticsMonitorWithSecretsCodec,
  TCPAdvancedCodec,
  TCPAdvancedFieldsCodec,
  TCPFieldsCodec,
  TCPSensitiveAdvancedFieldsCodec,
  TCPSimpleFieldsCodec,
  TLSCodec,
  TLSFieldsCodec,
  TLSSensitiveFieldsCodec,
  ThrottlingConfigCodec,
  ThrottlingConfigValueCodec,
};

export type MonitorLocations = SchemaOutput<typeof MonitorLocationsCodec>;
export type TCPAdvancedFields = SchemaOutput<typeof TCPAdvancedCodec>;
export type TCPFields = SchemaOutput<typeof TCPFieldsCodec>;
export type ICMPSimpleFields = SchemaOutput<typeof ICMPSimpleFieldsCodec>;
export type ICMPFields = SchemaOutput<typeof ICMPFieldsCodec>;
export type HTTPSimpleFields = SchemaOutput<typeof HTTPSimpleFieldsCodec>;
export type HTTPAdvancedFields = SchemaOutput<typeof HTTPAdvancedCodec>;
export type ThrottlingConfigValue = SchemaOutput<typeof ThrottlingConfigValueCodec>;
export type ThrottlingConfig = SchemaOutput<typeof ThrottlingConfigCodec>;
export type SyntheticsMonitorSchedule = SchemaOutput<typeof ScheduleCodec>;
export type TLSFields = SchemaOutput<typeof TLSCodec>;
export type CommonFields = SchemaOutput<typeof CommonFieldsCodec>;
export type TCPSimpleFields = SchemaOutput<typeof TCPSimpleFieldsCodec>;
export type HTTPFields = SchemaOutput<typeof HTTPFieldsCodec>;
export type BrowserFields = SchemaOutput<typeof BrowserFieldsCodec>;
export type BrowserSimpleFields = SchemaOutput<typeof BrowserSimpleFieldsCodec>;
export type BrowserAdvancedFields = SchemaOutput<typeof BrowserAdvancedFieldsCodec>;
export type APIFields = SchemaOutput<typeof APIFieldsCodec>;
export type APISimpleFields = SchemaOutput<typeof APISimpleFieldsCodec>;
export type APIAdvancedFields = SchemaOutput<typeof APIAdvancedFieldsCodec>;
export type MonitorFields = SchemaOutput<typeof MonitorFieldsCodec>;
export type MonitorFieldsResult = SchemaOutput<typeof MonitorFieldsResultCodec>;
export type HeartbeatFields = SchemaOutput<typeof HeartbeatFieldsCodec>;
export type SyntheticsMonitor = SchemaOutput<typeof SyntheticsMonitorCodec>;
export type SyntheticsMonitorWithId = SchemaOutput<typeof SyntheticsMonitorWithIdCodec>;
export type EncryptedSyntheticsSavedMonitor = SchemaOutput<
  typeof EncryptedSyntheticsSavedMonitorCodec
>;
export type HeartbeatConfig = SchemaOutput<typeof HeartbeatConfigCodec>;
export type MonitorDefaults = SchemaOutput<typeof MonitorDefaultsCodec>;
export type MonitorManagementListResult = SchemaOutput<typeof MonitorManagementListResultCodec>;
export type Secret = (typeof secretKeys)[number];
export type SyntheticsMonitorWithSecrets = Omit<
  SchemaOutput<typeof SyntheticsMonitorWithSecretsCodec>,
  Secret
>;
export type SyntheticsMonitorWithSecretsAttributes = Omit<
  SchemaOutput<typeof SyntheticsMonitorWithSecretsCodec>,
  Secret
>;
export type EncryptedSyntheticsMonitor = Omit<SyntheticsMonitorWithSecrets, 'secrets'>;
export type EncryptedSyntheticsMonitorAttributes = Omit<SyntheticsMonitorWithSecrets, 'secrets'>;
