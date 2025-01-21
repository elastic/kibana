/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

// importing common types from Cloud Security Posture
import type {
  FindingsExpandableFlyoutProps,
  GetFindingsExpandableFlyout,
} from '@kbn/cloud-security-posture-plugin/public/application/csp_router';

// Example of FindingExpandableFlyout component in Security Solution
// This should be a wrapper component that will import all the necessary components from Security Solution
export const FindingsExpandableFlyout = (props: FindingsExpandableFlyoutProps) => {
  return (
    <pre>
      {`This is an example of a component from Security Solution receiving props from Cloud Security Posture:
    ruleId: ${props.ruleId}
    resourceId: ${props.resourceId}`}
    </pre>
  );
};

// Example of a getFindingsExpandableFlyout function in Security Solution, this can also be a lazy loaded component
export const getFindingsExpandableFlyout: GetFindingsExpandableFlyout = (props) => {
  return <FindingsExpandableFlyout {...props} />;
};
