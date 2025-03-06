/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionLinkCategory, SolutionNavLink } from '../../common/links';
import { formatNavigationTree } from './navigation_tree';

describe('formatNavigationTree', () => {
  test('creates the navigation tree for stateful', () => {
    const solutionNavLinks = [
      {
        id: 'dashboards',
        title: 'Dashboards',
        skipUrlState: false,
        links: [
          {
            id: 'overview',
            title: 'Overview',
            description:
              'Summary of your security environment activity, including alerts, events, recent items, and a news feed!',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/87e5860cdcd749a7.png',
          },
          {
            id: 'detection_response',
            title: 'Detection & Response',
            description:
              'Information about your Alerts and Cases within the Security Solution, including Hosts and Users with Alerts.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/6ee57fbd46b6f258.png',
          },
          {
            id: 'cloud_security_posture-dashboard',
            title: 'Cloud Security Posture',
            description: 'An overview of findings across all CSP integrations.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/d6dc7207d7b53949.png',
          },
          {
            id: 'cloud_security_posture-vulnerability_dashboard',
            title: 'Cloud Native Vulnerability Management',
            description:
              'Cloud Native Vulnerability Management (CNVM) allows you to identify vulnerabilities in your cloud workloads.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/d40d1de2a50c69e9.png',
          },
          {
            id: 'entity_analytics',
            title: 'Entity Analytics',
            description:
              'Entity analytics, anomalies, and threats to narrow down the monitoring surface area.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/39655a2668786e83.png',
            isBeta: false,
          },
          {
            id: 'data_quality',
            title: 'Data Quality',
            description:
              'Check index mappings and values for compatibility with the Elastic Common Schema (ECS)',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/83ddb143ca02889a.png',
          },
        ],
      },
      { id: 'alerts', title: 'Alerts' },
      { id: 'attack_discovery', title: 'Attack discovery' },
      { id: 'cloud_security_posture-findings', title: 'Findings' },
      {
        id: 'cases',
        title: 'Cases',
        links: [
          { id: 'cases_create', title: 'Create', disabled: true },
          { id: 'cases_configure', title: 'Settings', disabled: true },
        ],
      },
      {
        id: 'threat_intelligence',
        title: 'Intelligence',
        description:
          'Elastic threat intelligence helps you see if you are open to or have been subject to current or historical known threats.',
      },
      {
        id: 'explore',
        title: 'Explore',
        skipUrlState: true,
        links: [
          {
            id: 'hosts',
            title: 'Hosts',
            description: 'A comprehensive overview of all hosts and host-related security events.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/f0d892a24aca5c21.png',
            links: [
              { id: 'hosts-all', title: 'All hosts', isBeta: false },
              { id: 'hosts-uncommon_processes', title: 'Uncommon Processes' },
              { id: 'hosts-anomalies', title: 'Anomalies' },
              { id: 'hosts-events', title: 'Events' },
              { id: 'hosts-risk', title: 'Host risk' },
              { id: 'hosts-sessions', title: 'Sessions', isBeta: false },
            ],
          },
          {
            id: 'network',
            title: 'Network',
            description:
              'Provides key activity metrics in an interactive map as well as event tables that enable interaction with the Timeline.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/9473122fa26519cd.png',
            links: [
              { id: 'network-flows', title: 'Flows' },
              { id: 'network-dns', title: 'DNS' },
              { id: 'network-http', title: 'HTTP' },
              { id: 'network-tls', title: 'TLS' },
              { id: 'network-anomalies', title: 'Anomalies' },
              { id: 'network-events', title: 'Events' },
            ],
          },
          {
            id: 'users',
            title: 'Users',
            description:
              'A comprehensive overview of user data that enables understanding of authentication and user behavior within your environment.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/fd3fbca6f8f1d5fa.png',
            links: [
              { id: 'users-all', title: 'All users' },
              { id: 'users-authentications', title: 'Authentications' },
              { id: 'users-anomalies', title: 'Anomalies' },
              { id: 'users-risk', title: 'User risk' },
              { id: 'users-events', title: 'Events' },
            ],
          },
        ],
      },
      {
        id: 'rules-landing',
        title: 'Rules',
        categories: [
          {
            label: 'Management',
            linkIds: [
              'rules',
              'cloud_security_posture-benchmarks',
              'exceptions',
              'siem_migrations-rules',
            ],
          },
          { label: 'Discover', linkIds: ['coverage-overview'] },
        ],
        skipUrlState: true,
        links: [
          {
            id: 'rules',
            title: 'Detection rules (SIEM)',
            description: 'Create and manage detection rules for threat detection and monitoring.',
            links: [
              { id: 'rules-add', title: 'Add Rules', skipUrlState: true },
              { id: 'rules-create', title: 'Create new rule', skipUrlState: true },
            ],
          },
          {
            id: 'exceptions',
            title: 'Shared exception lists',
            description:
              'Create and manage shared exception lists to prevent the creation of unwanted alerts.',
            skipUrlState: true,
          },
          {
            id: 'cloud_security_posture-benchmarks',
            title: 'Benchmarks',
            description: 'View benchmark rules for Cloud Security Posture management.',
          },
          {
            id: 'coverage-overview',
            title: 'MITRE ATT&CK® Coverage',
            description: 'Review and maintain your protections MITRE ATT&CK® coverage.',
          },
          {
            id: 'siem_migrations-rules',
            title: 'SIEM Rule Migrations',
            description:
              'Our generative AI powered SIEM migration tool automates some of the most time consuming migrations tasks and processed.',
            skipUrlState: true,
            isBeta: true,
            betaOptions: { text: 'Technical Preview' },
          },
        ],
      },
      {
        id: 'get_started',
        title: 'Get started',
        sideNavIcon: 'launch',
        isFooterLink: true,
        skipUrlState: true,
      },
      {
        id: 'assets',
        title: 'Assets',
        skipUrlState: true,
        links: [
          {
            id: 'fleet:',
            title: 'Fleet',
            description: 'Centralized management for Elastic Agents',
            links: [
              { id: 'fleet:agents', title: 'Agents' },
              { id: 'fleet:policies', title: 'Policies' },
              { id: 'fleet:enrollment_tokens', title: 'Enrollment tokens' },
              { id: 'fleet:uninstall_tokens', title: 'Uninstall tokens' },
              { id: 'fleet:data_streams', title: 'Data streams' },
              { id: 'fleet:settings', title: 'Settings' },
            ],
          },
          {
            id: 'endpoints',
            title: 'Endpoints',
            description: 'Hosts running Elastic Defend.',
            skipUrlState: true,
            links: [
              {
                id: 'policy',
                title: 'Policies',
                description:
                  'Use policies to customize endpoint and cloud workload protections and other configurations.',
                skipUrlState: true,
              },
              {
                id: 'trusted_apps',
                title: 'Trusted applications',
                description:
                  'Improve performance or alleviate conflicts with other applications running on your hosts.',
                skipUrlState: true,
              },
              {
                id: 'event_filters',
                title: 'Event filters',
                description:
                  'Exclude high volume or unwanted events being written into Elasticsearch.',
                skipUrlState: true,
              },
              {
                id: 'host_isolation_exceptions',
                title: 'Host isolation exceptions',
                description: 'Allow isolated hosts to communicate with specific IPs.',
                skipUrlState: true,
              },
              {
                id: 'blocklist',
                title: 'Blocklist',
                description: 'Exclude unwanted applications from running on your hosts.',
                skipUrlState: true,
              },
              {
                id: 'response_actions_history',
                title: 'Response actions history',
                description: 'View the history of response actions performed on hosts.',
                skipUrlState: true,
              },
            ],
          },
        ],
      },
      {
        id: 'entity_analytics-management',
        title: 'Entity Risk Score',
        description: "Monitor entities' risk scores, and track anomalies.",
        disabled: true,
        skipUrlState: true,
      },
      {
        id: 'entity_analytics-entity_store_management',
        title: 'Entity Store',
        description: 'Store data for entities observed in events.',
        disabled: true,
        skipUrlState: true,
      },
      {
        id: 'investigations',
        title: 'Investigations',
        skipUrlState: true,
        links: [
          {
            id: 'timelines',
            title: 'Timelines',
            description: 'Central place for timelines and timeline templates',
            links: [{ id: 'timelines-templates', title: 'Templates', disabled: true }],
          },
          {
            id: 'notes',
            title: 'Notes',
            description:
              'Oversee, revise, and revisit the notes attached to alerts, events and Timelines.',
            landingIcon: 'filebeatApp',
            skipUrlState: true,
          },
          {
            id: 'osquery:',
            title: 'Osquery',
            description:
              'Deploy Osquery with Elastic Agent, then run and schedule queries in Kibana',
          },
        ],
      },
      {
        id: 'machine_learning-landing',
        title: 'Machine learning',
        skipUrlState: true,
        categories: [
          { type: 'separator', linkIds: ['ml:overview', 'ml:notifications', 'ml:memoryUsage'] },
          {
            type: 'title',
            label: 'Anomaly detection',
            linkIds: [
              'ml:anomalyDetection',
              'ml:anomalyExplorer',
              'ml:singleMetricViewer',
              'ml:suppliedConfigurations',
              'ml:settings',
            ],
          },
          {
            type: 'title',
            label: 'Data frame analytics',
            linkIds: ['ml:dataFrameAnalytics', 'ml:resultExplorer', 'ml:analyticsMap'],
          },
          { type: 'title', label: 'Model management', linkIds: ['ml:nodesOverview'] },
          {
            type: 'title',
            label: 'Data visualizer',
            linkIds: [
              'ml:fileUpload',
              'ml:indexDataVisualizer',
              'ml:esqlDataVisualizer',
              'ml:dataDrift',
            ],
          },
          {
            type: 'title',
            label: 'Aiops labs',
            linkIds: ['ml:logRateAnalysis', 'ml:logPatternAnalysis', 'ml:changePointDetections'],
          },
        ],
        links: [
          { id: 'ml:overview', title: 'Overview', description: 'Overview page' },
          { id: 'ml:notifications', title: 'Notifications', description: 'Notifications page' },
          { id: 'ml:memoryUsage', title: 'Memory usage', description: 'Memory usage page' },
          { id: 'ml:anomalyDetection', title: 'Jobs', description: 'Jobs page' },
          {
            id: 'ml:anomalyExplorer',
            title: 'Anomaly explorer',
            description: 'Anomaly explorer page',
          },
          {
            id: 'ml:singleMetricViewer',
            title: 'Single metric viewer',
            description: 'Single metric viewer page',
          },
          {
            id: 'ml:suppliedConfigurations',
            title: 'Supplied configurations',
            description: 'Supplied configurations page',
          },
          { id: 'ml:settings', title: 'Settings', description: 'Settings page' },
          { id: 'ml:dataFrameAnalytics', title: 'Jobs', description: 'Jobs page' },
          {
            id: 'ml:resultExplorer',
            title: 'Result explorer',
            description: 'Result explorer page',
          },
          { id: 'ml:analyticsMap', title: 'Analytics map', description: 'Analytics map page' },
          { id: 'ml:nodesOverview', title: 'Trained models', description: 'Trained models page' },
          {
            id: 'ml:fileUpload',
            title: 'File data visualizer',
            description: 'File data visualizer page',
          },
          {
            id: 'ml:indexDataVisualizer',
            title: 'Data view data visualizer',
            description: 'Data view data visualizer page',
          },
          {
            id: 'ml:esqlDataVisualizer',
            title: 'ES|QL data visualizer',
            landingIcon: 'sqlApp',
            description: 'ES|QL data visualizer page',
          },
          { id: 'ml:dataDrift', title: 'Data drift', description: 'Data drift' },
          {
            id: 'ml:logRateAnalysis',
            title: 'Log Rate Analysis',
            description: 'Log Rate Analysis Page',
          },
          {
            id: 'ml:logPatternAnalysis',
            title: 'Log pattern analysis',
            description: 'Log pattern analysis page',
          },
          {
            id: 'ml:changePointDetections',
            title: 'Change point detection',
            description: 'Change point detection page',
          },
        ],
      },
      { id: 'discover:', title: 'Discover' },
      {
        id: 'dev_tools:',
        title: 'Developer tools',
        sideNavIcon: 'editorCodeBlock',
        isFooterLink: true,
      },
      { id: 'management:', title: 'Stack Management', isFooterLink: true },
      { id: 'monitoring:', title: 'Stack Monitoring', isFooterLink: true },
      { id: 'integrations:/browse/security', title: 'Integrations', isFooterLink: true },
      {
        id: 'maps:',
        title: 'Maps',
        description:
          'Analyze geospatial data and identify geo patterns in multiple layers and indices.',
        landingIcon: 'graphApp',
        disabled: true,
      },
      {
        id: 'visualize:',
        title: 'Visualize library',
        description: 'Manage visualization library. Create, edit, and share visualizations.',
        landingIcon: 'visualizeApp',
        disabled: true,
      },
    ] as SolutionNavLink[];

    const bodyCategories = [
      { type: 'separator', linkIds: ['discover:', 'dashboards'] },
      {
        type: 'separator',
        linkIds: [
          'rules-landing',
          'alerts',
          'attack_discovery',
          'cloud_security_posture-findings',
          'cases',
        ],
      },
      { type: 'separator', linkIds: ['investigations', 'threat_intelligence', 'explore'] },
      { type: 'separator', linkIds: ['asset_inventory'] },
      { type: 'separator', linkIds: ['assets'] },
      { type: 'separator', linkIds: ['machine_learning-landing'] },
      {
        type: 'separator',
        linkIds: ['entity_analytics-management', 'entity_analytics-entity_store_management'],
      },
    ] as SolutionLinkCategory[];

    const footerCategories = [
      { type: 'separator', linkIds: ['get_started', 'dev_tools:'] },
      {
        type: 'accordion',
        label: 'Management',
        iconType: 'gear',
        linkIds: ['management:', 'monitoring:', 'integrations:/browse/security'],
      },
    ] as SolutionLinkCategory[];

    expect(
      formatNavigationTree(solutionNavLinks, bodyCategories, footerCategories)
    ).toMatchSnapshot();
  });

  test('creates the navigation tree for serverless', () => {
    const solutionNavLinks = [
      {
        id: 'dashboards',
        title: 'Dashboards',
        skipUrlState: false,
        links: [
          {
            id: 'overview',
            title: 'Overview',
            description:
              'Summary of your security environment activity, including alerts, events, recent items, and a news feed!',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/87e5860cdcd749a7.png',
          },
          {
            id: 'detection_response',
            title: 'Detection & Response',
            description:
              'Information about your Alerts and Cases within the Security Solution, including Hosts and Users with Alerts.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/6ee57fbd46b6f258.png',
          },
          {
            id: 'cloud_security_posture-dashboard',
            title: 'Cloud Security Posture',
            description: 'An overview of findings across all CSP integrations.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/d6dc7207d7b53949.png',
          },
          {
            id: 'cloud_security_posture-vulnerability_dashboard',
            title: 'Cloud Native Vulnerability Management',
            description:
              'Cloud Native Vulnerability Management (CNVM) allows you to identify vulnerabilities in your cloud workloads.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/d40d1de2a50c69e9.png',
          },
          {
            id: 'entity_analytics',
            title: 'Entity Analytics',
            description:
              'Entity analytics, anomalies, and threats to narrow down the monitoring surface area.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/39655a2668786e83.png',
            isBeta: false,
          },
          {
            id: 'data_quality',
            title: 'Data Quality',
            description:
              'Check index mappings and values for compatibility with the Elastic Common Schema (ECS)',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/83ddb143ca02889a.png',
          },
        ],
      },
      {
        id: 'alerts',
        title: 'Alerts',
      },
      {
        id: 'attack_discovery',
        title: 'Attack discovery',
      },
      {
        id: 'cloud_security_posture-findings',
        title: 'Findings',
      },
      {
        id: 'cases',
        title: 'Cases',
        links: [
          {
            id: 'cases_create',
            title: 'Create',
            disabled: true,
          },
          {
            id: 'cases_configure',
            title: 'Settings',
            disabled: true,
          },
        ],
      },
      {
        id: 'threat_intelligence',
        title: 'Intelligence',
        description:
          'Elastic threat intelligence helps you see if you are open to or have been subject to current or historical known threats.',
      },
      {
        id: 'explore',
        title: 'Explore',
        skipUrlState: true,
        links: [
          {
            id: 'hosts',
            title: 'Hosts',
            description: 'A comprehensive overview of all hosts and host-related security events.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/f0d892a24aca5c21.png',
            links: [
              {
                id: 'hosts-all',
                title: 'All hosts',
                isBeta: false,
              },
              {
                id: 'hosts-uncommon_processes',
                title: 'Uncommon Processes',
              },
              {
                id: 'hosts-anomalies',
                title: 'Anomalies',
              },
              {
                id: 'hosts-events',
                title: 'Events',
              },
              {
                id: 'hosts-risk',
                title: 'Host risk',
              },
              {
                id: 'hosts-sessions',
                title: 'Sessions',
                isBeta: false,
              },
            ],
          },
          {
            id: 'network',
            title: 'Network',
            description:
              'Provides key activity metrics in an interactive map as well as event tables that enable interaction with the Timeline.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/9473122fa26519cd.png',
            links: [
              {
                id: 'network-flows',
                title: 'Flows',
              },
              {
                id: 'network-dns',
                title: 'DNS',
              },
              {
                id: 'network-http',
                title: 'HTTP',
              },
              {
                id: 'network-tls',
                title: 'TLS',
              },
              {
                id: 'network-anomalies',
                title: 'Anomalies',
              },
              {
                id: 'network-events',
                title: 'Events',
              },
            ],
          },
          {
            id: 'users',
            title: 'Users',
            description:
              'A comprehensive overview of user data that enables understanding of authentication and user behavior within your environment.',
            landingImage:
              '/XXXXXXXXXXXX/bundles/plugin/securitySolution/1.0.0/fd3fbca6f8f1d5fa.png',
            links: [
              {
                id: 'users-all',
                title: 'All users',
              },
              {
                id: 'users-authentications',
                title: 'Authentications',
              },
              {
                id: 'users-anomalies',
                title: 'Anomalies',
              },
              {
                id: 'users-risk',
                title: 'User risk',
              },
              {
                id: 'users-events',
                title: 'Events',
              },
            ],
          },
        ],
      },
      {
        id: 'rules-landing',
        title: 'Rules',
        categories: [
          {
            label: 'Management',
            linkIds: [
              'rules',
              'cloud_security_posture-benchmarks',
              'exceptions',
              'siem_migrations-rules',
            ],
          },
          {
            label: 'Discover',
            linkIds: ['coverage-overview'],
          },
        ],
        skipUrlState: true,
        links: [
          {
            id: 'rules',
            title: 'Detection rules (SIEM)',
            description: 'Create and manage detection rules for threat detection and monitoring.',
            links: [
              {
                id: 'rules-add',
                title: 'Add Rules',
                skipUrlState: true,
              },
              {
                id: 'rules-create',
                title: 'Create new rule',
                skipUrlState: true,
              },
            ],
          },
          {
            id: 'exceptions',
            title: 'Shared exception lists',
            description:
              'Create and manage shared exception lists to prevent the creation of unwanted alerts.',
            skipUrlState: true,
          },
          {
            id: 'cloud_security_posture-benchmarks',
            title: 'Benchmarks',
            description: 'View benchmark rules for Cloud Security Posture management.',
          },
          {
            id: 'coverage-overview',
            title: 'MITRE ATT&CK® Coverage',
            description: 'Review and maintain your protections MITRE ATT&CK® coverage.',
          },
        ],
      },
      {
        id: 'get_started',
        title: 'Get started',
        sideNavIcon: 'launch',
        isFooterLink: true,
        skipUrlState: true,
      },
      {
        id: 'assets',
        title: 'Assets',
        skipUrlState: true,
        links: [
          {
            id: 'fleet:',
            title: 'Fleet',
            description: 'Centralized management for Elastic Agents',
            links: [
              {
                id: 'fleet:agents',
                title: 'Agents',
              },
              {
                id: 'fleet:policies',
                title: 'Policies',
              },
              {
                id: 'fleet:enrollment_tokens',
                title: 'Enrollment tokens',
              },
              {
                id: 'fleet:uninstall_tokens',
                title: 'Uninstall tokens',
              },
              {
                id: 'fleet:data_streams',
                title: 'Data streams',
              },
              {
                id: 'fleet:settings',
                title: 'Settings',
              },
            ],
          },
          {
            id: 'endpoints',
            title: 'Endpoints',
            description: 'Hosts running Elastic Defend.',
            skipUrlState: true,
            links: [
              {
                id: 'policy',
                title: 'Policies',
                description:
                  'Use policies to customize endpoint and cloud workload protections and other configurations.',
                skipUrlState: true,
              },
              {
                id: 'trusted_apps',
                title: 'Trusted applications',
                description:
                  'Improve performance or alleviate conflicts with other applications running on your hosts.',
                skipUrlState: true,
              },
              {
                id: 'event_filters',
                title: 'Event filters',
                description:
                  'Exclude high volume or unwanted events being written into Elasticsearch.',
                skipUrlState: true,
              },
              {
                id: 'host_isolation_exceptions',
                title: 'Host isolation exceptions',
                description: 'Allow isolated hosts to communicate with specific IPs.',
                skipUrlState: true,
              },
              {
                id: 'blocklist',
                title: 'Blocklist',
                description: 'Exclude unwanted applications from running on your hosts.',
                skipUrlState: true,
              },
              {
                id: 'response_actions_history',
                title: 'Response actions history',
                description: 'View the history of response actions performed on hosts.',
                skipUrlState: true,
              },
            ],
          },
        ],
      },
      {
        id: 'entity_analytics-management',
        title: 'Entity Risk Score',
        description: "Monitor entities' risk scores, and track anomalies.",
        disabled: true,
        skipUrlState: true,
      },
      {
        id: 'entity_analytics-entity_store_management',
        title: 'Entity Store',
        description: 'Store data for entities observed in events.',
        disabled: true,
        skipUrlState: true,
      },
      {
        id: 'investigations',
        title: 'Investigations',
        skipUrlState: true,
        links: [
          {
            id: 'timelines',
            title: 'Timelines',
            description: 'Central place for timelines and timeline templates',
            links: [
              {
                id: 'timelines-templates',
                title: 'Templates',
                disabled: true,
              },
            ],
          },
          {
            id: 'notes',
            title: 'Notes',
            description:
              'Oversee, revise, and revisit the notes attached to alerts, events and Timelines.',
            landingIcon: 'filebeatApp',
            skipUrlState: true,
          },
          {
            id: 'osquery:',
            title: 'Osquery',
            description:
              'Deploy Osquery with Elastic Agent, then run and schedule queries in Kibana',
          },
        ],
      },
      {
        id: 'machine_learning-landing',
        title: 'Machine learning',
        skipUrlState: true,
        categories: [
          {
            type: 'separator',
            linkIds: ['ml:overview', 'ml:notifications', 'ml:memoryUsage'],
          },
          {
            type: 'title',
            label: 'Anomaly detection',
            linkIds: [
              'ml:anomalyDetection',
              'ml:anomalyExplorer',
              'ml:singleMetricViewer',
              'ml:suppliedConfigurations',
              'ml:settings',
            ],
          },
          {
            type: 'title',
            label: 'Data frame analytics',
            linkIds: ['ml:dataFrameAnalytics', 'ml:resultExplorer', 'ml:analyticsMap'],
          },
          {
            type: 'title',
            label: 'Model management',
            linkIds: ['ml:nodesOverview'],
          },
          {
            type: 'title',
            label: 'Data visualizer',
            linkIds: [
              'ml:fileUpload',
              'ml:indexDataVisualizer',
              'ml:esqlDataVisualizer',
              'ml:dataDrift',
            ],
          },
          {
            type: 'title',
            label: 'Aiops labs',
            linkIds: ['ml:logRateAnalysis', 'ml:logPatternAnalysis', 'ml:changePointDetections'],
          },
        ],
        links: [
          {
            id: 'ml:overview',
            title: 'Overview',
            description: 'Overview page',
          },
          {
            id: 'ml:notifications',
            title: 'Notifications',
            description: 'Notifications page',
          },
          {
            id: 'ml:memoryUsage',
            title: 'Memory usage',
            description: 'Memory usage page',
          },
          {
            id: 'ml:anomalyDetection',
            title: 'Jobs',
            description: 'Jobs page',
          },
          {
            id: 'ml:anomalyExplorer',
            title: 'Anomaly explorer',
            description: 'Anomaly explorer page',
          },
          {
            id: 'ml:singleMetricViewer',
            title: 'Single metric viewer',
            description: 'Single metric viewer page',
          },
          {
            id: 'ml:suppliedConfigurations',
            title: 'Supplied configurations',
            description: 'Supplied configurations page',
          },
          {
            id: 'ml:settings',
            title: 'Settings',
            description: 'Settings page',
          },
          {
            id: 'ml:dataFrameAnalytics',
            title: 'Jobs',
            description: 'Jobs page',
          },
          {
            id: 'ml:resultExplorer',
            title: 'Result explorer',
            description: 'Result explorer page',
          },
          {
            id: 'ml:analyticsMap',
            title: 'Analytics map',
            description: 'Analytics map page',
          },
          {
            id: 'ml:nodesOverview',
            title: 'Trained models',
            description: 'Trained models page',
          },
          {
            id: 'ml:fileUpload',
            title: 'File data visualizer',
            description: 'File data visualizer page',
          },
          {
            id: 'ml:indexDataVisualizer',
            title: 'Data view data visualizer',
            description: 'Data view data visualizer page',
          },
          {
            id: 'ml:esqlDataVisualizer',
            title: 'ES|QL data visualizer',
            landingIcon: 'sqlApp',
            description: 'ES|QL data visualizer page',
          },
          {
            id: 'ml:dataDrift',
            title: 'Data drift',
            description: 'Data drift',
          },
          {
            id: 'ml:logRateAnalysis',
            title: 'Log Rate Analysis',
            description: 'Log Rate Analysis Page',
          },
          {
            id: 'ml:logPatternAnalysis',
            title: 'Log pattern analysis',
            description: 'Log pattern analysis page',
          },
          {
            id: 'ml:changePointDetections',
            title: 'Change point detection',
            description: 'Change point detection page',
          },
        ],
      },
      {
        id: 'discover:',
        title: 'Discover',
      },
      {
        id: 'dev_tools:',
        title: 'Developer tools',
        sideNavIcon: 'editorCodeBlock',
        isFooterLink: true,
      },
      {
        id: 'management:',
        title: 'Stack Management',
        isFooterLink: true,
      },
      {
        id: 'integrations:/browse/security',
        title: 'Integrations',
        isFooterLink: true,
      },
      {
        id: 'maps:',
        title: 'Maps',
        description:
          'Analyze geospatial data and identify geo patterns in multiple layers and indices.',
        landingIcon: 'graphApp',
        disabled: true,
      },
      {
        id: 'visualize:',
        title: 'Visualize library',
        description: 'Manage visualization library. Create, edit, and share visualizations.',
        landingIcon: 'visualizeApp',
        disabled: true,
      },
    ] as SolutionNavLink[];

    const bodyCategories = [
      {
        type: 'separator',
        linkIds: ['discover:', 'dashboards'],
      },
      {
        type: 'separator',
        linkIds: [
          'rules-landing',
          'alerts',
          'attack_discovery',
          'cloud_security_posture-findings',
          'cases',
        ],
      },
      {
        type: 'separator',
        linkIds: ['investigations', 'threat_intelligence', 'explore'],
      },
      {
        type: 'separator',
        linkIds: ['asset_inventory'],
      },
      {
        type: 'separator',
        linkIds: ['assets'],
      },
      {
        type: 'separator',
        linkIds: ['machine_learning-landing'],
      },
      {
        type: 'separator',
        linkIds: ['entity_analytics-management', 'entity_analytics-entity_store_management'],
      },
    ] as SolutionLinkCategory[];

    const footerCategories = [
      {
        type: 'separator',
        linkIds: ['get_started', 'dev_tools:'],
      },
      {
        type: 'accordion',
        label: 'Management',
        iconType: 'gear',
        linkIds: ['management:', 'monitoring:', 'integrations:/browse/security'],
      },
    ] as SolutionLinkCategory[];

    expect(
      formatNavigationTree(solutionNavLinks, bodyCategories, footerCategories)
    ).toMatchSnapshot();
  });
});
