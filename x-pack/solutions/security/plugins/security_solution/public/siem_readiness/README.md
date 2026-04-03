# SIEM Readiness

The SIEM Readiness Dashboard is a **beta** feature that creates a centralized hub for users to identify gaps in their SIEM. It helps users better utilize Elastic tools to detect, respond, and close those gaps.

## Key Areas

The dashboard evaluates your SIEM readiness across four critical dimensions:

- **Coverage** - Identifies missing log categories and integrations to ensure comprehensive data visibility across your environment
- **Quality** - Validates that your data complies with Elastic Common Schema (ECS) for optimal detection capabilities
- **Continuity** - Monitors ingest pipeline health to detect data injection failures that could compromise your security posture
- **Retention** - Ensures your data retention policies meet compliance standards and investigation requirements

## Development

### Accessing the Feature

You can access SIEM Readiness via:
- The **Security solution navigation sidebar** under "Launchpad"
- The Kibana search bar
- Direct URL: `http://localhost:5601/app/security/siem_readiness`

See also the [Kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions on setting up your development environment.

## Testing

For general guidelines, read the [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details.
