# RFC: Saved Object versioning capability

- **Author(s)**: @sdesalas
- **Status**: Draft
- **Created**: August 31 Oct 2025
- **Product Initiatives**: https://github.com/elastic/security-team/issues/12431 (internal)
- **Product Requirements Document**: (tba)
- **Reviewers**: @elastic/security-detection-rule-management, @marshallmain

---

- [1. Summary](#1-summary)
- [2. Motivation](#2-motivation)
- [3. Architecture](#3-architecture)
- [4. Testing](#4-testing)
- [5. Detailed design](#5-detailed-design)
- [6. Technical impact](#6-technical-impact)
- [7. Drawbacks](#7-drawbacks)
- [8. Alternatives](#8-alternatives)
- [9. Adoption strategy](#9-adoption-strategy)
- [10. How we teach this](#10-how-we-teach-this)
- [11. Unresolved questions](#11-unresolved-questions)
- [12. Resolved questions](#12-resolved-questions)

## 1. Summary

This RFC proposes changes to the [Saved Objects service](https://www.elastic.co/docs/extend/kibana/saved-objects-service) in order to support _optional_ versioning and change tracking capabilities in order to meet security product requirements.

## 2. Motivation

Security departments need to comply with an ever increasing set of standards and regulations ([DORA](https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en), [ISO 27001](https://www.iso.org/standard/27001)).

As such, users of our security platform are expecting a modern and robust change management process when it comes to modifying their detection rules and related entities such as rule exceptions, which are currently stored in Kibana as Saved Objects ([1](https://github.com/elastic/enhancements/issues/18841), [2](https://github.com/elastic/enhancements/issues/14407), [3](https://github.com/elastic/enhancements/issues/22381), [4](https://github.com/elastic/enhancements/issues/17559), [5](https://github.com/elastic/enhancements/issues/14655)).

Specifically, users need to be able to show the state of the rule at a specific point in time. They need to be able to review historical changes made to rules, including those that have been deleted. And they also expect the ability revert to a previous state of the rule as needed. They need this for compliance reasons, to understand why the changes were made, as well as to troubleshoot and ensure their correct behaviour. 

This is currently one of top SIEM topics in terms of value and impact to our users.


