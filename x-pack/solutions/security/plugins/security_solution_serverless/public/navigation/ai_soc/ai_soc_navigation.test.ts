import { applyAiSocNavigation, aiGroup } from './ai_soc_navigation';
import { alertSummaryLink } from './links';
import { filterFromWhitelist } from './utils';
import { ProductLine } from '../../../common/product';

const nonAiProduct = { product_line: 'other' };
const aiProduct = { product_line: ProductLine.aiSoc };

const getSampleDraft = () => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_solution_nav',
      title: 'Security',
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      children: [
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: 'discover:',
              link: 'discover',
              title: 'Discover',
            },
            {
              id: 'dashboards',
              link: 'securitySolutionUI:dashboards',
              title: 'Dashboards',
              children: [
                {
                  id: 'overview',
                  link: 'securitySolutionUI:overview',
                  title: 'Overview',
                },
                {
                  id: 'detection_response',
                  link: 'securitySolutionUI:detection_response',
                  title: 'Detection & Response',
                },
                {
                  id: 'cloud_security_posture-dashboard',
                  link: 'securitySolutionUI:cloud_security_posture-dashboard',
                  title: 'Cloud Security Posture',
                },
                {
                  id: 'cloud_security_posture-vulnerability_dashboard',
                  link: 'securitySolutionUI:cloud_security_posture-vulnerability_dashboard',
                  title: 'Cloud Native Vulnerability Management',
                },
                {
                  id: 'entity_analytics',
                  link: 'securitySolutionUI:entity_analytics',
                  title: 'Entity Analytics',
                },
                {
                  id: 'data_quality',
                  link: 'securitySolutionUI:data_quality',
                  title: 'Data Quality',
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
      ],
      isCollapsible: false,
    },
  ],
});

describe('applyAiSocNavigation', () => {
  let draft: any;

  beforeEach(() => {
    draft = getSampleDraft();
  });

  describe('when productTypes does NOT include aiSoc', () => {
    it('should not modify the navigation tree', () => {
      const productTypes = [nonAiProduct];

      const originalDraft = JSON.parse(JSON.stringify(draft));
      applyAiSocNavigation(draft, productTypes);

      // Should remain unchanged
      expect(draft).toEqual(originalDraft);
    });
  });

  describe('when productTypes includes aiSoc', () => {
    let filterSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on filterFromWhitelist so we can control the filter result
      filterSpy = jest
        .spyOn(require('./utils'), 'filterFromWhitelist')
        .mockImplementation((children: any[], _whitelist: string[]) => {
          // Simulate that the filter keeps only alertSummaryLink
          return [alertSummaryLink];
        });
    });

    afterEach(() => {
      filterSpy.mockRestore();
    });

    it('should modify the navigation tree correctly', () => {
      const productTypes = [aiProduct];

      applyAiSocNavigation(draft, productTypes);

      // The final draft.body should be replaced by one navGroup from aiGroup
      // that has only the filtered children (we forced it to return [alertSummaryLink]).
      expect(draft.body).toEqual([
        {
          ...aiGroup,
          children: [alertSummaryLink],
        },
      ]);

      // Check that filterFromWhitelist was called with the original children plus alertSummaryLink
      const originalChildren = getSampleDraft().body[0].children; // the initial children
      const expectedChildrenForFiltering = [...originalChildren, alertSummaryLink];

      expect(filterSpy).toHaveBeenCalledWith(expectedChildrenForFiltering, expect.any(Array));
    });
  });
});
