/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityTool } from '../constants';

export const SIEM_READINESS_COVERAGE_TOOL_ID = securityTool('siem_readiness.get_coverage');
export const SIEM_READINESS_QUALITY_TOOL_ID = securityTool('siem_readiness.get_quality');
export const SIEM_READINESS_CONTINUITY_TOOL_ID = securityTool('siem_readiness.get_continuity');
export const SIEM_READINESS_RETENTION_TOOL_ID = securityTool('siem_readiness.get_retention');
