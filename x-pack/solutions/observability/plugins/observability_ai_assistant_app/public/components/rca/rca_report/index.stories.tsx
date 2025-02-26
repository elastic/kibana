/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisReport } from '.';

const report =
  '## 1. Understanding the Context and Hypothesis\n\n### Context:\n- **Issue:** High rate of HTTP 500 errors for the `/api/cart` endpoint in the `controller` service.\n- **Objective:** Investigate internal issues or anomalies that could explain the alert.\n\n### Hypothesis:\n- The high rate of HTTP 500 errors could be due to internal issues within the `controller` service, such as resource exhaustion, misconfigurations, or upstream service failures.\n\n## 2. Entity Overview\n\n### Entity: `controller`\n- **Environment:** Kubernetes pod, running in `opentelemetry-demo`\n- **Language:** Not specified\n- **Communication:** HTTP\n- **Cloud Provider:** Not specified, but running on `minikube`\n\n## 3. Identifying Related Entities\n\n### Upstream Dependencies:\n- **Upstream Service:** `default-my-otel-demo-frontendproxy-8080`\n  - **Evidence:** Log entries show frequent API calls to `default-my-otel-demo-frontendproxy-8080` for various endpoints, including `/api/cart`.\n\n### Downstream Dependencies:\n- **Downstream Service:** Not explicitly mentioned, but the `controller` service is likely serving multiple endpoints, including `/api/cart`.\n\n### Infrastructure:\n- **Pod:** `ingress-nginx-controller-bc57996ff-qrd25`\n  - **Evidence:** Logs and metadata indicate the `controller` service is running in this pod.\n\n## 4. Health Status Assessment\n\n### Active Alerts:\n- **Alert:** Custom threshold alert for HTTP 500 errors on `/api/cart` endpoint.\n  - **Reason:** Custom equation is 100, above the threshold of 5.\n  - **Duration:** 1 min\n  - **Data View:** logs-*\n  - **Group:** `controller`, `/api/cart`\n  - **Evaluation Values:** [100]\n  - **Threshold:** [5]\n  - **Status:** Active\n  - **Start Time:** 2024-10-21T08:51:51.846Z\n\n### SLO Performance:\n- **No SLOs** specified for this entity.\n\n### Log Patterns and Anomalies:\n- **Normal Logs:**\n  - Logs show normal GET and POST requests with HTTP 200 responses.\n- **Critical Logs:**\n  - Logs indicate upstream prematurely closed connection while reading upstream, leading to HTTP 500 errors.\n  - Example: `2024/10/21 08:37:11 [error] 36#36: *3518505 upstream prematurely closed connection while reading upstream, client: 10.244.0.117, server: otel-demo.internal, request: "POST /flagservice/flagd.evaluation.v1.Service/EventStream HTTP/1.1", upstream: "http://10.244.0.119:8080/flagservice/flagd.evaluation.v1.Service/EventStream", host: "ingress-nginx-controller.ingress-nginx.svc.cluster.local", referrer: "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/cart"`\n\n## 5. Relevance of Entity to the Investigation\n\n### Relevance:\n- The `controller` service is directly related to the investigation due to the elevated HTTP 500 error rate on the `/api/cart` endpoint.\n- The critical log entries suggest that the issue might be related to upstream service failures, specifically the `default-my-otel-demo-frontendproxy-8080` service.\n\n### Signs Aligning with Hypothesis:\n- **Resource Exhaustion:** Not explicitly indicated in the logs, but the high rate of HTTP 500 errors could be a symptom.\n- **Upstream Service Failures:** Logs indicate upstream prematurely closed connections, which aligns with the hypothesis of upstream service issues.\n\n## 6. Timeline of Significant Events\n\n### Timeline:\n1. **2024-10-21T08:37:11.050Z:** Critical log entry indicating upstream prematurely closed connection while reading upstream.\n2. **2024-10-21T08:51:51.846Z:** Alert for high rate of HTTP 500 errors on `/api/cart` endpoint becomes active.\n3. **2024-10-21T09:34:52.720Z:** Alert status remains active with a custom equation value of 100, above the threshold of 5.\n\n## 7. Next Steps or Root Cause Identification\n\n### Next Steps:\n1. **Investigate Upstream Service (`default-my-otel-demo-frontendproxy-8080`):**\n   - Check the health and performance of the upstream service.\n   - Look for any signs of resource exhaustion, connection issues, or misconfigurations.\n2. **Review Recent Changes:**\n   - Check for any recent deployments or configuration changes in the `controller` service and its upstream dependencies.\n3. **Analyze Resource Usage:**\n   - Monitor CPU, memory, and network usage for the `controller` service to identify any resource-related issues.\n\n### Potential Root Cause:\n- **Upstream Service Failures:** The critical log entries indicating upstream prematurely closed connections suggest that the root cause might be related to issues in the upstream service (`default-my-otel-demo-frontendproxy-8080`), leading to HTTP 500 errors in the `controller` service.\n\nBy following these steps, we can further narrow down the root cause and take appropriate actions to resolve the issue.';

const stories: Meta = {
  title: 'RCA/Report',
  component: RootCauseAnalysisReport,
};

export default stories;

export const Default: StoryFn = () => {
  return (
    <RootCauseAnalysisReport
      report={report}
      timeline={{
        events: [],
      }}
    />
  );
};
