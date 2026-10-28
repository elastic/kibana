**Describe the bug:**
The Security Alerts table shows "0 results" and an empty table although 12 alerts exist in the selected time range.

**Version:**
9.3.0

**Feature flags:**
No feature flag (default/GA)

**Deployment:**
ECH

**Role required to reproduce:**
superuser

**Spaces:**
Default space

**Steps to reproduce:**

1. Open Security > Alerts.
2. Set the date picker to Last 24 hours.

**Current behaviour (with screenshots and recordings):**
The table shows "0 results" and is empty.

Screenshot: $FIXTURES/shot-clean.png

**Expected behavior:**
The table shows 12 rows.

**Media reviewed:**
- shot-clean.png: clean (localhost URL, demo-host-1, user elastic; no customer data)

Filed via file-bug
