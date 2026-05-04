export const PROFILE_QUERY = /* GraphQL */ `
  query Profile($login: String!) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl
      company
      location
      websiteUrl
      twitterUsername
      createdAt
      followers { totalCount }
      following { totalCount }
      repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
    rateLimit { remaining resetAt }
  }
`;

export const PR_PAGE_QUERY = /* GraphQL */ `
  query PRPage($login: String!, $cursor: String) {
    user(login: $login) {
      pullRequests(
        first: 50
        after: $cursor
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          body
          state
          isDraft
          createdAt
          mergedAt
          closedAt
          url
          additions
          deletions
          changedFiles
          repository {
            nameWithOwner
            stargazerCount
            primaryLanguage { name }
            owner { login }
          }
          comments(first: 30) {
            nodes {
              body
              createdAt
              author { login avatarUrl }
            }
          }
          reviews(first: 20) {
            nodes {
              state
              body
              createdAt
              author { login }
              comments(first: 20) {
                nodes {
                  body
                  path
                  line
                  diffHunk
                  createdAt
                  author { login }
                }
              }
            }
          }
        }
      }
    }
    rateLimit { remaining resetAt }
  }
`;

export const ISSUE_PAGE_QUERY = /* GraphQL */ `
  query IssuePage($login: String!, $cursor: String) {
    user(login: $login) {
      issues(
        first: 50
        after: $cursor
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          body
          state
          createdAt
          closedAt
          url
          repository {
            nameWithOwner
            stargazerCount
            primaryLanguage { name }
            owner { login }
          }
          labels(first: 10) { nodes { name color } }
          comments(first: 30) {
            nodes {
              body
              createdAt
              author { login avatarUrl }
            }
          }
        }
      }
    }
    rateLimit { remaining resetAt }
  }
`;

export const CONTRIBUTED_REPOS_QUERY = /* GraphQL */ `
  query ContributedRepos($login: String!, $cursor: String) {
    user(login: $login) {
      repositoriesContributedTo(
        first: 50
        after: $cursor
        includeUserRepositories: false
        contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, PULL_REQUEST_REVIEW]
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          nameWithOwner
          stargazerCount
          description
          url
          primaryLanguage { name }
          owner { login }
        }
      }
    }
    rateLimit { remaining resetAt }
  }
`;
