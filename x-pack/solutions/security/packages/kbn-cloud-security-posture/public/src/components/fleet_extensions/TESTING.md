# Fleet Extensions Testing Guide

## 🎯 Mission Statement

This guide provides comprehensive testing patterns for Kibana's Cloud Security Posture fleet extensions. The objective is to create maintainable unit tests that demonstrate cross-provider patterns and ensure robust component behavior across AWS, Azure, and GCP integrations.

> **For AI Agents & Developers:** This document serves as the primary testing reference for the fleet extensions directory. Follow these patterns to maintain consistency and quality across all test suites.

### 🏆 Success Pattern: Azure Testing Approach

**The Gold Standard:** The Azure credentials form test implementation represents our target pattern - clean, comprehensive, and maintainable. All new tests should follow this approach:

- ✅ Direct component rendering with `renderWithIntl(<Component {...defaultProps} />)`
- ✅ Clean mock structure without heavy wrapper infrastructure
- ✅ 100% test pass rate with comprehensive coverage
- ✅ Proper use of test subjects from centralized constants
- ✅ Dynamic mocks that respond to state changes

## 📁 Project Architecture

```
x-pack/solutions/security/packages/kbn-cloud-security-posture/public/src/components/fleet_extensions/
├── aws_credentials_form/     # AWS-specific components
├── azure_credentials_form/   # Azure-specific components
├── gcp_credentials_form/     # GCP-specific components
├── hooks/                   # Shared React hooks
├── test/                    # Testing utilities and fixtures
├── cloud_setup.tsx          # Main integration component
├── utils.ts                 # Shared utility functions
└── types.ts                 # TypeScript definitions
```

## 🧪 Testing Technology Stack

| Technology                | Purpose               | Key Patterns                             |
| ------------------------- | --------------------- | ---------------------------------------- |
| **Jest**                  | Test runner & mocking | `describe()`, `it()`, `expect()`         |
| **React Testing Library** | Component testing     | `render()`, `screen`, `userEvent`        |
| **TypeScript**            | Type safety           | Proper mock typing with `as unknown as`  |
| **@kbn/i18n-react**       | Internationalization  | `FormattedMessage` component testing     |
| **@kbn/fleet-plugin**     | Fleet integration     | `LazyPackagePolicyInputVarField` mocking |

## 🎨 Core Testing Patterns

### Pattern 1: Integration Testing with Mocked Child Components (RECOMMENDED)

**The approach:** Mock complex child components that have their own tests, focus on integration.

```typescript
// 1. Mock child components at the top
const mockAwsInputVarFields = jest.fn(() => <div data-test-subj="aws-input-var-fields-mock" />);
const mockAwsCredentialTypeSelector = jest.fn(() => (
  <div data-test-subj="aws-credential-type-selector-mock" />
));

jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: (props: unknown) => mockAwsInputVarFields(),
}));

jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: (props: unknown) => mockAwsCredentialTypeSelector(),
}));

// 2. Mock external hooks
jest.mock('../hooks/use_cloud_setup_context');
const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;

// 3. renderWithIntl helper for I18n support
const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

// 4. Comprehensive defaultProps object with proper types
const defaultProps = {
  newPolicy: mockPackagePolicy,
  input: mockInput,
  packageInfo: mockPackageInfo,
  onChange: jest.fn(),
  setupTechnology: 'agentless' as SetupTechnology,
  cloud: cloudMock.createSetup(),
  disabled: false,
  updatePolicy: jest.fn(),
  hasInvalidRequiredVars: false,
};

// 5. Direct component rendering with clear expectations
describe('AwsCredentialsFormAgentless', () => {
  it('renders default components', () => {
    renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

    // Verify mocked child components render
    expect(screen.getByTestId('aws-input-var-fields-mock')).toBeInTheDocument();
    expect(screen.getByTestId('aws-credential-type-selector-mock')).toBeInTheDocument();
    expect(screen.getByTestId('aws-setup-info-mock')).toBeInTheDocument();
  });
});
```

**Key Principle:** Test component composition and integration, NOT implementation details of child components.

### Pattern 2: Proper Mock Connection with jest.requireMock()

**CRITICAL:** When mocking utilities, use `jest.requireMock()` to get the actual mocked functions:

```typescript
// ❌ WRONG: Creates new mock functions that aren't connected
const mockUpdatePolicyWithInputs = jest.fn();
const mockGetGcpInputVarsFields = jest.fn();

jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn(),
  getGcpInputVarsFields: jest.fn(),
}));

// ✅ CORRECT: Use jest.requireMock() to get the actual mocked functions
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn(),
  gcpField: {
    fields: {
      'gcp.organization_id': { value: '' },
    },
  },
  getGcpInputVarsFields: jest.fn(),
}));

// Get mocked functions from jest modules
const {
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getGcpInputVarsFields: mockGetGcpInputVarsFields,
} = jest.requireMock('../utils');

// Now you can configure the mocks in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  mockUpdatePolicyWithInputs.mockImplementation((policy: NewPackagePolicy) => policy);
  mockGetGcpInputVarsFields.mockReturnValue([{ id: 'gcp.organization_id', value: 'test-org-id' }]);
});
```

### Pattern 3: Using Centralized Test Subjects from Constants

**CRITICAL:** Always use test subjects from `@kbn/cloud-security-posture-common`:

```typescript
// ❌ WRONG: Hardcoding test subject strings
expect(screen.getByTestId('gcp-organization-account')).toBeInTheDocument();

// ✅ CORRECT: Import and use centralized constants
import {
  GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  GCP_SINGLE_ACCOUNT_TEST_SUBJ,
  GCP_ORGANIZATION_ACCOUNT,
} from '@kbn/cloud-security-posture-common';

expect(screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ)).toBeInTheDocument();
expect(screen.getByTestId(GCP_SINGLE_ACCOUNT_TEST_SUBJ)).toBeInTheDocument();
```

**Why:** Ensures tests stay in sync with component implementation, prevents typos.

### Pattern 4: Proper Mock Implementations that Update Policy

**CRITICAL:** When mocking `updatePolicyWithInputs`, make it actually apply updates:

```typescript
// ❌ WRONG: Mock just returns policy unchanged
mockUpdatePolicyWithInputs.mockImplementation((policy: NewPackagePolicy) => policy);

// ✅ CORRECT: Mock actually applies the updates parameter
beforeEach(() => {
  mockUpdatePolicyWithInputs.mockImplementation(
    (
      policy: NewPackagePolicy,
      policyType: string,
      updates: Record<string, { value?: unknown; type?: string }>
    ) => ({
      ...policy,
      inputs: policy.inputs.map((input) => ({
        ...input,
        streams: input.streams.map((stream) => ({
          ...stream,
          vars: {
            ...stream.vars,
            ...updates, // Actually apply the updates!
          },
        })),
      })),
    })
  );
});
```

**Why:** Tests verify actual behavior when policy changes are applied.

### Pattern 5: Always Include Meaningful Expectations

**CRITICAL:** Every test MUST have at least one expectation. Never just render without assertions.

```typescript
// ❌ WRONG: No expectations - what does this test prove?
it('renders the component', () => {
  renderWithIntl(<AwsCredentialsForm {...defaultProps} />);
});

// ✅ CORRECT: Clear expectations about what should render
it('renders default components', () => {
  renderWithIntl(<AwsCredentialsForm {...defaultProps} />);

  expect(screen.getByTestId('aws-input-var-fields-mock')).toBeInTheDocument();
  expect(screen.getByTestId('aws-credential-type-selector-mock')).toBeInTheDocument();
  expect(screen.getByTestId('aws-setup-info-mock')).toBeInTheDocument();
});

// ✅ ALSO CORRECT: Test conditional rendering
it('renders CloudConnectorSetup when cloud connectors enabled', () => {
  mockUseCloudSetup.mockReturnValue({
    ...defaultCloudSetup,
    isAwsCloudConnectorEnabled: true,
  });

  renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

  expect(screen.getByTestId('cloud-connector-setup-mock')).toBeInTheDocument();
});
```

**Why:** Tests without expectations don't validate behavior and can hide bugs.

### Pattern 6: Using queryBy vs getBy for Negative Assertions

**CRITICAL:** Use correct query methods for presence/absence checks:

```typescript
// ❌ WRONG: getByTestId throws error if element not found
it('does not render selector when disabled', () => {
  renderWithIntl(<Component {...props} disabled={true} />);
  // This will throw an error and fail the test!
  expect(screen.getByTestId('azure-credentials-type-selector')).not.toBeInTheDocument();
});

// ✅ CORRECT: queryByTestId returns null if not found
it('does not render selector when disabled', () => {
  renderWithIntl(<Component {...props} disabled={true} />);
  // This correctly returns null and assertion passes
  expect(screen.queryByTestId('azure-credentials-type-selector')).not.toBeInTheDocument();
});
```

**Rule:**

- Use `getBy*` when element SHOULD exist (throws error if missing)
- Use `queryBy*` when checking element should NOT exist (returns null if missing)

## 🏗️ Component-Specific Testing Strategies

### Credential Form Components (Integration Testing)

**Strategy:** Mock child components and test composition, not internals.

```typescript
// Mock child components that have their own tests
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: jest.fn(() => <div data-test-subj="mock-aws-input-fields" />),
}));
jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: jest.fn(() => <div data-test-subj="mock-aws-credential-selector" />),
}));

describe('AwsCredentialsFormAgentless', () => {
  // Test what props child components receive
  it('passes correct props to credential type selector in edit mode', () => {
    renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} isEditMode />);

    expect(mockAwsCredentialTypeSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        isEditMode: true,
        input: defaultProps.input,
        newPolicy: defaultProps.newPolicy,
        updatePolicy: defaultProps.updatePolicy,
      }),
      {}
    );
  });

  // Test conditional rendering based on mode
  it('does not show credential type selector when not in edit mode', () => {
    renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

    expect(mockAwsCredentialTypeSelector).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-aws-credential-selector')).not.toBeInTheDocument();
  });
});
```

### Selector Components (Radio Groups, Account Type Selectors)

**Strategy:** Test user interactions and verify policy updates.

```typescript
// Must connect mock properly
jest.mock('../utils', () => ({ updatePolicyWithInputs: jest.fn() }));
const { updatePolicyWithInputs: mockUpdatePolicyWithInputs } = jest.requireMock('../utils');

// Mock must actually apply updates
mockUpdatePolicyWithInputs.mockImplementation((policy, policyType, updates) => ({
  ...policy,
  inputs: policy.inputs.map((input) => ({
    ...input,
    streams: input.streams.map((stream) => ({
      ...stream,
      vars: { ...stream.vars, ...updates },
    })),
  })),
}));

describe('GcpAccountTypeSelector', () => {
  it('updates policy when organization option is selected', async () => {
    renderWithIntl(<GcpAccountTypeSelector {...defaultProps} />);

    const orgOption = screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ);
    await userEvent.click(orgOption);

    // Verify policy update with correct structure
    expect(mockUpdatePolicyWithInputs).toHaveBeenCalledWith(
      defaultProps.newPolicy,
      defaultProps.input.policy_template,
      expect.objectContaining({
        'gcp.account_type': { value: 'organization-account' },
      })
    );
  });
});
```

### Input Field Components (If tested independently)

**Strategy:** Mock Fleet plugin fields and test rendering logic.

```typescript
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: jest.fn(({ value, onChange, type }) => (
    <input
      data-test-subj={`mock-field-${type}`}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      type={type === 'password' ? 'password' : 'text'}
    />
  )),
}));

describe('AwsInputVarFields', () => {
  it('renders secret access key as password field', () => {
    const fields = [{ id: 'secret_access_key', type: 'password', value: 'secret' }];
    render(<AwsInputVarFields fields={fields} onChange={jest.fn()} />);

    expect(screen.getByTestId('mock-field-password')).toBeInTheDocument();
  });
});
```

## 🔧 Mock Configuration Best Practices

### Child Component Mocks (Integration Testing)

```typescript
// Mock complex child components with their own tests
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: jest.fn(() => <div data-test-subj="mock-aws-input-fields" />),
}));

jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: jest.fn(() => <div data-test-subj="mock-aws-credential-selector" />),
}));

// Get the mock to check calls
const { AwsInputVarFields: mockAwsInputVarFields } = jest.requireMock('./aws_input_var_fields');
```

### Utility Mocks with jest.requireMock()

```typescript
// Declare the mock
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn(),
  getInputVarsFields: jest.fn(),
}));

// Connect to the actual mock
const {
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getInputVarsFields: mockGetInputVarsFields,
} = jest.requireMock('../utils');

// Implement behavior that applies updates
mockUpdatePolicyWithInputs.mockImplementation((policy, policyType, updates) => ({
  ...policy,
  inputs: policy.inputs.map((input) => ({
    ...input,
    streams: input.streams.map((stream) => ({
      ...stream,
      vars: { ...stream.vars, ...updates },
    })),
  })),
}));
```

### Fleet Plugin Mocks (If needed)

```typescript
// Only mock if testing components that directly use Fleet fields
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: jest.fn(({ value, onChange }) => (
    <input
      data-test-subj="mock-fleet-input"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
}));
```

## 🎓 Lessons Learned from Actual Refactoring

### 📊 Refactoring Summary

**Completed:** AWS, Azure, and GCP credentials form test refactoring
**Approach:** Integration testing with mocked child components
**Result:** All tests passing (AWS: 11, Azure: 2, GCP: 13)

### � Key Principles Applied

#### 1. Mock Child Components, Test Composition

```typescript
// Actual pattern from aws_credentials_form_agentless.test.tsx
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: jest.fn(() => <div data-test-subj="mock-aws-input-fields" />),
}));

// Test that parent passes correct props to child
it('passes correct props to input fields', () => {
  renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

  expect(mockAwsInputVarFields).toHaveBeenCalledWith(
    expect.objectContaining({
      fields: expect.any(Array),
      packageInfo: defaultProps.packageInfo,
    }),
    {}
  );
});
```

#### 2. Use jest.requireMock() to Connect Mocks

```typescript
// Actual fix applied to gcp_account_type_selector.test.tsx (lines 42-45)
jest.mock('../utils', () => ({ updatePolicyWithInputs: jest.fn() }));

// CRITICAL: Get the actual mocked function
const { updatePolicyWithInputs: mockUpdatePolicyWithInputs } = jest.requireMock('../utils');
```

This fixed the issue where mock functions declared separately weren't being called.

#### 3. Mock Implementations Must Actually Apply Updates

```typescript
// Actual fix from gcp_account_type_selector.test.tsx
mockUpdatePolicyWithInputs.mockImplementation(
  (
    policy: NewPackagePolicy,
    policyType: string,
    updates: Record<string, { value?: unknown; type?: string }>
  ) => ({
    ...policy,
    inputs: policy.inputs.map((input) => ({
      ...input,
      streams: input.streams.map((stream) => ({
        ...stream,
        vars: { ...stream.vars, ...updates },
      })),
    })),
  })
);
```

This fixed tests that expected policy updates but mock was returning unchanged policy.

### 🐛 Actual Issues Fixed

#### Issue 1: Using getBy\* for Negative Assertions

**File:** `azure_credentials_form_agentless.test.tsx`, line 259
**Error:** `TestingLibraryElementError: Unable to find element`
**Fix:**

```typescript
// ❌ WRONG - throws error when element doesn't exist
expect(screen.getByTestId('azure-selector')).not.toBeInTheDocument();

// ✅ CORRECT - returns null
expect(screen.queryByTestId('azure-selector')).not.toBeInTheDocument();
```

#### Issue 2: Mock Functions Not Being Called

**File:** `gcp_account_type_selector.test.tsx`
**Error:** `Number of calls: 0` when expecting mock to be called
**Fix:** Used `jest.requireMock()` to connect mock functions properly (see pattern above)

#### Issue 3: Tests Expecting Properties Component Doesn't Pass

**File:** `gcp_account_type_selector.test.tsx`
**Error:** Test expected `isValid: true` but component only passes `updatedPolicy`
**Fix:**

```typescript
// Component actual call: updatePolicy({ updatedPolicy: newPolicy })

// ❌ WRONG - hallucinated property
expect(mockUpdatePolicy).toHaveBeenCalledWith({
  isValid: true,
  updatedPolicy: expect.objectContaining({...})
});

// ✅ CORRECT - matches actual component behavior
expect(mockUpdatePolicy).toHaveBeenCalledWith({
  updatedPolicy: expect.objectContaining({...})
});
```

#### Issue 4: Component Behavior Misunderstood

**File:** `gcp_account_type_selector.test.tsx`
**Issue:** Test expected second click to trigger update, but component only updates when selection changes
**Fix:** Simplified test to only check one click with explanatory comment:

```typescript
// Component only updates when new selection differs from input
// First click: organization (differs from default 'single-account') → triggers update
await userEvent.click(screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ));
expect(mockUpdatePolicyWithInputs).toHaveBeenCalledTimes(1);
```

## 🚨 Common Testing Pitfalls & Solutions

### Issue 1: Mock Functions Not Connected

**Error:**

```
expect(jest.fn()).toHaveBeenCalledWith(...expected)
- Expected: updatedPolicy with changes
+ Received: undefined
Number of calls: 0
```

**Root Cause:** Creating mock variables that aren't connected to jest.mock()

**Solution:**

```typescript
// ❌ WRONG
const mockUpdatePolicy = jest.fn();
jest.mock('../utils', () => ({ updatePolicyWithInputs: jest.fn() }));

// ✅ CORRECT
jest.mock('../utils', () => ({ updatePolicyWithInputs: jest.fn() }));
const { updatePolicyWithInputs: mockUpdatePolicy } = jest.requireMock('../utils');
```

### Issue 2: Using getBy\* for Negative Assertions

**Error:**

```
TestingLibraryElementError: Unable to find an element by: [data-test-subj="azure-selector"]
```

**Root Cause:** Using `getByTestId()` when checking element does NOT exist

**Solution:**

```typescript
// ❌ WRONG - throws error
expect(screen.getByTestId('azure-selector')).not.toBeInTheDocument();

// ✅ CORRECT - returns null
expect(screen.queryByTestId('azure-selector')).not.toBeInTheDocument();
```

### Issue 3: Missing Test Expectations

**Problem:** Test passes but doesn't actually verify anything

**Solution:** Every test must have at least one `expect()` statement:

```typescript
// ❌ WRONG - no validation
it('renders component', () => {
  renderWithIntl(<Component {...defaultProps} />);
});

// ✅ CORRECT - validates behavior
it('renders component with expected elements', () => {
  renderWithIntl(<Component {...defaultProps} />);
  expect(screen.getByTestId('expected-element')).toBeInTheDocument();
});
```

### Issue 4: Mock Implementation Not Applying Updates

**Error:** Tests expect policy changes but mock doesn't apply them

**Solution:**

```typescript
// ❌ WRONG - returns policy unchanged
mockUpdatePolicyWithInputs.mockImplementation((policy) => policy);

// ✅ CORRECT - actually applies updates
mockUpdatePolicyWithInputs.mockImplementation((policy, policyType, updates) => ({
  ...policy,
  inputs: policy.inputs.map((input) => ({
    ...input,
    streams: input.streams.map((stream) => ({
      ...stream,
      vars: { ...stream.vars, ...updates },
    })),
  })),
}));
```

### Issue 5: Expecting isValid When Component Doesn't Set It

**Error:** Test expects `isValid: true` but component never passes it

**Solution:** Check what component actually calls, don't hallucinate properties:

```typescript
// Component code: updatePolicy({ updatedPolicy: newPolicy })

// ❌ WRONG - component doesn't pass isValid
expect(mockUpdatePolicy).toHaveBeenCalledWith({
  isValid: true,
  updatedPolicy: expect.objectContaining({...})
});

// ✅ CORRECT - match actual component behavior
expect(mockUpdatePolicy).toHaveBeenCalledWith({
  updatedPolicy: expect.objectContaining({...})
});
```

### Issue 6: Test Subject Constant Mismatches

**Error:**

```
Unable to find an element by: [data-test-subj="gcp-organization"]
```

**Solution:** Always import from `@kbn/cloud-security-posture-common`:

```typescript
// ❌ WRONG - hardcoded string
expect(screen.getByTestId('gcp-organization')).toBeInTheDocument();

// ✅ CORRECT - imported constant
import { GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
expect(screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ)).toBeInTheDocument();
```

## 📋 Test Implementation Checklist

### Phase 1: Setup & Mocking

- [ ] Create inline mocks for all external dependencies
- [ ] Set up test wrapper with necessary providers
- [ ] Verify mocks render expected test elements

### Phase 2: Component Behavior

- [ ] Test basic rendering with default props
- [ ] Test user interactions (input changes, clicks)
- [ ] Test validation states and error handling
- [ ] Test different configuration scenarios

### Phase 3: Cross-Provider Patterns

- [ ] Demonstrate same test works with different provider data
- [ ] Test shared utilities across components
- [ ] Verify type compatibility across providers

### Phase 4: Edge Cases

- [ ] Test with empty/null/undefined values
- [ ] Test with invalid configurations
- [ ] Test loading and error states

## 📊 Success Metrics

| Metric                      | Target                     | Validation Method                    |
| --------------------------- | -------------------------- | ------------------------------------ |
| **Test Pass Rate**          | 100%                       | All tests passing without skips      |
| **Cross-Provider Coverage** | 3 providers                | Same tests work for AWS/Azure/GCP    |
| **API Discovery**           | No assumptions             | Tests discover actual component APIs |
| **Mock Stability**          | No scope errors            | All mocks properly scoped            |
| **Type Safety**             | Full TypeScript compliance | No type errors in tests              |

## 🎯 Testing Workflow

### Step 1: Setup Test Structure

```typescript
// 1. Create renderWithIntl helper
const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

// 2. Define defaultProps with required properties
const defaultProps = {
  input: mockInput,
  newPolicy: mockNewPolicy,
  updatePolicy: mockUpdatePolicy,
  packageInfo: mockPackageInfo,
  isEditMode: false,
};

// 3. Mock child components
jest.mock('./child_component', () => ({
  ChildComponent: jest.fn(() => <div data-test-subj="mock-child" />),
}));
const { ChildComponent: mockChildComponent } = jest.requireMock('./child_component');
```

### Step 2: Write Tests

```typescript
describe('YourComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders child component with correct props', () => {
    renderWithIntl(<YourComponent {...defaultProps} />);

    expect(mockChildComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: defaultProps.input,
        newPolicy: defaultProps.newPolicy,
      }),
      {}
    );
  });

  it('handles user interaction', async () => {
    renderWithIntl(<YourComponent {...defaultProps} />);

    await userEvent.click(screen.getByTestId('some-button'));

    expect(mockUpdatePolicy).toHaveBeenCalledWith({
      updatedPolicy: expect.objectContaining({
        // expected changes
      }),
    });
  });
});
```

### Step 3: Run & Debug Tests

```bash
# Run specific test file
yarn test:jest your_component.test.tsx

# Run specific test by name
yarn test:jest your_component.test.tsx --testNamePattern="renders child component"

# Watch mode for development
yarn test:jest your_component.test.tsx --watch

# Debug with verbose output
yarn test:jest your_component.test.tsx --verbose
```

### Quick Test Commands

```bash
# Test specific component
yarn test:jest aws_credentials_form.test.tsx --no-coverage

# Test all fleet extensions
yarn test:jest --testPathPattern='fleet_extensions' --watch

# Debug test with verbose output
yarn test:jest component.test.tsx --no-coverage --verbose

# Debug specific failing test
yarn test:jest component.test.tsx --testNamePattern="shows direct access key fields"
```

## � Key Testing Principles

### 1. **Mock Child Components, Test Composition**

Don't test child components' internal behavior - they have their own tests.

```typescript
// Mock the child, verify parent passes correct props
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: jest.fn(() => <div data-test-subj="mock-fields" />),
}));
```

### 2. **Always Use jest.requireMock() for Mock Connections**

Declare mocks with `jest.mock()`, then connect with `jest.requireMock()`:

```typescript
jest.mock('../utils', () => ({ updatePolicyWithInputs: jest.fn() }));
const { updatePolicyWithInputs: mockUpdatePolicy } = jest.requireMock('../utils');
```

### 3. **Every Test MUST Have Expectations**

Tests without expectations are hallucinations:

```typescript
// ❌ WRONG - no validation
it('renders component', () => {
  renderWithIntl(<Component {...defaultProps} />);
});

// ✅ CORRECT - validates behavior
it('renders component with expected elements', () => {
  renderWithIntl(<Component {...defaultProps} />);
  expect(screen.getByTestId('expected-element')).toBeInTheDocument();
});
```

### 4. **Use queryBy\* for Negative Assertions**

Use `queryBy*` when checking elements that should NOT exist:

```typescript
// ❌ WRONG - throws error
expect(screen.getByTestId('selector')).not.toBeInTheDocument();

// ✅ CORRECT - returns null
expect(screen.queryByTestId('selector')).not.toBeInTheDocument();
```

### 5. **Don't Assume Component Behavior - Verify It**

Check what component actually does, don't hallucinate properties:

```typescript
// Look at component code first
// Component: updatePolicy({ updatedPolicy: newPolicy })

// ✅ CORRECT - matches reality
expect(mockUpdatePolicy).toHaveBeenCalledWith({
  updatedPolicy: expect.objectContaining({...})
});
```

## 📝 Quick Reference

### Test File Template

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { YourComponent } from './your_component';

// Mock child components
jest.mock('./child_component', () => ({
  ChildComponent: jest.fn(() => <div data-test-subj="mock-child" />),
}));

// Mock utilities
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn(),
}));

// Connect mocks
const { ChildComponent: mockChildComponent } = jest.requireMock('./child_component');
const { updatePolicyWithInputs: mockUpdatePolicy } = jest.requireMock('../utils');

// Helper
const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('YourComponent', () => {
  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders child component with correct props', () => {
    renderWithIntl(<YourComponent {...defaultProps} />);

    expect(mockChildComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: defaultProps.input,
      }),
      {}
    );
  });

  it('handles user interaction', async () => {
    renderWithIntl(<YourComponent {...defaultProps} />);

    await userEvent.click(screen.getByTestId('button'));

    expect(mockUpdatePolicy).toHaveBeenCalledWith({
      updatedPolicy: expect.objectContaining({...})
    });
  });
});
```

### Remember

1. **Mock child components** - they have their own tests
2. **Use jest.requireMock()** - to connect mocks properly
3. **Every test needs expectations** - no hallucinations
4. **Use queryBy\* for negative assertions** - getBy\* throws errors
5. **Verify actual behavior** - don't assume properties
6. **Import constants** - from `@kbn/cloud-security-posture-common`
7. **Make mocks apply updates** - don't return policy unchanged

---

**Updated:** Based on actual AWS, Azure, and GCP credentials form refactoring work. All patterns reflect real implementations, not theoretical approaches.
