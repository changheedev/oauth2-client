import OAuthConfig from './config';
import { Context } from 'koa';
import axios from 'axios';
import * as qs from 'querystring';
import SocialUserInfo from './userinfo/default';
import UserInfoFactory from './userinfo/factory';

export type OAuthProvider = 'google' | 'naver' | 'kakao' | 'github';

export type OAuthTokenResponse = {
  tokenType: string;
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
  scope?: string;
};

export default class OAuthClient {
  private config;

  private provider;

  constructor(provider: OAuthProvider) {
    this.provider = provider;
    this.config = OAuthConfig[provider];
  }

  public redirectToAuthorizaionPage(ctx: Context, state: string): void {
    const { authorizationUri, clientId, callbackUri, scope } = this.config;
    const params = new URLSearchParams();
    params.set('client_id', clientId);
    params.set('response_type', 'code');
    params.set('redirect_uri', callbackUri);
    params.set('state', state);
    params.set('scope', scope);
    if (this.provider === 'google') {
      params.set('access_type', 'offline');
    }
    ctx.redirect(`${authorizationUri}?${params.toString()}`);
  }

  public async getAccessToken(
    code: string,
    state: string,
  ): Promise<OAuthTokenResponse> {
    const { tokenUri, callbackUri, clientId, clientSecret } = this.config;
    const queryParams = {
      grant_type: 'authorization_code',
      code,
      state,
      redirect_uri: callbackUri,
      client_id: clientId,
      client_secret: clientSecret,
    };
    const query = qs.stringify(queryParams);
    const header = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        charset: 'utf-8',
      },
    };

    const { data } = await axios.post(tokenUri, query, header);
    const tokenResponse = {
      tokenType: data.token_type,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      refreshTokenExpiresIn: data.refresh_token_expires_in,
      scope: data.scope,
    };
    return tokenResponse;
  }

  public async getUserInfo(accessToken: string): Promise<SocialUserInfo> {
    const { userInfoUri } = this.config;
    const { data } = await axios.get(userInfoUri, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const userInfo = UserInfoFactory.parseUserInfo(this.provider, data);
    return userInfo;
  }
}
