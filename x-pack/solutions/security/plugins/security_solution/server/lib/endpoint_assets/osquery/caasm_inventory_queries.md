# CAASM Inventory Osquery Queries

These queries populate the Entity Store with comprehensive hardware and software inventory data.

## Pack Configuration

Add these queries to your osquery pack in Kibana (Stack Management > Osquery > Packs).

---

## 1. System Info (Hardware Identity)

**Query Name:** `caasm_system_info`
**Interval:** 3600 (1 hour)
**Platform:** all

```sql
SELECT
  hardware_vendor AS 'endpoint.hardware.vendor',
  hardware_model AS 'endpoint.hardware.model',
  hardware_serial AS 'endpoint.hardware.serial',
  uuid AS 'endpoint.hardware.uuid',
  cpu_brand AS 'endpoint.hardware.cpu.brand',
  cpu_type AS 'endpoint.hardware.cpu.type',
  cpu_physical_cores AS 'endpoint.hardware.cpu.physical_cores',
  cpu_logical_cores AS 'endpoint.hardware.cpu.logical_cores',
  cpu_sockets AS 'endpoint.hardware.cpu.sockets',
  physical_memory AS 'endpoint.hardware.memory.total_bytes',
  ROUND(CAST(physical_memory AS REAL) / 1073741824, 2) AS 'endpoint.hardware.memory.total_gb',
  board_vendor AS 'endpoint.hardware.board.vendor',
  board_model AS 'endpoint.hardware.board.model',
  board_version AS 'endpoint.hardware.board.version',
  computer_name,
  hostname,
  local_hostname
FROM system_info;
```

---

## 2. Disk Inventory

**Query Name:** `caasm_disk_info`
**Interval:** 3600 (1 hour)
**Platform:** all

```sql
SELECT
  COUNT(*) AS 'endpoint.hardware.disk.count',
  SUM(CAST(size AS REAL)) / 1073741824 AS 'endpoint.hardware.disk.total_capacity_gb',
  GROUP_CONCAT(name || ' (' || ROUND(CAST(size AS REAL) / 1073741824, 1) || ' GB)', ', ') AS 'endpoint.hardware.disk.devices'
FROM disk_info
WHERE size > 0;
```

**Query Name:** `caasm_disk_info_detailed`
**Interval:** 3600 (1 hour)
**Platform:** all

```sql
SELECT
  name,
  manufacturer,
  model,
  serial,
  ROUND(CAST(size AS REAL) / 1073741824, 2) AS size_gb,
  type,
  partitions
FROM disk_info
WHERE size > 0;
```

---

## 3. Memory Devices (RAM Slots)

**Query Name:** `caasm_memory_devices`
**Interval:** 3600 (1 hour)
**Platform:** windows, linux

```sql
SELECT
  COUNT(*) AS 'endpoint.hardware.memory.slots_used',
  MAX(type) AS 'endpoint.hardware.memory.type',
  MAX(speed) AS 'endpoint.hardware.memory.speed',
  SUM(CAST(size AS INTEGER)) AS total_memory_mb
FROM memory_devices
WHERE size != '0' AND size IS NOT NULL;
```

---

## 4. Network Interfaces

**Query Name:** `caasm_network_interfaces`
**Interval:** 3600 (1 hour)
**Platform:** all

```sql
SELECT
  COUNT(*) AS 'endpoint.network.interface_count',
  GROUP_CONCAT(DISTINCT interface, ', ') AS 'endpoint.network.interfaces',
  GROUP_CONCAT(DISTINCT mac, ', ') AS 'endpoint.network.mac_addresses'
FROM interface_details
WHERE mac != '' AND mac != '00:00:00:00:00:00';
```

**Query Name:** `caasm_ip_addresses`
**Interval:** 3600 (1 hour)
**Platform:** all

```sql
SELECT
  GROUP_CONCAT(DISTINCT address, ', ') AS 'endpoint.network.ip_addresses'
FROM interface_addresses
WHERE address NOT LIKE '127.%'
  AND address NOT LIKE 'fe80:%'
  AND address NOT LIKE '::1'
  AND type = 'ipv4';
```

---

## 5. USB Devices

**Query Name:** `caasm_usb_devices`
**Interval:** 1800 (30 minutes)
**Platform:** all

```sql
SELECT
  COUNT(*) AS 'endpoint.hardware.usb.count',
  SUM(CASE WHEN removable = 1 THEN 1 ELSE 0 END) AS 'endpoint.hardware.usb.removable_count',
  GROUP_CONCAT(vendor || ' ' || model, ', ') AS 'endpoint.hardware.usb.devices'
FROM usb_devices;
```

---

## 6. Installed Software - Windows

**Query Name:** `caasm_installed_programs_windows`
**Interval:** 3600 (1 hour)
**Platform:** windows

```sql
SELECT
  name,
  version,
  publisher,
  install_date,
  install_location,
  CASE
    WHEN name LIKE '%Chrome%' OR name LIKE '%Firefox%' OR name LIKE '%Edge%' OR name LIKE '%Safari%' THEN 'browser'
    WHEN name LIKE '%Defender%' OR name LIKE '%Norton%' OR name LIKE '%McAfee%' OR name LIKE '%CrowdStrike%' OR name LIKE '%Carbon Black%' OR name LIKE '%Sentinel%' THEN 'security'
    WHEN name LIKE '%TeamViewer%' OR name LIKE '%AnyDesk%' OR name LIKE '%LogMeIn%' OR name LIKE '%VNC%' THEN 'remote_access'
    WHEN name LIKE '%Visual Studio%' OR name LIKE '%VSCode%' OR name LIKE '%JetBrains%' OR name LIKE '%Python%' OR name LIKE '%Node%' THEN 'dev_tools'
    ELSE 'other'
  END AS category
FROM programs
WHERE name != '';
```

**Query Name:** `caasm_software_summary_windows`
**Interval:** 3600 (1 hour)
**Platform:** windows

```sql
SELECT
  COUNT(*) AS 'endpoint.software.installed_count',
  SUM(CASE WHEN name LIKE '%Chrome%' OR name LIKE '%Firefox%' OR name LIKE '%Edge%' THEN 1 ELSE 0 END) AS browser_count,
  GROUP_CONCAT(CASE WHEN name LIKE '%Chrome%' OR name LIKE '%Firefox%' OR name LIKE '%Edge%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.browsers',
  GROUP_CONCAT(CASE WHEN name LIKE '%Defender%' OR name LIKE '%CrowdStrike%' OR name LIKE '%Carbon Black%' OR name LIKE '%Sentinel%' OR name LIKE '%Norton%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.security_tools',
  GROUP_CONCAT(CASE WHEN name LIKE '%TeamViewer%' OR name LIKE '%AnyDesk%' OR name LIKE '%LogMeIn%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.remote_access',
  GROUP_CONCAT(CASE WHEN name LIKE '%Visual Studio%' OR name LIKE '%VSCode%' OR name LIKE '%Python%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.dev_tools'
FROM programs
WHERE name != '';
```

---

## 7. Installed Software - macOS

**Query Name:** `caasm_installed_apps_macos`
**Interval:** 3600 (1 hour)
**Platform:** darwin

```sql
SELECT
  name,
  bundle_short_version AS version,
  bundle_identifier,
  path,
  CASE
    WHEN name LIKE '%Chrome%' OR name LIKE '%Firefox%' OR name LIKE '%Safari%' THEN 'browser'
    WHEN bundle_identifier LIKE '%crowdstrike%' OR bundle_identifier LIKE '%sentinelone%' OR bundle_identifier LIKE '%carbonblack%' THEN 'security'
    WHEN name LIKE '%TeamViewer%' OR name LIKE '%AnyDesk%' THEN 'remote_access'
    WHEN name LIKE '%Xcode%' OR name LIKE '%Visual Studio%' OR name LIKE '%PyCharm%' THEN 'dev_tools'
    ELSE 'other'
  END AS category
FROM apps
WHERE name != '';
```

**Query Name:** `caasm_software_summary_macos`
**Interval:** 3600 (1 hour)
**Platform:** darwin

```sql
SELECT
  COUNT(*) AS 'endpoint.software.installed_count',
  GROUP_CONCAT(CASE WHEN name LIKE '%Chrome%' OR name LIKE '%Firefox%' OR name = 'Safari' THEN name ELSE NULL END, ', ') AS 'endpoint.software.browsers',
  GROUP_CONCAT(CASE WHEN bundle_identifier LIKE '%crowdstrike%' OR bundle_identifier LIKE '%sentinelone%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.security_tools',
  GROUP_CONCAT(CASE WHEN name LIKE '%TeamViewer%' OR name LIKE '%AnyDesk%' THEN name ELSE NULL END, ', ') AS 'endpoint.software.remote_access'
FROM apps
WHERE name != '';
```

---

## 8. Installed Software - Linux (Debian/Ubuntu)

**Query Name:** `caasm_installed_packages_deb`
**Interval:** 3600 (1 hour)
**Platform:** linux

```sql
SELECT
  name,
  version,
  source,
  maintainer,
  CASE
    WHEN name LIKE '%chrome%' OR name LIKE '%firefox%' OR name LIKE '%chromium%' THEN 'browser'
    WHEN name LIKE '%crowdstrike%' OR name LIKE '%clamav%' THEN 'security'
    ELSE 'other'
  END AS category
FROM deb_packages
WHERE name != '';
```

**Query Name:** `caasm_software_summary_linux`
**Interval:** 3600 (1 hour)
**Platform:** linux

```sql
SELECT
  (SELECT COUNT(*) FROM deb_packages) + (SELECT COUNT(*) FROM rpm_packages) AS 'endpoint.software.installed_count'
FROM (SELECT 1) AS dummy;
```

---

## 9. Listening Ports (Attack Surface)

**Query Name:** `caasm_listening_ports`
**Interval:** 900 (15 minutes)
**Platform:** all

```sql
SELECT
  COUNT(*) AS 'endpoint.network.listening_ports_count',
  GROUP_CONCAT(DISTINCT port || '/' || protocol, ', ') AS listening_ports
FROM listening_ports
WHERE address != '127.0.0.1' AND address != '::1';
```

---

## ECS Mapping

When configuring the queries in Kibana Osquery, use these ECS mappings:

| Query Field | ECS Field |
|------------|-----------|
| `endpoint.hardware.*` | Custom field (stored as-is) |
| `endpoint.software.*` | Custom field (stored as-is) |
| `endpoint.network.*` | Custom field (stored as-is) |

---

## Notes

1. **Intervals**: Adjust based on your environment. Hardware rarely changes (1hr), software occasionally (1hr), network/ports more often (15-30min).

2. **Platform filtering**: Use the platform field to run queries only on relevant OS.

3. **Result aggregation**: Summary queries aggregate data for Entity Store; detailed queries store full inventory in `endpoint-assets-osquery-*`.

4. **Entity Store sync**: After adding queries, the Entity Store transform will automatically pick up the new fields on the next sync cycle.
