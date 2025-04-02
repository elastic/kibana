/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import FindingsMisconfigurationFlyoutHeader from './header';

const getChildrenOnDisplayName = (children, displayName) =>
  React.Children.map(children, (child) => (child.type.displayName === displayName ? child : null));

const MisconfigurationFindingFlyout = ({ children }) => {
  return <div>{children}</div>;
};

const Header = ({
  ruleName,
  timestamp,
  rulesTags,
  resourceName,
  framework,
  vendor,
  ruleBenchmarkId,
  ruleBenchmarkName,
}: {
  ruleName: string;
  timestamp: Date;
  rulesTags: string[];
  resourceName: string;
  framework: string[];
  vendor: string;
  ruleBenchmarkId: string;
  ruleBenchmarkName: string;
}) => (
  <>
    <FindingsMisconfigurationFlyoutHeader
      ruleName={ruleName}
      timestamp={timestamp}
      rulesTags={rulesTags}
      resourceName={resourceName}
      vendor={vendor}
      ruleBenchmarkName={ruleBenchmarkId}
      ruleBenchmarkId={ruleBenchmarkName}
    />
  </>
);

Header.displayname = 'Header';
MisconfigurationFindingFlyout.Header = Header;

const Body = ({ ruleName }: { ruleName: string }) => (
  <>
    <div>{ruleName}</div>
  </>
);

Body.displayname = 'Body';
MisconfigurationFindingFlyout.Body = Body;

// eslint-disable-next-line import/no-default-export
// export default FindingsMisconfigurationFlyoutHeader;
// eslint-disable-next-line import/no-default-export
export default MisconfigurationFindingFlyout;