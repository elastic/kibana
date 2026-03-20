# Alert Investigation Pipeline - QA Checklist

**Tester:** _______________ **Date:** _______________ **Kibana Version:** _______________

---

## Pre-Demo Setup

- [ ] Kibana started locally: `yarn start`
- [ ] Elasticsearch running and accessible
- [ ] Security Solution plugin enabled
- [ ] At least 1 security alert exists (use Prebuilt Rules or synthetic data)
- [ ] At least 1 open Security case exists

---

## Browser Testing Matrix

Test the dashboard in multiple browsers:

- [ ] **Chrome** (primary)
- [ ] **Firefox**
- [ ] **Safari** (if Mac available)
- [ ] **Edge** (if Windows available)

---

## Navigation & Access

### Can Access Dashboard

- [ ] Navigate to Kibana home (`http://localhost:5601`)
- [ ] Look for "Alert Investigation Pipeline (Spike)" in Security nav menu
- [ ] Click nav link → dashboard loads
- [ ] **OR** Direct URL works: `http://localhost:5601/app/alert-investigation-pipeline`

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Visual & Layout

### Page Load

- [ ] Dashboard title displays: "Alert Investigation Pipeline"
- [ ] Refresh button visible and enabled
- [ ] No console errors in browser DevTools (F12)
- [ ] No horizontal scrollbars at default window size
- [ ] Layout responsive (test at 1024px, 1280px, 1920px widths)

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Health Status Panel

- [ ] Health status badge visible (`HEALTHY` / `DEGRADED` / `UNHEALTHY`)
- [ ] Status color-coded (green = healthy, yellow = degraded, red = unhealthy)
- [ ] Status reason text displayed below badge
- [ ] Panel has clear visual hierarchy

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Metrics Overview

- [ ] **Top row metrics** displayed:
  - [ ] Total Runs (number)
  - [ ] Success Rate (percentage with color coding)
  - [ ] Avg Duration (formatted time)
  - [ ] Consecutive Failures (number with color if >0)

- [ ] **Second row metrics** displayed:
  - [ ] Alerts Processed
  - [ ] Cases Matched
  - [ ] Cases Created
  - [ ] Alerts Attached
  - [ ] AD Triggered

- [ ] **Last run info** displayed:
  - [ ] "Last run:" label
  - [ ] Timestamp (or "Never" if no runs)
  - [ ] Status badge (success/partial/failed)

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Functionality

### Refresh Button

- [ ] Click "Refresh" button
- [ ] Button shows loading state (spinner or disabled)
- [ ] Metrics update after refresh
- [ ] No errors in console
- [ ] Button re-enables after load

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### API Integration

- [ ] Open DevTools Network tab
- [ ] Refresh page
- [ ] Verify API calls succeed:
  - [ ] `GET /internal/elastic_assistant/attack_discovery/pipeline/_health` → 200
  - [ ] `GET /internal/elastic_assistant/attack_discovery/pipeline/_metrics` → 200
- [ ] Response times < 2 seconds
- [ ] No 404, 500, or timeout errors

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Error Handling

**Simulate API failure:**

1. Open DevTools → Network tab
2. Right-click on `/pipeline/_health` request → Block URL pattern
3. Refresh dashboard
4. **Expected:** Error callout displays: "Error fetching pipeline data"
5. **Expected:** Refresh button still visible (allows retry)

- [ ] Error UI displayed correctly
- [ ] Error message is user-friendly (not raw stack trace)
- [ ] Refresh button allows retry

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Performance & Console

### Console Errors

- [ ] Open DevTools → Console tab
- [ ] Navigate to dashboard
- [ ] **No JavaScript errors** (filter out ResizeObserver warnings, favicon 404s)
- [ ] **No React warnings** (e.g., "Cannot update unmounted component")
- [ ] **No unhandled promise rejections**

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Network Performance

- [ ] Open DevTools → Network tab
- [ ] Refresh dashboard
- [ ] Total load time < 3 seconds
- [ ] No redundant API calls (e.g., same endpoint called multiple times)
- [ ] Payload sizes reasonable (<500KB total)

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Memory Leaks

1. Open DevTools → Performance/Memory tab
2. Record memory snapshot
3. Navigate away from dashboard
4. Navigate back to dashboard
5. Take another snapshot
6. **Expected:** Memory does not continuously increase

- [ ] No memory leaks detected

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Accessibility (A11y)

### Keyboard Navigation

- [ ] Press `Tab` key repeatedly
- [ ] All interactive elements receive focus (button, links)
- [ ] Focus indicator visible (blue outline)
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] `Shift+Tab` navigates backwards

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Screen Reader (Optional)

**Turn on VoiceOver (Mac) or NVDA (Windows)**:

- [ ] Page title announced
- [ ] Health status announced
- [ ] Metrics values announced with labels
- [ ] Button labels announced
- [ ] Error messages announced

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Cross-Browser Issues

### Chrome

- [ ] All features work
- [ ] No visual issues
- [ ] Performance acceptable

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Firefox

- [ ] All features work
- [ ] No visual issues
- [ ] Metrics render correctly

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

### Safari

- [ ] All features work
- [ ] No visual issues
- [ ] API calls succeed

**Bugs found:**
- [ ] None
- [ ] Issue: __________________________________________

---

## Bug Summary

**Total bugs found:** _____

### Critical (Blocks Demo)

1. _______________________________________________
2. _______________________________________________

### Major (Poor UX)

1. _______________________________________________
2. _______________________________________________

### Minor (Polish)

1. _______________________________________________
2. _______________________________________________

---

## Sign-Off

- [ ] **All critical bugs fixed**
- [ ] **Major bugs fixed or documented**
- [ ] **Dashboard is demo-ready**

**Tester Signature:** _______________ **Date:** _______________

**Approved by:** _______________ **Date:** _______________
