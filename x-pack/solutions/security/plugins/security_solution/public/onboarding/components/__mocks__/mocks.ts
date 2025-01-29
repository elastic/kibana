/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockReportCardOpen = jest.fn();
export const mockReportCardComplete = jest.fn();
export const mockReportCardLinkClicked = jest.fn();

export const telemetry = {
  reportCardOpen: mockReportCardOpen,
  reportCardComplete: mockReportCardComplete,
  reportCardLinkClicked: mockReportCardLinkClicked,
};
export const mockTelemetry = jest.fn(() => telemetry);

export const onboardingContext = {
  spaceId: 'default',
  telemetry: mockTelemetry(),
  config: new Map(),
};
export const mockOnboardingContext = jest.fn(() => onboardingContext);
