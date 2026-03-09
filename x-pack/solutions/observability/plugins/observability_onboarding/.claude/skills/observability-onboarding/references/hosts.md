# Host Onboarding

## Prerequisites

- Linux (Debian/Ubuntu, RHEL/CentOS, SUSE) or macOS
- Root or sudo access for package installation and log file access

## Installation Steps

### 1. Detect OS and architecture

```bash
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case $ARCH in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac
echo "OS: $OS, ARCH: $ARCH"
```

### 2. Install EDOT Collector

#### Debian/Ubuntu

```bash
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/9.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-otel.list
sudo apt-get update && sudo apt-get install -y elastic-otel-collector
```

#### RHEL/CentOS

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
cat <<EOF | sudo tee /etc/yum.repos.d/elastic-otel.repo
[elastic-otel]
name=Elastic OTel Collector
baseurl=https://artifacts.elastic.co/packages/9.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
EOF
sudo yum install -y elastic-otel-collector
```

#### macOS (binary download)

```bash
EDOT_VERSION="0.15.0"
curl -fsSL "https://github.com/elastic/elastic-otel-collector/releases/download/v${EDOT_VERSION}/elastic-otel-collector_${EDOT_VERSION}_darwin_${ARCH}.tar.gz" -o /tmp/edot.tar.gz
sudo mkdir -p /opt/elastic-otel-collector
sudo tar -xzf /tmp/edot.tar.gz -C /opt/elastic-otel-collector
rm /tmp/edot.tar.gz
```

### 3. Write config

Write the config from `otel-config.md` (host variant) to `/etc/elastic-otel-collector/otel.yml` (Linux) or `/opt/elastic-otel-collector/otel.yml` (macOS).

### 4. Start the collector

#### Linux (systemd)

```bash
sudo systemctl enable elastic-otel-collector
sudo systemctl start elastic-otel-collector
sudo systemctl status elastic-otel-collector
```

#### macOS (foreground for now)

```bash
sudo /opt/elastic-otel-collector/elastic-otel-collector --config /opt/elastic-otel-collector/otel.yml &
```

## Collected Data

- **Logs**: System logs (`/var/log/syslog`, `/var/log/messages`), plus any detected service logs (nginx, apache, mysql, postgresql, etc.)
- **Metrics**: CPU usage, memory, disk I/O, network, filesystem, process metrics

## Detected Service Logs

The skill should scan for and offer to include these common log paths:

| Service | Log paths |
|---|---|
| nginx | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |
| Apache | `/var/log/apache2/*.log`, `/var/log/httpd/*.log` |
| MySQL | `/var/log/mysql/*.log` |
| PostgreSQL | `/var/log/postgresql/*.log` |
| Redis | `/var/log/redis/*.log` |
| MongoDB | `/var/log/mongodb/*.log` |

## Troubleshooting

- If the collector fails to start, check: `journalctl -u elastic-otel-collector -n 50 --no-pager`
- If log files are unreadable, the collector needs read access: `sudo usermod -aG adm otel-collector`
- For macOS permission issues, grant Full Disk Access in System Preferences
