/// <reference path="./types/index.d.ts" />

// 扩展用户信息类型
interface ExtendedUserInfo extends WechatMiniprogram.UserInfo {
  phone?: string;
  is_new_user?: boolean;
  token?: string;
  id?: number;
  username?: string;
}

interface IAppOption {
  globalData: {
    userInfo?: ExtendedUserInfo,
    token?: string,
    isLoggedIn?: boolean
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
  checkLoginStatus(): Promise<void>
}

// Add this to extend the App interface
declare namespace WechatMiniprogram {
  interface App {
    checkLoginStatus(): void;
  }
}