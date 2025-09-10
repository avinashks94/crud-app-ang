import {
  Component,
  computed,
  signal,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

interface RepoLangResult {
  bytes: LangMap;
  totalBytes: number;
  percents: Record<string, number>;
}

type LangMap = Record<string, number>;
type RepoType = 'public' | 'private';

@Component({
  selector: 'app-language-detector',
  templateUrl: './language-detector.component.html',
  styleUrl: './language-detector.component.css',
})
export class LanguageDetectorComponent {
  // title = 'GitHub Repo Language Breakdown';

  // // Inputs/state
  // repoUrl = signal('');
  // loading = signal(false);
  // errorMsg = signal<string | null>(null);
  // result = signal<RepoLangResult | null>(null);
  // repoMeta = signal<{ owner: string; repo: string } | null>(null);

  // // Dark mode handling
  // dark = signal<boolean>(false);

  // constructor() {
  //   // Initialize from system preference, then override from localStorage if set
  //   const prefersDark =
  //     window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  //   const saved = localStorage.getItem('dark');
  //   this.dark.set(saved ? saved === '1' : prefersDark);
  //   effect(() => {
  //     document.documentElement.classList.toggle('dark', this.dark());
  //     localStorage.setItem('dark', this.dark() ? '1' : '0');
  //   });
  // }

  // toggleDark() {
  //   this.dark.set(!this.dark());
  // }

  // // Color palette for bars
  // color = (lang: string) =>
  //   ({
  //     html: '#fb923c',
  //     css: '#38bdf8',
  //     typescript: '#60a5fa',
  //     javascript: '#facc15',
  //     php: '#a78bfa',
  //     scss: '#f472b6',
  //     less: '#34d399',
  //     python: '#22c55e',
  //     java: '#ef4444',
  //     csharp: '#10b981',
  //     go: '#14b8a6',
  //     ruby: '#f43f5e',
  //     rust: '#d97706',
  //     shell: '#94a3b8',
  //     kotlin: '#8b5cf6',
  //     dart: '#0ea5e9',
  //     vue: '#41b883',
  //     angular: '#dd0031',
  //     svelte: '#ff3e00',
  //     markdown: '#a1a1aa',
  //   }[lang.toLowerCase()] ?? '#9ca3af');

  // preferredOrder = ['HTML', 'CSS', 'TypeScript', 'JavaScript', 'PHP'];

  // orderedLangs = computed(() => {
  //   const r = this.result();
  //   if (!r) return [];
  //   const langs = Object.keys(r.percents);
  //   const preferred = this.preferredOrder.filter((l) => langs.includes(l));
  //   const remaining = langs
  //     .filter((l) => !this.preferredOrder.includes(l))
  //     .sort((a, b) => r.percents[b] - r.percents[a]);
  //   return [...preferred, ...remaining];
  // });

  // async fetchLanguages() {
  //   this.errorMsg.set(null);
  //   this.result.set(null);

  //   const parsed = this.parseRepoUrl(this.repoUrl().trim());
  //   if (!parsed) {
  //     this.errorMsg.set(
  //       'Enter a GitHub URL like https://github.com/owner/repo or owner/repo'
  //     );
  //     return;
  //   }
  //   this.repoMeta.set(parsed);

  //   const endpoint = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`;
  //   try {
  //     this.loading.set(true);
  //     const res = await fetch(endpoint, {
  //       headers: { Accept: 'application/vnd.github+json' },
  //     });
  //     if (!res.ok) {
  //       const detail = await res.text().catch(() => '');
  //       throw new Error(`GitHub API error ${res.status}: ${detail}`);
  //     }
  //     const data = (await res.json()) as LangMap;
  //     const total = Object.values(data).reduce((a, b) => a + b, 0);
  //     const percents: Record<string, number> = {};
  //     for (const [k, v] of Object.entries(data))
  //       percents[k] = total ? +((v / total) * 100).toFixed(2) : 0;
  //     this.result.set({ bytes: data, totalBytes: total, percents });
  //   } catch (e: any) {
  //     this.errorMsg.set(e?.message || 'Failed to fetch languages');
  //   } finally {
  //     this.loading.set(false);
  //   }
  // }

  // private parseRepoUrl(input: string): { owner: string; repo: string } | null {
  //   const simple = input.match(/^([\w.-]+)\/([\w.-]+)$/);
  //   if (simple)
  //     return { owner: simple[21], repo: simple[22].replace(/\.git$/, '') };
  //   try {
  //     const u = new URL(input);
  //     if (!/github\.com$/i.test(u.hostname)) return null;
  //     const parts = u.pathname.replace(/^\/+/, '').split('/');
  //     if (parts.length < 2) return null;
  //     return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  //   } catch {
  //     return null;
  //   }
  // }

  // prettyBytes(n: number): string {
  //   if (n < 1024) return `${n} B`;
  //   const kb = n / 1024;
  //   if (kb < 1024) return `${kb.toFixed(1)} KB`;
  //   const mb = kb / 1024;
  //   if (mb < 1024) return `${mb.toFixed(2)} MB`;
  //   const gb = mb / 1024;
  //   return `${gb.toFixed(2)} GB`;
  // }

  // Form state
  repoType = signal<RepoType>('public');
  repoUrl = signal('');
  token = signal(''); // used only for private

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  result = signal<RepoLangResult | null>(null);
  repoMeta = signal<{ owner: string; repo: string } | null>(null);
  isBrowser: boolean;

  // Display order
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

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId); // guard window/localStorage if needed [21]
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

    const input = this.repoUrl().trim();
    const parsed = this.parseRepoUrl(input);
    if (!parsed) {
      this.errorMsg.set(
        'Enter a GitHub URL like https://github.com/owner/repo or owner/repo'
      );
      return;
    }
    if (this.repoType() === 'private' && !this.token().trim()) {
      this.errorMsg.set(
        'Token required for private repos. Create a fine-grained PAT with read access to the repo.'
      );
      return;
    }
    this.repoMeta.set(parsed);

    const endpoint = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`;
    let headers = new HttpHeaders({ Accept: 'application/vnd.github+json' });

    // Use Authorization header only for private or when token provided
    const token = this.token().trim();
    if (this.repoType() === 'private') {
      headers = headers.set('Authorization', `Bearer ${token}`); // token in header, not query [5]
    }

    try {
      this.loading.set(true);
      const resp = (await this.http
        .get<LangMap>(endpoint, { observe: 'response', headers })
        .toPromise()) as HttpResponse<LangMap>;
      if (resp.status === 200 && resp.body) {
        const data = resp.body;
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        const percents: Record<string, number> = {};
        for (const [k, v] of Object.entries(data))
          percents[k] = total ? +((v / total) * 100).toFixed(2) : 0;
        this.result.set({ bytes: data, totalBytes: total, percents });
        if (this.repoType() === 'private') {
          this.infoMsg.set(
            'Authenticated: read access to private repository confirmed.'
          );
        }
      } else {
        throw new Error(`Unexpected response ${resp.status}`);
      }
    } catch (e: any) {
      // common cases: 404 (bad link or no access), 401 (bad token), 403 (rate limit or no scope)
      const status = e?.status;
      if (status === 401)
        this.errorMsg.set('Unauthorized. Check token value and scopes.');
      else if (status === 403)
        this.errorMsg.set(
          'Forbidden or rate limited. Ensure token has repo read access and try later.'
        );
      else if (status === 404)
        this.errorMsg.set('Not found or no access to the repository.');
      else this.errorMsg.set(e?.message || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }

  private parseRepoUrl(input: string): { owner: string; repo: string } | null {
    const simple = input.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (simple)
      return { owner: simple[22], repo: simple[23].replace(/\.git$/, '') };
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
