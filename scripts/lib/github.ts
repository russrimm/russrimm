export interface LanguageEdge {
  size: number;
  node: { name: string; color: string | null };
}

export interface RepoData {
  name: string;
  description: string | null;
  homepageUrl: string | null;
  stargazerCount: number;
  forkCount: number;
  pushedAt: string;
  isArchived: boolean;
  primaryLanguage: { name: string; color: string | null } | null;
  latestRelease: { tagName: string } | null;
  languages: { edges: LanguageEdge[] };
}

export interface GitHubData {
  createdAt: string;
  followers: number;
  publicRepos: number;
  repos: RepoData[];
  /** Daily contribution counts for the last year, oldest first. */
  days: { date: string; count: number }[];
  totalCommits: number;
}

const REPO_FIELDS = `
  name description homepageUrl stargazerCount forkCount pushedAt isArchived
  primaryLanguage { name color }
  latestRelease { tagName }
  languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
`;

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "russrimm-profile" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  if (!json.data) throw new Error("GitHub GraphQL returned no data");
  return json.data;
}

interface UserPage {
  user: {
    createdAt: string;
    followers: { totalCount: number };
    publicRepos: { totalCount: number };
    repositories: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RepoData[] };
    contributionsCollection: {
      totalCommitContributions: number;
      contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] };
    };
  };
}

/** Fetch live profile data. Returns null when no token is available or the API fails (build degrades to config only). */
export async function fetchGitHubData(owner: string, token: string | undefined): Promise<GitHubData | null> {
  if (!token) {
    console.warn("• GITHUB_TOKEN not set — building from config only (no live stats).");
    return null;
  }
  const query = `query($login: String!, $after: String) {
    user(login: $login) {
      createdAt
      followers { totalCount }
      publicRepos: repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
      repositories(first: 100, after: $after, privacy: PUBLIC, ownerAffiliations: OWNER, isFork: false,
                   orderBy: { field: PUSHED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes { ${REPO_FIELDS} }
      }
      contributionsCollection {
        totalCommitContributions
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }
    }
  }`;
  try {
    const repos: RepoData[] = [];
    let after: string | null = null;
    let first: UserPage["user"] | null = null;
    for (let page = 0; page < 10; page++) {
      const data: UserPage = await graphql<UserPage>(token, query, { login: owner, after });
      first ??= data.user;
      repos.push(...data.user.repositories.nodes);
      if (!data.user.repositories.pageInfo.hasNextPage) break;
      after = data.user.repositories.pageInfo.endCursor;
    }
    if (!first) return null;
    const days = first.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays)
      .map((d) => ({ date: d.date, count: d.contributionCount }));
    return {
      createdAt: first.createdAt,
      followers: first.followers.totalCount,
      publicRepos: first.publicRepos.totalCount,
      repos,
      days,
      totalCommits: first.contributionsCollection.totalCommitContributions,
    };
  } catch (err) {
    console.warn(`• GitHub API unavailable (${(err as Error).message}) — building from config only.`);
    return null;
  }
}
