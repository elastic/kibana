/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Meta keys are completely arbitrary in a YARA rule, but we are interested in the keys below.
 */
export enum YaraMetaKeyOfInterest {
  OS = 'os',
  ARCH = 'arch',
  SCAN_TYPE = 'scan_type',
}

export enum MetaArchValue {
  X86 = 'x86',
  ARM64 = 'arm64',
}

export enum MetaScanTypeValue {
  MEMORY = 'Memory',
}

export enum MetaOsValue {
  WINDOWS = 'Windows',
  LINUX = 'Linux',
  MACOS = 'MacOS',
}
