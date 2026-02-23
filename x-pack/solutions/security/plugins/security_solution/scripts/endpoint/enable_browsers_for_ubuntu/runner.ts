/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createMultipassHostVmClient, findVm } from '../common/vm_services';

export interface RunEnableBrowsersForUbuntuOptions {
  multipassNameFilter?: string;
  log?: ToolingLog;
}

const ensureSnapPathScript = `
set -euo pipefail

if [ -d /snap/bin ]; then
  sudo tee /etc/profile.d/99-snap-path.sh >/dev/null <<'EOF'
# Ensure snap binaries are available in login shells (including xrdp-launched sessions)
if [ -d /snap/bin ] && ! echo "$PATH" | grep -qE '(^|:)/snap/bin(:|$)'; then
  export PATH="$PATH:/snap/bin"
fi
EOF
  sudo chmod 644 /etc/profile.d/99-snap-path.sh
fi
`;

const createDesktopLaunchersScript = `
set -euo pipefail

USER_HOME=/home/ubuntu
DESKTOP_DIR="$USER_HOME/Desktop"
mkdir -p "$DESKTOP_DIR"

maybe_write_launcher () {
  local name="$1"
  local execPath="$2"
  local icon="$3"
  local file="$DESKTOP_DIR/$name.desktop"

  # If we already created a launcher for this name, do not overwrite it.
  if [ -f "$file" ]; then
    return 0
  fi

  if [ ! -x "$execPath" ]; then
    return 0
  fi

  cat > "$file" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=$name
Exec=$execPath
Icon=$icon
Terminal=false
Categories=Network;WebBrowser;
EOF
  chmod 755 "$file"
  chown ubuntu:ubuntu "$file"
}

# Prefer our wrapper commands if present (works even when DE expects www-browser/x-www-browser)
maybe_write_launcher "Firefox" "/usr/local/bin/www-browser" "firefox"
maybe_write_launcher "Chromium" "/usr/local/bin/www-browser" "chromium-browser"

# Then prefer snap paths if present
maybe_write_launcher "Firefox" "/snap/bin/firefox" "firefox"
maybe_write_launcher "Chromium" "/snap/bin/chromium" "chromium-browser"

# Fallback paths if installed via apt
maybe_write_launcher "Firefox" "/usr/bin/firefox" "firefox"
maybe_write_launcher "Chromium" "/usr/bin/chromium" "chromium-browser"
maybe_write_launcher "Google Chrome" "/usr/bin/google-chrome" "google-chrome"
maybe_write_launcher "Google Chrome" "/usr/bin/google-chrome-stable" "google-chrome"

# Also add a launcher for Epiphany if installed (deb-based browser)
maybe_write_launcher "Epiphany" "/usr/bin/epiphany" "org.gnome.Epiphany"

ls -la "$DESKTOP_DIR" || true
`;

const installFirefoxTarballCmd = `
set -euo pipefail

arch="$(uname -m)"
os="linux64"
if [ "$arch" = "aarch64" ] || [ "$arch" = "arm64" ]; then
  os="linux64-aarch64"
fi

# Install a non-snap Firefox. In XRDP sessions snap Firefox can fail due to snap/session/cgroup quirks.
tmp="$(mktemp -d)"
cd "$tmp"
curl -fsSL -o firefox.tar.xz "https://download.mozilla.org/?product=firefox-latest&os=$os&lang=en-US"

sudo rm -rf /opt/firefox-tarball
sudo mkdir -p /opt/firefox-tarball
sudo tar -xJf firefox.tar.xz -C /opt/firefox-tarball --strip-components=1

sudo ln -sfn /opt/firefox-tarball /opt/firefox
sudo ln -sfn /opt/firefox/firefox /usr/local/bin/firefox
sudo ln -sfn /opt/firefox/firefox /usr/local/bin/firefox-bin

/usr/local/bin/firefox --version | head -n 2 || true
`;

const ensureDefaultBrowserCommandsScript = `
set -euo pipefail

pick_browser () {
  # Prefer our tarball Firefox if installed
  if [ -x /usr/local/bin/firefox ]; then
    echo "/usr/local/bin/firefox"
    return 0
  fi
  # Fallback to a deb-installed browser if present
  if command -v epiphany >/dev/null 2>&1; then
    echo "epiphany"
    return 0
  fi
  # Prefer snap/apt Firefox if present
  if command -v firefox >/dev/null 2>&1; then
    echo "firefox"
    return 0
  fi
  if command -v chromium >/dev/null 2>&1; then
    echo "chromium"
    return 0
  fi
  if command -v google-chrome >/dev/null 2>&1; then
    echo "google-chrome"
    return 0
  fi
  if command -v google-chrome-stable >/dev/null 2>&1; then
    echo "google-chrome-stable"
    return 0
  fi
  return 1
}

BROWSER_BIN="$(pick_browser || true)"
if [ -z "$BROWSER_BIN" ]; then
  echo "No browser binary found (firefox/chromium/chrome). Skipping www-browser setup." >&2
  exit 0
fi

sudo tee /usr/local/bin/www-browser >/dev/null <<'EOF'
#!/bin/sh
exec __BROWSER_BIN__ "$@"
EOF
sudo tee /usr/local/bin/x-www-browser >/dev/null <<'EOF'
#!/bin/sh
exec __BROWSER_BIN__ "$@"
EOF
sudo tee /usr/local/bin/gnome-www-browser >/dev/null <<'EOF'
#!/bin/sh
exec __BROWSER_BIN__ "$@"
EOF

sudo chmod 755 /usr/local/bin/www-browser /usr/local/bin/x-www-browser /usr/local/bin/gnome-www-browser

# Replace placeholder with actual chosen browser.
sudo sed -i "s#__BROWSER_BIN__#$BROWSER_BIN#g" /usr/local/bin/www-browser /usr/local/bin/x-www-browser /usr/local/bin/gnome-www-browser

# Best-effort: register with update-alternatives if present.
if command -v update-alternatives >/dev/null 2>&1; then
  sudo update-alternatives --install /usr/bin/www-browser www-browser /usr/local/bin/www-browser 200 || true
  sudo update-alternatives --install /usr/bin/x-www-browser x-www-browser /usr/local/bin/x-www-browser 200 || true
  sudo update-alternatives --set www-browser /usr/local/bin/www-browser || true
  sudo update-alternatives --set x-www-browser /usr/local/bin/x-www-browser || true
fi

command -v www-browser || true
command -v x-www-browser || true
`;

const ensureTarballFirefoxDesktopFileCmd = `
set -euo pipefail

if [ -x /usr/local/bin/firefox ]; then
  sudo install -d -m 755 /usr/local/share/applications
  sudo tee /usr/local/share/applications/firefox-tarball.desktop >/dev/null <<'EOF'
[Desktop Entry]
Type=Application
Version=1.0
Name=Firefox
Exec=/usr/local/bin/www-browser %u
Icon=firefox
Terminal=false
Categories=Network;WebBrowser;
MimeType=text/html;x-scheme-handler/http;x-scheme-handler/https;
EOF
  sudo chmod 644 /usr/local/share/applications/firefox-tarball.desktop
fi
`;

const ensureXfceHelpersForBrowserCmd = `
set -euo pipefail

# exo-open uses this file to resolve "WebBrowser"
sudo install -d -m 755 -o ubuntu -g ubuntu /home/ubuntu/.config/xfce4
printf 'WebBrowser=www-browser\\nWebBrowserParam=%%s\\n' | sudo tee /home/ubuntu/.config/xfce4/helpers.rc >/dev/null
sudo chown ubuntu:ubuntu /home/ubuntu/.config/xfce4/helpers.rc
sudo chmod 644 /home/ubuntu/.config/xfce4/helpers.rc
`;

const ensureXdgDefaultBrowserCmd = `
set -euo pipefail

if command -v xdg-settings >/dev/null 2>&1; then
  # Prefer tarball firefox desktop entry if present (more reliable in XRDP sessions).
  if [ -f /usr/local/share/applications/firefox-tarball.desktop ]; then
    sudo -u ubuntu xdg-settings set default-web-browser firefox-tarball.desktop || true
    sudo -u ubuntu xdg-mime default firefox-tarball.desktop x-scheme-handler/http || true
    sudo -u ubuntu xdg-mime default firefox-tarball.desktop x-scheme-handler/https || true
    sudo -u ubuntu xdg-mime default firefox-tarball.desktop text/html || true
  elif [ -f /var/lib/snapd/desktop/applications/firefox_firefox.desktop ]; then
    sudo -u ubuntu xdg-settings set default-web-browser firefox_firefox.desktop || true
    sudo -u ubuntu xdg-mime default firefox_firefox.desktop x-scheme-handler/http || true
    sudo -u ubuntu xdg-mime default firefox_firefox.desktop x-scheme-handler/https || true
    sudo -u ubuntu xdg-mime default firefox_firefox.desktop text/html || true
  fi
fi
`;

const ensureUbuntuConfigOwnershipCmd = `
set -euo pipefail

# Some environments can end up with /home/ubuntu/.config owned by root, which breaks xdg-mime/xdg-settings.
sudo install -d -m 750 -o ubuntu -g ubuntu /home/ubuntu/.config
sudo chown -R ubuntu:ubuntu /home/ubuntu/.config
`;

export const runEnableBrowsersForUbuntu = async (
  options: RunEnableBrowsersForUbuntuOptions
): Promise<void> => {
  const log = options.log ?? createToolingLogger();
  const filter = options.multipassNameFilter ? new RegExp(options.multipassNameFilter) : undefined;

  const { data: vms } = await findVm('multipass');
  const targets = filter ? vms.filter((n) => filter.test(n)) : vms;

  if (targets.length === 0) {
    log.warning(`No multipass VMs found${filter ? ` matching [${filter}]` : ''}.`);
    return;
  }

  log.info(`Making browsers available for ubuntu user on ${targets.length} multipass VM(s)`);

  await log.indent(4, async () => {
    for (const vmName of targets) {
      log.info(`VM: ${vmName}`);
      await log.indent(2, async () => {
        const vm = createMultipassHostVmClient(vmName, log);
        // `vm.exec()` already runs via `bash -lc` inside the VM. Pass scripts directly (no nested shells),
        // otherwise heredocs/quotes can break.
        await vm.exec(ensureSnapPathScript);
        await vm.exec(installFirefoxTarballCmd);
        await vm.exec(ensureTarballFirefoxDesktopFileCmd);
        // Install a deb-based browser fallback (snap desktop integration can be flaky in some VM/RDP setups).
        await vm.exec(
          'sudo apt-get update -y -o Acquire::IndexTargets::deb::CNF::DefaultEnabled=false && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y epiphany-browser -o Acquire::IndexTargets::deb::CNF::DefaultEnabled=false',
          { silent: true }
        );
        await vm.exec(ensureDefaultBrowserCommandsScript);
        await vm.exec(ensureUbuntuConfigOwnershipCmd);
        await vm.exec(ensureXfceHelpersForBrowserCmd);
        await vm.exec(ensureXdgDefaultBrowserCmd, { silent: true });
        await vm.exec(createDesktopLaunchersScript);
      });
    }
  });
};


