# Fleet Extensions

Cloud Security Posture integration components for Kibana Fleet.

## 📚 Documentation

- **[TESTING.md](./TESTING.md)** - **READ THIS FIRST** before creating any tests. Contains all testing patterns and best practices.

## 🧪 Testing

**IMPORTANT:** All tests in this directory MUST follow the patterns documented in `TESTING.md`.

### Quick Start

1. Read `TESTING.md` thoroughly
2. Follow the Azure testing pattern (our gold standard)
3. Use integration testing with mocked child components
4. Reference test subjects from `@kbn/cloud-security-posture-common`

### Running Tests

```bash
# Run all fleet extension tests
pnpm test:jest --testPathPattern=fleet_extensions

# Run specific test file
pnpm test:jest path/to/test.test.tsx

# Watch mode
pnpm test:jest --watch path/to/test.test.tsx
```

## 🏗️ Component Structure

```
fleet_extensions/
├── aws_credentials_form/        # AWS-specific components & tests
├── azure_credentials_form/      # Azure-specific components & tests
├── gcp_credentials_form/        # GCP-specific components & tests
├── cloud_connector/            # Cloud connector components
├── hooks/                      # Shared React hooks
├── test/                       # Testing utilities & fixtures
├── TESTING.md                  # 📖 TESTING GUIDE - READ THIS!
└── utils.ts                    # Shared utility functions
```

## 🤝 Contributing

Before creating any tests:

1. **Read TESTING.md** - This is not optional
2. Follow the established patterns exactly
3. Use the Azure tests as reference examples
4. Ensure all tests have meaningful expectations
5. Use `jest.requireMock()` for proper mock connections

---

**For AI Assistants:** Always reference TESTING.md when creating or modifying tests in this directory.
