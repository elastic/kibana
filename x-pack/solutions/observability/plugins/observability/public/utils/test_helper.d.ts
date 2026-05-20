import React from 'react';
import type { ConfigSchema } from '../plugin';
import type { Subset } from '../typings';
export declare const core: {
    analytics: jest.Mocked<import("@kbn/core/public").AnalyticsServiceStart>;
    application: jest.Mocked<import("@kbn/core/public").ApplicationStart>;
    chrome: import("@kbn/utility-types-jest").DeeplyMockedKeys<import("@kbn/core/packages/chrome/browser-internal-types").InternalChromeStart>;
    customBranding: {
        customBranding$: import("rxjs").Observable<import("@kbn/core/packages/custom-branding/common").CustomBranding>;
        hasCustomBranding$: import("rxjs").Observable<boolean>;
    };
    docLinks: import("@kbn/core/public").DocLinksStart;
    executionContext: jest.Mocked<import("@kbn/core/public").ExecutionContextSetup>;
    featureFlags: jest.Mocked<import("@kbn/core/public").FeatureFlagsStart>;
    http: import("@kbn/core/packages/http/browser-mocks").HttpSetupMock;
    i18n: jest.Mocked<import("@kbn/core/public").I18nStart>;
    injection: jest.MockedObjectDeep<import("@kbn/core/packages/di/common").CoreDiServiceStart>;
    notifications: import("@kbn/utility-types-jest").DeeplyMockedKeys<import("@kbn/core/public").NotificationsStart>;
    overlays: import("@kbn/utility-types-jest").DeeplyMockedKeys<import("@kbn/core/public").OverlayStart>;
    uiSettings: jest.Mocked<import("@kbn/core/public").IUiSettingsClient>;
    settings: {
        client: jest.Mocked<import("@kbn/core/public").IUiSettingsClient>;
        globalClient: jest.Mocked<import("@kbn/core/public").IUiSettingsClient>;
    };
    deprecations: jest.Mocked<import("@kbn/core/public").DeprecationsServiceStart>;
    theme: jest.Mocked<import("@kbn/core/public").ThemeServiceSetup>;
    fatalErrors: jest.Mocked<import("@kbn/core/public").FatalErrorsSetup>;
    security: jest.MockedObjectDeep<import("@kbn/core/public").SecurityServiceStart>;
    userProfile: jest.Mocked<import("@kbn/core/public").UserProfileService>;
    rendering: jest.Mocked<import("@kbn/core/packages/rendering/browser").RenderingService>;
    pricing: jest.Mocked<import("@kbn/core/public").PricingServiceStart>;
    plugins: {
        onStart: jest.Mock<any, any, any>;
    };
};
export declare const data: import("@kbn/data-plugin/public/mocks").Start;
export declare const render: (component: React.ReactNode, config?: Subset<ConfigSchema>) => import("@testing-library/react").RenderResult<typeof import("@testing-library/dom/types/queries"), HTMLElement, HTMLElement>;
