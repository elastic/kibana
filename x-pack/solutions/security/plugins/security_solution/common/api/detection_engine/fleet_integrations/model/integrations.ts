/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// -------------------------------------------------------------------------------------------------
// Fleet Package Integration

/**
 * Information about a Fleet integration including info about its package.
 *
 * @example
 * {
 *   package_name: 'aws',
 *   package_title: 'AWS',
 *   integration_name: 'cloudtrail',
 *   integration_title: 'AWS CloudTrail',
 *   latest_package_version: '1.2.3',
 *   is_installed: false
 *   is_enabled: false
 * }
 *
 * @example
 * {
 *   package_name: 'aws',
 *   package_title: 'AWS',
 *   integration_name: 'cloudtrail',
 *   integration_title: 'AWS CloudTrail',
 *   latest_package_version: '1.16.1',
 *   installed_package_version: '1.16.1',
 *   is_installed: true
 *   is_enabled: false
 * }
 *
 * @example
 * {
 *   package_name: 'system',
 *   package_title: 'System',
 *   latest_package_version: '2.0.1',
 *   installed_package_version: '1.13.0',
 *   is_installed: true
 *   is_enabled: true
 * }
 *
 */
export interface Integration {
  /**
   * Name is a unique package id within a given cluster.
   * There can't be 2 or more different packages with the same name.
   * @example 'aws'
   */
  package_name: string;

  /**
   * Title is a user-friendly name of the package that we show in the UI.
   * @example 'AWS'
   */
  package_title: string;

  /**
   * Whether the package is installed
   */
  is_installed: boolean;

  /**
   * Whether this integration is enabled
   */
  is_enabled: boolean;

  /**
   * Version of the latest available package. Semver-compatible.
   * @example '1.2.3'
   */
  latest_package_version: string;

  /**
   * Version of the installed package. Semver-compatible.
   * @example '1.2.3'
   */
  installed_package_version?: string;

  /**
   * Name identifies an integration within its package.
   * Undefined when package name === integration name. This indicates that it's the only integration
   * within this package.
   * @example 'cloudtrail'
   * @example undefined
   */
  integration_name?: string;

  /**
   * Title is a user-friendly name of the integration that we show in the UI.
   * Undefined when package name === integration name. This indicates that it's the only integration
   * within this package.
   * @example 'AWS CloudTrail'
   * @example undefined
   */
  integration_title?: string;
}
