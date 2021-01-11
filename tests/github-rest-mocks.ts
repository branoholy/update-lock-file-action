import { RestEndpointMethodTypes } from '@octokit/rest';

export type GitHubRestParameters<
  NamespaceT extends keyof RestEndpointMethodTypes,
  MethodT extends keyof RestEndpointMethodTypes[NamespaceT]
> =
  // @ts-ignore Type '"parameters"' cannot be used to index type 'RestEndpointMethodTypes[NamespaceT][MethodT]'.
  RestEndpointMethodTypes[NamespaceT][MethodT]['parameters'];

export type GitHubRestResponseData<
  NamespaceT extends keyof RestEndpointMethodTypes,
  MethodT extends keyof RestEndpointMethodTypes[NamespaceT]
> =
  // @ts-ignore Type '"response"' cannot be used to index type 'RestEndpointMethodTypes[NamespaceT][MethodT]'.
  // @ts-ignore Type '"data"' cannot be used to index type 'RestEndpointMethodTypes[NamespaceT][MethodT]["response"]'.
  RestEndpointMethodTypes[NamespaceT][MethodT]['response']['data'];

export type GitHubRestMocks = {
  readonly any: jest.Mock;
  readonly git: {
    readonly [MethodT in
      | 'createBlob'
      | 'getCommit'
      | 'createCommit'
      | 'getRef'
      | 'createRef'
      | 'updateRef'
      | 'deleteRef'
      | 'createTree']: jest.Mock<
      [number, GitHubRestResponseData<'git', MethodT>?],
      [string, GitHubRestParameters<'git', MethodT>]
    >;
  };
  readonly issues: {
    readonly [MethodT in 'update']: jest.Mock<
      [number, GitHubRestResponseData<'issues', MethodT>?],
      [string, GitHubRestParameters<'issues', MethodT>]
    >;
  };
  readonly pulls: {
    readonly [MethodT in 'create' | 'requestReviewers']: jest.Mock<
      [number, GitHubRestResponseData<'pulls', MethodT>?],
      [string, GitHubRestParameters<'pulls', MethodT>]
    >;
  };
  readonly repos: {
    readonly [MethodT in 'getBranch']: jest.Mock<
      [number, GitHubRestResponseData<'repos', MethodT>?],
      [string, GitHubRestParameters<'repos', MethodT>]
    >;
  };
};

export const createGitHubRestMock = <
  NamespaceT extends keyof RestEndpointMethodTypes,
  MethodT extends keyof RestEndpointMethodTypes[NamespaceT]
>() =>
  jest.fn<
    [number, GitHubRestResponseData<NamespaceT, MethodT>?],
    [string, GitHubRestParameters<NamespaceT, MethodT>]
  >();
