/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { LoggedRequestsQuery } from './logged_requests_query';

const description = 'Retrieve source documents when ES|QL query is not aggregable';
const duration = 8;
const request =
  'POST /packetbeat-8.14.2/_search?ignore_unavailable=true\n{\n  "query": {\n    "bool": {\n      "filter": {\n        "ids": {\n          "values": [\n            "yB7awpEBluhaSO8ejVKZ",\n            "yR7awpEBluhaSO8ejVKZ",\n            "yh7awpEBluhaSO8ejVKZ",\n            "yx7awpEBluhaSO8ejVKZ",\n            "zB7awpEBluhaSO8ejVKZ",\n            "zR7awpEBluhaSO8ejVKZ",\n            "zh7awpEBluhaSO8ejVKZ",\n            "zx7awpEBluhaSO8ejVKZ",\n            "0B7awpEBluhaSO8ejVKZ",\n            "0R7awpEBluhaSO8ejVKZ",\n            "0h7awpEBluhaSO8ejVKZ",\n            "0x7awpEBluhaSO8ejVKZ",\n            "1B7awpEBluhaSO8ejVKZ",\n            "1R7awpEBluhaSO8ejVKZ",\n            "1h7awpEBluhaSO8ejVKZ",\n            "1x7awpEBluhaSO8ejVKZ",\n            "2B7awpEBluhaSO8ejVKZ",\n            "2R7awpEBluhaSO8ejVKZ",\n            "2h7awpEBluhaSO8ejVKZ",\n            "2x7awpEBluhaSO8ejVKZ",\n            "3B7awpEBluhaSO8ejVKZ",\n            "3R7awpEBluhaSO8ejVKZ",\n            "3h7awpEBluhaSO8ejVKZ",\n            "3x7awpEBluhaSO8ejVKZ",\n            "4B7awpEBluhaSO8ejVKZ",\n            "4R7awpEBluhaSO8ejVKZ",\n            "4h7awpEBluhaSO8ejVKZ",\n            "4x7awpEBluhaSO8ejVKZ",\n            "5B7awpEBluhaSO8ejVKZ",\n            "5R7awpEBluhaSO8ejVKZ",\n            "5h7awpEBluhaSO8ejVKZ",\n            "5x7awpEBluhaSO8ejVKZ",\n            "6B7awpEBluhaSO8ejVKZ",\n            "6R7awpEBluhaSO8ejVKZ",\n            "6h7awpEBluhaSO8ejVKZ",\n            "6x7awpEBluhaSO8ejVKZ",\n            "7B7awpEBluhaSO8ejVKZ",\n            "7R7awpEBluhaSO8ejVKZ",\n            "7h7awpEBluhaSO8ejVKZ",\n            "7x7awpEBluhaSO8ejVKZ",\n            "8B7awpEBluhaSO8ejVKZ",\n            "8R7awpEBluhaSO8ejVKZ",\n            "8h7awpEBluhaSO8ejVKZ",\n            "8x7awpEBluhaSO8ejVKZ",\n            "9B7awpEBluhaSO8ejVKZ",\n            "9R7awpEBluhaSO8ejVKZ",\n            "9h7awpEBluhaSO8ejVKZ",\n            "9x7awpEBluhaSO8ejVKZ",\n            "-B7awpEBluhaSO8ejVKZ",\n            "-R7awpEBluhaSO8ejVKZ",\n            "-h7awpEBluhaSO8ejVKZ",\n            "-x7awpEBluhaSO8ejVKZ",\n            "_B7awpEBluhaSO8ejVKZ",\n            "_R7awpEBluhaSO8ejVKZ",\n            "_h7awpEBluhaSO8ejVKZ",\n            "_x7awpEBluhaSO8ejVKZ",\n            "AB7awpEBluhaSO8ejVOZ",\n            "AR7awpEBluhaSO8ejVOZ",\n            "Ah7awpEBluhaSO8ejVOZ",\n            "Ax7awpEBluhaSO8ejVOZ",\n            "BB7awpEBluhaSO8ejVOZ",\n            "BR7awpEBluhaSO8ejVOZ",\n            "Bh7awpEBluhaSO8ejVOZ",\n            "Bx7awpEBluhaSO8ejVOZ",\n            "CB7awpEBluhaSO8ejVOZ",\n            "CR7awpEBluhaSO8ejVOZ",\n            "Ch7awpEBluhaSO8ejVOZ",\n            "Cx7awpEBluhaSO8ejVOZ",\n            "DB7awpEBluhaSO8ejVOZ",\n            "DR7awpEBluhaSO8ejVOZ",\n            "Dh7awpEBluhaSO8ejVOZ",\n            "Dx7awpEBluhaSO8ejVOZ",\n            "EB7awpEBluhaSO8ejVOZ",\n            "ER7awpEBluhaSO8ejVOZ",\n            "Eh7awpEBluhaSO8ejVOZ",\n            "Ex7awpEBluhaSO8ejVOZ",\n            "FB7awpEBluhaSO8ejVOZ",\n            "FR7awpEBluhaSO8ejVOZ",\n            "Fh7awpEBluhaSO8ejVOZ",\n            "Fx7awpEBluhaSO8ejVOZ",\n            "GB7awpEBluhaSO8ejVOZ",\n            "GR7awpEBluhaSO8ejVOZ",\n            "Gh7awpEBluhaSO8ejVOZ",\n            "Gx7awpEBluhaSO8ejVOZ",\n            "HB7awpEBluhaSO8ejVOZ",\n            "HR7awpEBluhaSO8ejVOZ",\n            "Hh7awpEBluhaSO8ejVOZ",\n            "Hx7awpEBluhaSO8ejVOZ",\n            "IB7awpEBluhaSO8ejVOZ",\n            "IR7awpEBluhaSO8ejVOZ",\n            "Ih7awpEBluhaSO8ejVOZ",\n            "Ix7awpEBluhaSO8ejVOZ",\n            "JB7awpEBluhaSO8ejVOZ",\n            "JR7awpEBluhaSO8ejVOZ",\n            "Jh7awpEBluhaSO8ejVOZ",\n            "Jx7awpEBluhaSO8ejVOZ",\n            "KB7awpEBluhaSO8ejVOZ",\n            "KR7awpEBluhaSO8ejVOZ",\n            "Kh7awpEBluhaSO8ejVOZ",\n            "Kx7awpEBluhaSO8ejVOZ",\n            "LB7awpEBluhaSO8ejVOZ"\n          ]\n        }\n      }\n    }\n  },\n  "_source": false,\n  "fields": [\n    "*"\n  ]\n}';

describe('LoggedRequestsQuery', () => {
  it('should not render code block when request field is empty', () => {
    render(<LoggedRequestsQuery description={description} duration={duration} />);

    expect(screen.queryByTestId('preview-logged-request-code-block')).toBeNull();
  });

  it('should render code block', () => {
    render(<LoggedRequestsQuery description={description} duration={duration} request={request} />);

    expect(screen.queryByTestId('preview-logged-request-code-block')).toHaveTextContent(
      'POST /packetbeat-8.14.2/_search?ignore_unavailable=true'
    );
  });

  it('should render duration', () => {
    render(<LoggedRequestsQuery description={description} duration={duration} request={request} />);

    expect(screen.queryByTestId('preview-logged-request-description')).toHaveTextContent('8ms');
  });

  it('should not render duration when it absent', () => {
    render(<LoggedRequestsQuery description={description} request={request} />);

    expect(screen.queryByTestId('preview-logged-request-description')).not.toHaveTextContent('ms');
  });

  it('should render description', () => {
    render(<LoggedRequestsQuery description={description} request={request} />);

    expect(screen.queryByTestId('preview-logged-request-description')).toHaveTextContent(
      description
    );
  });
});
