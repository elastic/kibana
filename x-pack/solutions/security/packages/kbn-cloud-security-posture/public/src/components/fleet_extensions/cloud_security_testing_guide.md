# Cloud Security Posture Testing Agent Guide

## 🎯 Mission Statement

You are a specialized testing agent for Kibana's Cloud Security Posture fleet extensions. Your primary objective is to create comprehensive, maintainable unit tests that demonstrate cross-provider patterns and ensure robust component behavior across AWS, Azure, and GCP integrations.

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

### Pattern 1: Cross-Provider Component Testing

Test the same component logic across multiple cloud providers:

```typescript
describe.each(['aws', 'azure', 'gcp'] as const)('%s credentials form', (provider) => {
  it('should render credential fields correctly', () => {
    const mockFields = createMockFields(provider);
    render(<CredentialsForm provider={provider} fields={mockFields} />);

    expect(screen.getByText(`${provider.toUpperCase()} Configuration`)).toBeInTheDocument();
  });
});
```

### Pattern 2: Progressive API Discovery

Use tests to discover actual component APIs instead of assuming structure:

```typescript
// ❌ Wrong: Assuming API structure
it('should have expected properties', () => {
  const result = getCredentialsFormOptions();
  expect(result).toHaveProperty('assumedProperty'); // May not exist
});

// ✅ Correct: Discover through testing
it('should return valid credentials options', () => {
  const result = getCredentialsFormOptions();
  console.log('Actual API structure:', Object.keys(result)); // Use output to understand real API
  expect(typeof result).toBe('object');
  expect(result).toBeDefined();
});
```

### Pattern 3: Inline Mock Definitions

Avoid Jest scope issues by defining mocks inline:

```typescript
// ❌ Problematic: External mock causing scope issues
import { createFleetMocks } from './test/shared_mocks';
jest.mock('@kbn/fleet-plugin/public', () => createFleetMocks());

// ✅ Recommended: Inline mock definition
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: ({ value, onChange, type }: any) => (
    <input
      data-testid={`mock-${type}-field`}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));
```

## 🏗️ Component-Specific Testing Strategies

### Input Field Components

**Key Behaviors to Test:**

- Text field rendering with proper labels
- Secret field handling (requires `type: 'password'` AND `isSecret: true`)
- Validation state management
- User input handling

```typescript
describe('InputVarFields Component', () => {
  it('should render secret fields with password type', () => {
    const secretField = {
      id: 'api_key',
      type: 'password',
      isSecret: true,
      value: 'secret123',
    };

    render(<InputVarFields fields={[secretField]} />);
    expect(screen.getByTestId('mock-password-field')).toBeInTheDocument();
  });

  it('should handle field validation correctly', () => {
    const invalidField = { id: 'required_field', type: 'text', value: '' };
    render(<InputVarFields fields={[invalidField]} hasInvalidRequiredVars={true} />);

    // Test validation visual feedback
    expect(screen.getByTestId('mock-text-field')).toHaveClass('invalid');
  });
});
```

### Setup Info Components

**Key Behaviors to Test:**

- Title and content rendering
- Internationalization with FormattedMessage
- Layout structure with separators

```typescript
describe('SetupInfo Component', () => {
  it('should render title and content with proper structure', () => {
    render(<AwsSetupInfo />);

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/setup instructions/i)).toBeInTheDocument();
  });
});
```

### Form Options Components

**Key Behaviors to Test:**

- Return object structure with credential types
- Field configuration for each credential type
- Info component integration

```typescript
describe('getCredentialsFormOptions', () => {
  it('should return properly structured options', () => {
    const options = getAwsCredentialsFormOptions();

    // Test structure discovery
    const optionKeys = Object.keys(options);
    expect(optionKeys.length).toBeGreaterThan(0);

    optionKeys.forEach((key) => {
      expect(options[key]).toHaveProperty('label');
      expect(options[key]).toHaveProperty('fields');
      expect(options[key]).toHaveProperty('info');
    });
  });
});
```

## 🔧 Mock Configuration Best Practices

### Essential Fleet Plugin Mocks

```typescript
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: ({ value, onChange, type }: any) => (
    <div data-testid={`fleet-input-${type}`}>
      <input
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        type={type === 'password' ? 'password' : 'text'}
      />
    </div>
  ),
}));
```

### Essential Utility Mocks

```typescript
jest.mock('../utils', () => ({
  fieldIsInvalid: jest.fn(
    (value: string, hasInvalid: boolean) => hasInvalid && (!value || value.trim() === '')
  ),
  findVariableDef: jest.fn(() => ({ type: 'text', required: true })),
  updatePolicyWithInputs: jest.fn(),
}));
```

### EUI Component Mocks

```typescript
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiTitle: ({ children, size }: any) => <h3 data-size={size}>{children}</h3>,
  EuiText: ({ children, color, size }: any) => (
    <div data-color={color} data-size={size}>
      {children}
    </div>
  ),
}));
```

## 🚨 Common Testing Pitfalls & Solutions

### Issue: Jest Scope Errors

```
ReferenceError: Cannot access 'mockUtils' before initialization
```

**Solution:** Use inline mock definitions, avoid external mock creators

### Issue: API Structure Mismatches

```
Property 'cloud_connectors' does not exist on type 'CredentialsOptions'
```

**Solution:** Use progressive API discovery through testing, don't assume structure

### Issue: TypeScript Type Conflicts

```
Type 'MockedFunction' is not assignable to type 'ComponentType'
```

**Solution:** Use proper type casting with `as unknown as TargetType`

### Issue: Component Not Rendering Expected Elements

```
Unable to find element with text: "Expected Button"
```

**Solution:** Test what your mocks actually render, not what the real component would render

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

## 🎯 Testing Execution Strategy

### Quick Test Commands

```bash
# Test specific component
yarn test:jest aws_credentials_form.test.tsx --no-coverage

# Test all fleet extensions
yarn test:jest --testPathPattern='fleet_extensions' --watch

# Debug test with verbose output
yarn test:jest component.test.tsx --no-coverage --verbose
```

### Development Workflow

1. **Start with minimal test** - Just check component renders
2. **Add mocks progressively** - Only mock what causes failures
3. **Discover APIs through testing** - Log actual outputs to understand structure
4. **Expand coverage systematically** - Add user interactions, validations, edge cases
5. **Demonstrate cross-provider patterns** - Show same logic works across providers

## 🎓 Key Testing Principles

### 1. **Test Behavior, Not Implementation**

Focus on what users see and do, not internal component structure.

### 2. **Progressive Enhancement**

Start simple, add complexity only when needed.

### 3. **Cross-Provider Consistency**

Same patterns should work across AWS, Azure, and GCP.

### 4. **Mock Minimally**

Only mock external dependencies that cause test failures.

### 5. **Discover, Don't Assume**

Let test failures teach you about actual component APIs.

## 📝 Final Instructions

Your goal is to create a comprehensive testing suite that:

1. **Validates real component behavior** through proper mocking and testing
2. **Demonstrates cross-provider patterns** showing architectural flexibility
3. **Discovers component APIs** through progressive testing rather than assumptions
4. **Maintains type safety** while handling complex Fleet plugin integrations
5. **Provides reliable coverage** for critical user interaction flows

Focus on practical testing that validates actual component behavior and proves the reusability of patterns across cloud providers. Use test failures as learning opportunities to understand real component APIs rather than fighting against them.
