import { UpdateInfo } from '../types';
import { isTauriEnvironment } from './compilerService';

const REPO_OWNER = 'vincenzomy03';
const REPO_NAME = 'Tex-Notes';
const CURRENT_VERSION = '1.0.4';

export async function checkGitHubUpdates(): Promise<UpdateInfo> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // No release published yet
        return {
          checked: true,
          available: false,
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
        };
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    const latestTag = (data.tag_name || '').replace(/^v/, '');
    const releaseUrl = data.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;
    const releaseNotes = data.body || '';

    // Look for Windows setup installer in release assets
    const setupAsset = (data.assets || []).find(
      (a: any) =>
        (a.name && a.name.endsWith('-setup.exe')) ||
        (a.name && a.name.endsWith('.exe') && !a.name.includes('portable'))
    );

    const installerDownloadUrl = setupAsset ? setupAsset.browser_download_url : undefined;
    const installerFileName = setupAsset ? setupAsset.name : undefined;

    const isNewer = compareVersions(latestTag, CURRENT_VERSION) > 0;

    return {
      checked: true,
      available: isNewer,
      currentVersion: CURRENT_VERSION,
      latestVersion: latestTag || CURRENT_VERSION,
      releaseUrl,
      releaseNotes,
      installerDownloadUrl,
      installerFileName,
    };
  } catch (err) {
    console.info('Could not reach GitHub Releases API (offline or rate-limited):', err);
    return {
      checked: true,
      available: false,
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION,
    };
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.warn('Failed to open external url via Tauri command:', err);
    }
  }
  window.open(url, '_blank');
}

export async function downloadAndInstallUpdate(downloadUrl: string): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('download_and_install_update', { downloadUrl });
  } else {
    window.open(downloadUrl, '_blank');
  }
}

// Semver comparison helper
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
