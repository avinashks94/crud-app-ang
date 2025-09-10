import {
  Component,
  computed,
  signal,
  Inject,
  PLATFORM_ID,
  Injectable,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}
export interface UselessFinding {
  path: string;
  reason: string;
  severity: 'info' | 'warn' | 'error';
}
interface RepoLangResult {
  bytes: LangMap;
  totalBytes: number;
  percents: Record<string, number>;
}

type LangMap = Record<string, number>;
type RepoType = 'public' | 'private';
@Injectable({ providedIn: 'root' })
@Component({
  selector: 'app-language-detector',
  templateUrl: './language-detector.component.html',
  styleUrl: './language-detector.component.css',
})
export class LanguageDetectorComponent {
  // Form state
  repoType = signal<RepoType>('public');
  repoUrl = signal('');
  token = signal(''); // only for private

  // Results/state
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);

  repoMeta = signal<{ owner: string; repo: string } | null>(null);
  result = signal<RepoLangResult | null>(null);

  auditFindings: UselessFinding[] = [];
  treeTruncated = false;

  // Display order and colors
  preferredOrder = ['HTML', 'CSS', 'TypeScript', 'JavaScript', 'PHP'];
  color = (lang: string) =>
    ({
      html: '#fb923c',
      css: '#38bdf8',
      typescript: '#60a5fa',
      javascript: '#facc15',
      php: '#a78bfa',
      scss: '#f472b6',
      less: '#34d399',
      python: '#22c55e',
      java: '#ef4444',
      csharp: '#10b981',
      go: '#14b8a6',
      ruby: '#f43f5e',
      rust: '#d97706',
      shell: '#94a3b8',
      kotlin: '#8b5cf6',
      dart: '#0ea5e9',
      vue: '#41b883',
      angular: '#dd0031',
      svelte: '#ff3e00',
      markdown: '#a1a1aa',
    }[lang.toLowerCase()] ?? '#9ca3af');

  orderedLangs = computed(() => {
    const r = this.result();
    if (!r) return [];
    const langs = Object.keys(r.percents);
    const preferred = this.preferredOrder.filter((l) => langs.includes(l));
    const remaining = langs
      .filter((l) => !this.preferredOrder.includes(l))
      .sort((a, b) => r.percents[b] - r.percents[a]);
    return [...preferred, ...remaining];
  });

  isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId); // SSR safety [1]
  }

  setRepoType(type: RepoType) {
    this.repoType.set(type);
    this.errorMsg.set(null);
    this.infoMsg.set(null);
  }

  async analyze() {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    this.result.set(null);
    this.auditFindings = [];
    this.treeTruncated = false;

    const input = this.repoUrl().trim();
    const parsed = this.parseRepoUrl(input);
    if (!parsed) {
      this.errorMsg.set(
        'Enter a GitHub URL like https://github.com/owner/repo or owner/repo'
      );
      return;
    }
    if (this.repoType() === 'private' && !this.token().trim()) {
      this.errorMsg.set('Token required for private repos (read access).');
      return;
    }
    this.repoMeta.set(parsed);

    const langsEndpoint = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`;
    let headers = new HttpHeaders({ Accept: 'application/vnd.github+json' });
    const token = this.repoType() === 'private' ? this.token().trim() : '';
    if (token) headers = headers.set('Authorization', `Bearer ${token}`); // token header for private [1]

    try {
      this.loading.set(true);
      // 1) Languages (Linguist bytes)
      const resp = (await firstValueFrom(
        this.http.get<LangMap>(langsEndpoint, { observe: 'response', headers })
      )) as HttpResponse<LangMap>;
      if (!resp?.body) throw new Error('No language data returned');
      const data = resp.body;
      const total = Object.values(data).reduce((a, b) => a + b, 0);
      const percents: Record<string, number> = {};
      for (const [k, v] of Object.entries(data))
        percents[k] = total ? +((v / total) * 100).toFixed(2) : 0;
      this.result.set({ bytes: data, totalBytes: total, percents });
      this.result.set({ bytes: data, totalBytes: total, percents });

      // 2) Default branch for full tree
      const defaultBranch = await this.getDefaultBranch(
        parsed.owner,
        parsed.repo,
        token
      );
      // 3) List tree recursively and audit
      const { blobs, truncated } = await this.listAllFiles(
        parsed.owner,
        parsed.repo,
        defaultBranch,
        token
      );
      this.treeTruncated = truncated;
      this.auditFindings = this.audit(blobs);

      if (this.repoType() === 'private') {
        this.infoMsg.set('Authenticated: private repository access confirmed.');
      }
      if (this.treeTruncated) {
        this.infoMsg.set(
          'Tree response truncated by GitHub; useless-files list may be partial.'
        );
      }
    } catch (e: any) {
      const status = e?.status;
      if (status === 401)
        this.errorMsg.set('Unauthorized. Check token and scopes.');
      else if (status === 403)
        this.errorMsg.set(
          'Forbidden or rate limited. Ensure token has read access and try later.'
        );
      else if (status === 404)
        this.errorMsg.set('Repository not found or no access.');
      else this.errorMsg.set(e?.message || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }

  private parseRepoUrl(input: string): { owner: string; repo: string } | null {
    const simple = input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (simple)
      return { owner: simple[5], repo: simple[6].replace(/\.git$/, '') };
    try {
      const u = new URL(input);
      if (!/github\.com$/i.test(u.hostname)) return null;
      const parts = u.pathname.replace(/^\/+/, '').split('/');
      if (parts.length < 2) return null;
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    } catch {
      return null;
    }
  }

  // ===== GitHub metadata and trees =====

  private async getDefaultBranch(
    owner: string,
    repo: string,
    token?: string
  ): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    let headers = new HttpHeaders({ Accept: 'application/vnd.github+json' });
    const meta = await firstValueFrom(this.http.get<any>(url, { headers }));
    return meta?.default_branch || 'HEAD'; // use default_branch per repo metadata [1]
    return meta?.default_branch || 'HEAD'; // use default_branch per repo metadata [1]
  }

  private async listAllFiles(
    owner: string,
    repo: string,
    ref: string,
    token?: string
  ): Promise<{ blobs: TreeEntry[]; truncated: boolean }> {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
      ref
    )}?recursive=1`;
    let headers = new HttpHeaders({ Accept: 'application/vnd.github+json' });
    const resp = await firstValueFrom(this.http.get<any>(url, { headers }));
    const tree: TreeEntry[] = Array.isArray(resp?.tree) ? resp.tree : [];
    const blobs = tree.filter((e) => e.type === 'blob');
    const truncated = !!resp?.truncated; // Git Trees cap; warn if true [2]
    return { blobs, truncated };
    return { blobs, truncated };
  }

  // ===== Heuristic audit aligned with .gitignore guidance =====

  private audit(blobs: TreeEntry[]): UselessFinding[] {
    const findings: UselessFinding[] = [];

    const rules: Array<{
      rx: RegExp;
      reason: string;
      severity: 'info' | 'warn' | 'error';
    }> = [
      {
        rx: /^(dist|build|coverage|\.next|\.angular|\.cache|target|\.turbo|\.vite|\.parcel-cache)(\/|$)/i,
        reason: 'Build/coverage artifact committed',
        severity: 'warn',
      },
      {
        rx: /^node_modules(\/|$)/i,
        reason: 'Dependencies folder committed',
        severity: 'error',
      },
      {
        rx: /^(\.idea|\.vscode)(\/|$)/i,
        reason: 'IDE settings committed',
        severity: 'info',
      },
      {
        rx: /(^|\/)\.DS_Store$/i,
        reason: 'macOS metadata committed',
        severity: 'info',
      },
      {
        rx: /(^|\/)Thumbs\.db$/i,
        reason: 'Windows thumbnail cache committed',
        severity: 'info',
      },
      { rx: /(^|\/).+\.log$/i, reason: 'Log file committed', severity: 'warn' },
      {
        rx: /(^|\/).+\.tmp$/i,
        reason: 'Temp file committed',
        severity: 'info',
      },
      {
        rx: /(^|\/)\.env(\..+)?$/i,
        reason: 'Environment file committed (secrets risk)',
        severity: 'error',
      },
      {
        rx: /(^|\/)secrets?\.(json|ya?ml)$/i,
        reason: 'Secrets file committed',
        severity: 'error',
      },
      {
        rx: /(^|\/).+\.(zip|rar|7z|tar|gz|mp4|mov|avi|psd|ai|sketch|exe|dll|iso)$/i,
        reason: 'Binary/archive checked in',
        severity: 'warn',
      },
      {
        rx: /(^|\/).+\.(swp|swo)$/i,
        reason: 'Editor swap file committed',
        severity: 'info',
      },
      {
        rx: /(^|\/)lcov\.info$/i,
        reason: 'Coverage report committed',
        severity: 'info',
      },
    ];

    for (const b of blobs) {
      const p = b.path;
      for (const r of rules) {
        if (r.rx.test(p)) {
          findings.push({ path: p, reason: r.reason, severity: r.severity });
          break;
        }
      }
      if ((b.size ?? 0) > 5 * 1024 * 1024) {
        findings.push({
          path: p,
          reason: 'Large file (>5MB) committed',
          severity: 'warn',
        });
      }
    }

    // Deduplicate and keep highest severity
    const rank = { info: 0, warn: 1, error: 2 } as const;
    const best = new Map<string, UselessFinding>();
    for (const f of findings) {
      const prev = best.get(f.path);
      if (!prev || rank[f.severity] > rank[prev.severity]) best.set(f.path, f);
    }
    return Array.from(best.values());
  }

  // ===== Utils =====

  prettyBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }
}
