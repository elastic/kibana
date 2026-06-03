/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNavigationTree } from './navigation_tree';

describe('Navigation Tree', () => {
  const mockApplication = {
    isAppRegistered: jest.fn(),
  } as any;

  it('should generate tree with home link', () => {
    const navigation = createNavigationTree(mockApplication);
    const { body } = navigation;
    expect(body.length).toBeGreaterThan(0);
    const homeNode = body[0];
    expect(homeNode).toMatchObject({
      title: 'Elasticsearch',
      link: 'searchHomepage',
    });
  });

  it('includes Manage jobs link to Stack Management anomaly detection jobs list under ML nav', () => {
    const { body } = createNavigationTree(mockApplication);
    const mlNode = body.find((item: any) => item.id === 'machine_learning');
    const anomalySection = mlNode?.children?.find(
      (item: any) => item.id === 'category-anomaly_detection'
    );

    expect(anomalySection?.children?.[0]).toEqual(
      expect.objectContaining({
        link: 'management:anomaly_detection',
        title: 'Manage jobs',
      })
    );
  });

  it('includes Stack Management ML Overview in Machine Learning admin links', () => {
    const { footer } = createNavigationTree(mockApplication);

    const adminAndSettingsNode = footer?.find((item: any) => item.id === 'admin_and_settings');
    const mlSection = adminAndSettingsNode?.children?.find(
      (item: any) => item.id === 'settings_ml'
    );

    expect(mlSection).toBeDefined();
    expect(mlSection?.children?.[0]).toEqual(
      expect.objectContaining({ link: 'management:overview' })
    );
  });

  it('shows AI section with GenAI settings and AI Assistant when AI Assistant is enabled', () => {
    const { footer } = createNavigationTree(mockApplication);

    const adminAndSettingsNode = footer?.find((item: any) => item.id === 'admin_and_settings');
    const aiSection = adminAndSettingsNode?.children?.find(
      (item: any) => item.id === 'settings_ai'
    );

    expect(aiSection).toBeDefined();
    expect(aiSection?.children).toContainEqual(
      expect.objectContaining({
        link: 'management:genAiSettings',
      })
    );
    expect(aiSection?.children).toContainEqual(
      expect.objectContaining({
        link: 'management:evals',
      })
    );
    expect(aiSection?.children).toContainEqual(
      expect.objectContaining({
        link: 'management:observabilityAiAssistantManagement',
      })
    );
  });

  it('shows AI section with GenAI settings but hides AI Assistant when AI Assistant is disabled', () => {
    const { footer } = createNavigationTree({ ...mockApplication, showAiAssistant: false });

    const adminAndSettingsNode = footer?.find((item: any) => item.id === 'admin_and_settings');
    const aiSection = adminAndSettingsNode?.children?.find(
      (item: any) => item.id === 'settings_ai'
    );

    expect(aiSection).toBeDefined();
    expect(aiSection?.children).toContainEqual(
      expect.objectContaining({
        link: 'management:genAiSettings',
      })
    );
    expect(aiSection?.children).toContainEqual(
      expect.objectContaining({
        link: 'management:evals',
      })
    );
    expect(aiSection?.children).not.toContainEqual(
      expect.objectContaining({
        link: 'management:observabilityAiAssistantManagement',
      })
    );
  });
});
